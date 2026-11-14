"""Cargador de artefactos de modelos (XGBoost y ONNX, solo CPU).

Cada modelo vive en `<MODELS_DIR>/<nombre>/` con dos archivos:
    model.ubj o model.json (XGBoost)  |  model.onnx (ONNX)
    metrics.json  -> métrica, línea base y partición (lo escribe /models)

Un modelo solo sale como "trained" si tiene artefacto, tiene métrica y carga
bien. En cualquier otro caso entra su respaldo de AGENTS.md sección 5 y el
reporte lo dice (regla 6: un modelo sin métrica no llega al agricultor).

xgboost y onnxruntime se importan hasta que hay un artefacto que cargar: sin
artefactos la API arranca sin gastar esa memoria.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Literal

Status = Literal["trained", "fallback", "absent"]
RegionMode = Literal["labeled", "unlabeled"]


def _t(es: str, en: str) -> dict[str, str]:
    return {"es": es, "en": en}


@dataclass(frozen=True)
class ModelSpec:
    name: str
    kind: Literal["xgboost", "onnx"]
    algorithm: str
    metric_name: dict[str, str]
    metric_unit: str
    baseline_name: dict[str, str]
    native_scale: str
    fallback_note: dict[str, str]
    needs_labels: bool = False  # sin CDL ni OpenET no existe ni como respaldo

    @property
    def filenames(self) -> tuple[str, ...]:
        return ("model.onnx",) if self.kind == "onnx" else ("model.ubj", "model.json")


SPECS: tuple[ModelSpec, ...] = (
    ModelSpec(
        name="model_1_crop_water",
        kind="xgboost",
        algorithm="XGBoost",
        metric_name=_t(
            "Error medio en mm en un valle no visto", "Mean error in mm on an unseen valley"
        ),
        metric_unit="mm",
        baseline_name=_t("Tabla FAO-56", "FAO-56 table"),
        native_scale="30 m",
        fallback_note=_t(
            "Respaldo activo: el agua de cada cultivo sale de la tabla FAO-56, declarada.",
            "Fallback active: crop water use comes from the declared FAO-56 table.",
        ),
    ),
    ModelSpec(
        name="model_2_prior_crop_effect",
        kind="xgboost",
        algorithm="XGBoost",
        metric_name=_t(
            "Mejora frente al mismo modelo sin el cultivo anterior",
            "Improvement over the same model without the prior crop",
        ),
        metric_unit="%",
        baseline_name=_t("Modelo sin el cultivo anterior", "Model without the prior crop"),
        native_scale="30 m",
        fallback_note=_t(
            "Sin evidencia local sobre el efecto del cultivo anterior.",
            "No local evidence on the effect of the prior crop.",
        ),
        needs_labels=True,
    ),
    ModelSpec(
        name="model_3_crop_history_gru",
        kind="onnx",
        algorithm="GRU pequeña con atención temporal (ONNX)",
        metric_name=_t("F1 por clase en un valle no visto", "Per-class F1 on an unseen valley"),
        metric_unit="F1",
        baseline_name=_t("Historial declarado por el agricultor", "Grower-declared crop history"),
        native_scale="30 m",
        fallback_note=_t(
            "Respaldo activo: el agricultor declara su historial de cultivos.",
            "Fallback active: the grower declares the crop history.",
        ),
    ),
    ModelSpec(
        name="model_4_moisture_cqr",
        kind="xgboost",
        algorithm="Balance FAO-56 + residual con árboles + intervalo conformal (CQR) al 90 %",
        metric_name=_t(
            "Cobertura real del intervalo al 90 %", "Empirical coverage of the 90% interval"
        ),
        metric_unit="%",
        baseline_name=_t("Balance FAO-56 sin residual", "FAO-56 balance without residual"),
        native_scale="9 km (contexto regional)",
        fallback_note=_t(
            "Respaldo activo: balance FAO-56 sin intervalo, con el rango histórico.",
            "Fallback active: FAO-56 balance without interval, with the historical range.",
        ),
    ),
)
SPEC_BY_NAME = {spec.name: spec for spec in SPECS}


@dataclass
class LoadedModel:
    spec: ModelSpec
    status: Status
    reason: str  # por qué quedó en este estado, para /health y los registros
    metrics: dict[str, Any] | None = None
    predictor: Callable[[Any], Any] | None = None

    def predict(self, features: Any) -> Any:
        if self.predictor is None:
            raise RuntimeError(f"{self.spec.name} está en respaldo: {self.reason}")
        return self.predictor(features)


def _load_xgboost(path: Path) -> Callable[[Any], Any]:
    import xgboost  # noqa: PLC0415  (carga diferida)

    booster = xgboost.Booster()
    booster.load_model(str(path))
    return booster.inplace_predict


def _load_onnx(path: Path) -> Callable[[Any], Any]:
    import onnxruntime  # noqa: PLC0415  (carga diferida)

    session = onnxruntime.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    return lambda features: session.run(None, {input_name: features})


_METRIC_KEYS = {"value", "unit", "type", "source", "date", "native_scale"}


def _read_metrics(path: Path) -> dict[str, Any] | None:
    """metrics.json válido: métrica y línea base con ficha completa y valor medido."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    for key in ("metric", "baseline_metric"):
        card = data.get(key) if isinstance(data, dict) else None
        if not isinstance(card, dict) or not card.keys() >= _METRIC_KEYS:
            return None
    if not isinstance(data["metric"]["value"], int | float):
        return None
    # Una corrida de prueba con datos sintéticos no es una métrica medida.
    if data.get("sample_run") or data["metric"]["type"] not in ("modeled", "observed"):
        return None
    return data


class ModelRegistry:
    def __init__(self, models_dir: Path) -> None:
        self.models_dir = models_dir
        self._models: dict[str, LoadedModel] | None = None

    @property
    def models(self) -> dict[str, LoadedModel]:
        if self._models is None:
            self._models = {spec.name: self._load(spec) for spec in SPECS}
        return self._models

    def get(self, name: str) -> LoadedModel:
        return self.models[name]

    def _load(self, spec: ModelSpec) -> LoadedModel:
        folder = self.models_dir / spec.name
        artifact = next((folder / f for f in spec.filenames if (folder / f).is_file()), None)
        if artifact is None:
            return LoadedModel(spec, "fallback", "no hay artefacto")
        metrics = _read_metrics(folder / "metrics.json")
        if metrics is None:
            return LoadedModel(
                spec,
                "fallback",
                "hay artefacto pero falta un metrics.json con métrica medida "
                "(o es de una corrida de prueba)",
            )
        try:
            predictor = _load_onnx(artifact) if spec.kind == "onnx" else _load_xgboost(artifact)
        except Exception as exc:
            return LoadedModel(spec, "fallback", f"el artefacto no cargó: {type(exc).__name__}")
        return LoadedModel(spec, "trained", "artefacto y métrica presentes", metrics, predictor)

    def summary(self) -> dict[str, dict[str, str]]:
        return {
            name: {"status": model.status, "reason": model.reason}
            for name, model in self.models.items()
        }

    def report(self, region_mode: RegionMode) -> dict[str, dict[str, Any]]:
        """El campo `models` del contrato."""
        return {name: self._report(model, region_mode) for name, model in self.models.items()}

    def _report(self, model: LoadedModel, region_mode: RegionMode) -> dict[str, Any]:
        spec = model.spec
        unlabeled = region_mode == "unlabeled"
        card_path = f"models/{spec.name}/CARD.md"
        if model.status == "trained" and model.metrics is not None:
            note = _t(
                "Modelo entrenado y medido; ver su ficha.", "Model trained and measured; see card."
            )
            if unlabeled:
                note = _t(
                    "EXPERIMENTAL: entrenado solo en valles de EE. UU.; "
                    "aquí no hay etiquetas para medirlo.",
                    "EXPERIMENTAL: trained on US valleys only; "
                    "there are no local labels to measure it here.",
                )
            return {
                "status": "trained",
                "experimental": unlabeled,
                "algorithm": spec.algorithm,
                "partition_method": model.metrics.get(
                    "partition_method",
                    _t("Partición por valle; ver ficha.", "Split by valley; see card."),
                ),
                "metric_name": spec.metric_name,
                "metric": model.metrics["metric"],
                "baseline_name": spec.baseline_name,
                "baseline_metric": model.metrics["baseline_metric"],
                "active_mode_note": note,
                "card_path": card_path,
            }

        absent = spec.needs_labels and unlabeled
        today = date.today().strftime("%Y-%m")
        empty = {
            "value": None,
            "unit": spec.metric_unit,
            "type": "assumed",
            "source": f"Sin métrica: modelo no disponible ({model.reason})",
            "date": today,
            "native_scale": spec.native_scale,
        }
        return {
            "status": "absent" if absent else "fallback",
            "experimental": False,
            "algorithm": spec.algorithm,
            "partition_method": _t(
                "No aplica: modelo no disponible.", "Not applicable: model unavailable."
            ),
            "metric_name": spec.metric_name,
            "metric": empty,
            "baseline_name": spec.baseline_name,
            "baseline_metric": dict(empty),
            "active_mode_note": spec.fallback_note,
            "card_path": card_path,
        }
