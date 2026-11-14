"""Cargador de artefactos: sin artefacto o sin métrica entra el respaldo."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from app.models.loader import SPECS, ModelRegistry
from app.schemas.contract import Models

NAMES = [spec.name for spec in SPECS]
METRIC = {
    "value": 41.0,
    "unit": "mm",
    "type": "modeled",
    "source": "Validación en un valle no visto (prueba)",
    "date": "2026-11",
    "native_scale": "30 m",
}
METRICS_FILE = {"metric": METRIC, "baseline_metric": {**METRIC, "value": 58.0}}


def write_tiny_xgboost(folder: Path) -> None:
    """Un modelo de juguete (20 filas, 2 árboles) solo para probar la carga."""
    xgboost = pytest.importorskip("xgboost")
    rng = np.random.default_rng(0)
    features = rng.random((20, 3))
    booster = xgboost.train(
        {"max_depth": 2, "nthread": 1},
        xgboost.DMatrix(features, label=features.sum(axis=1)),
        num_boost_round=2,
    )
    folder.mkdir(parents=True)
    booster.save_model(str(folder / "model.ubj"))


def test_four_models_are_registered() -> None:
    assert NAMES == [
        "model_1_crop_water",
        "model_2_prior_crop_effect",
        "model_3_crop_history_gru",
        "model_4_moisture_cqr",
    ]


def test_without_artifacts_everything_falls_back(tmp_path: Path) -> None:
    registry = ModelRegistry(tmp_path)
    assert {m.status for m in registry.models.values()} == {"fallback"}
    report = registry.report("labeled")
    Models.model_validate(report)  # cumple el contrato
    for name in NAMES:
        assert report[name]["status"] == "fallback"
        assert report[name]["metric"]["value"] is None
        assert report[name]["card_path"] == f"models/{name}/CARD.md"
    assert "FAO-56" in report["model_1_crop_water"]["active_mode_note"]["es"]
    assert "Sin evidencia local" in report["model_2_prior_crop_effect"]["active_mode_note"]["es"]
    assert "declara su historial" in report["model_3_crop_history_gru"]["active_mode_note"]["es"]
    assert "sin intervalo" in report["model_4_moisture_cqr"]["active_mode_note"]["es"]


def test_unlabeled_region_marks_model_2_absent(tmp_path: Path) -> None:
    report = ModelRegistry(tmp_path).report("unlabeled")
    Models.model_validate(report)
    assert report["model_2_prior_crop_effect"]["status"] == "absent"
    assert report["model_1_crop_water"]["status"] == "fallback"


def test_fallback_model_refuses_to_predict(tmp_path: Path) -> None:
    with pytest.raises(RuntimeError, match="respaldo"):
        ModelRegistry(tmp_path).get("model_1_crop_water").predict(np.zeros((1, 3)))


def test_artifact_without_metrics_stays_in_fallback(tmp_path: Path) -> None:
    """Regla 6: un modelo sin métrica no llega al agricultor."""
    write_tiny_xgboost(tmp_path / "model_1_crop_water")
    model = ModelRegistry(tmp_path).get("model_1_crop_water")
    assert model.status == "fallback"
    assert "metrics.json" in model.reason


def test_metrics_without_measured_value_stay_in_fallback(tmp_path: Path) -> None:
    folder = tmp_path / "model_1_crop_water"
    write_tiny_xgboost(folder)
    unmeasured = {"metric": {**METRIC, "value": None}, "baseline_metric": METRIC}
    (folder / "metrics.json").write_text(json.dumps(unmeasured), encoding="utf-8")
    assert ModelRegistry(tmp_path).get("model_1_crop_water").status == "fallback"


@pytest.mark.parametrize(
    "tainted",
    [
        {**METRICS_FILE, "sample_run": True},
        {"metric": {**METRIC, "type": "fixture"}, "baseline_metric": METRIC},
    ],
)
def test_synthetic_smoke_run_metrics_never_count_as_trained(tmp_path: Path, tainted: dict) -> None:
    """Las pruebas de flujo de /models (--sample) no pueden llegar al agricultor."""
    folder = tmp_path / "model_1_crop_water"
    write_tiny_xgboost(folder)
    (folder / "metrics.json").write_text(json.dumps(tainted), encoding="utf-8")
    assert ModelRegistry(tmp_path).get("model_1_crop_water").status == "fallback"


def test_artifact_with_metrics_is_trained_and_predicts(tmp_path: Path) -> None:
    folder = tmp_path / "model_1_crop_water"
    write_tiny_xgboost(folder)
    (folder / "metrics.json").write_text(json.dumps(METRICS_FILE), encoding="utf-8")

    registry = ModelRegistry(tmp_path)
    model = registry.get("model_1_crop_water")
    assert model.status == "trained"
    prediction = model.predict(np.array([[0.1, 0.2, 0.3]]))
    assert prediction.shape == (1,)

    report = registry.report("labeled")
    Models.model_validate(report)
    assert report["model_1_crop_water"]["status"] == "trained"
    assert report["model_1_crop_water"]["metric"]["value"] == 41.0
    assert report["model_1_crop_water"]["baseline_metric"]["value"] == 58.0
    assert report["model_1_crop_water"]["experimental"] is False
    assert report["model_2_prior_crop_effect"]["status"] == "fallback"

    unlabeled = registry.report("unlabeled")
    assert unlabeled["model_1_crop_water"]["experimental"] is True


def test_corrupt_onnx_artifact_falls_back(tmp_path: Path) -> None:
    pytest.importorskip("onnxruntime")
    folder = tmp_path / "model_3_crop_history_gru"
    folder.mkdir(parents=True)
    (folder / "model.onnx").write_bytes(b"esto no es un modelo")
    (folder / "metrics.json").write_text(json.dumps(METRICS_FILE), encoding="utf-8")
    model = ModelRegistry(tmp_path).get("model_3_crop_history_gru")
    assert model.status == "fallback"
    assert "no cargó" in model.reason
