"""Tabla de /data-pipeline -> evaluación del contrato, con un .parquet sintético.

Los valores de estas tablas son de prueba: solo existen en tmp_path.
"""

from __future__ import annotations

import json
import struct
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from app.config import CONTRACT_DIR, Settings
from app.engine import water_balance as wb
from app.models.loader import ModelRegistry
from app.schemas.contract import Evaluation
from app.services import evaluation as evaluation_service
from app.services import table_to_contract as ttc

VALIDATOR = Draft202012Validator(
    json.loads((CONTRACT_DIR / "schema.json").read_text(encoding="utf-8"))
)
PARCEL = "dv-nv-01"
RING = [[-116.0345, 39.6835], [-116.0255, 39.6835], [-116.0255, 39.6765], [-116.0345, 39.6765]]


def wkb_polygon(ring: list[list[float]]) -> bytes:
    closed = [*ring, ring[0]]
    data = struct.pack("<BII", 1, 3, 1) + struct.pack("<I", len(closed))
    for lon, lat in closed:
        data += struct.pack("<2d", lon, lat)
    return data


def make_table(labeled: bool = True, months: int = 36, **overrides: Any) -> pd.DataFrame:
    rows = []
    for i in range(months):
        year, month = 2022 + i // 12, i % 12 + 1
        row: dict[str, Any] = {
            "parcel_id": PARCEL,
            "valley": "diamond_valley_nv",
            "month": f"{year}-{month:02d}",
            "hls_color_hex": "#4E8A42",
            "ndvi": 0.5,
            "ndmi": 0.2,
            "bsi": 0.0,
            "ndti": 0.15,
            "rain_mm": 0.0,
            "et0_mm": 100.0,
            "frost_days": 10 if month in (1, 2, 12) else 0,
            "heat_days": 3 if month == 7 else 0,
            "smap_sm_surface": 0.10 + 0.01 * (i % 12),
            "smap_sm_rootzone": 0.15 + 0.005 * (i % 12),
            "clay_pct": 20.0,
            "sand_pct": 40.0,
            "silt_pct": 40.0,
            "soc_gkg": 14.5,
            "elevation_m": 1816.0,
            "slope_pct": 1.1,
            "geometry": wkb_polygon(RING),
        }
        if labeled:
            row |= {"cdl_code": 36, "crop_group": "alfalfa", "openet_et_mm": 80.0}
        rows.append(row)
    table = pd.DataFrame(rows)
    for column, value in overrides.items():
        table[column] = value
    return table


def write_table(folder: Path, table: pd.DataFrame, meta: dict | None = None) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    table.to_parquet(folder / f"{PARCEL}.parquet", index=False)
    if meta is not None:
        (folder / f"{PARCEL}.meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return folder


def real_settings(make_settings: Callable[..., Settings], folder: Path) -> Settings:
    return make_settings(data_mode="real", data_dir=folder)


def cards(node: Any) -> list[dict[str, Any]]:
    found = []
    if isinstance(node, dict):
        if "native_scale" in node:
            found.append(node)
        for value in node.values():
            found.extend(cards(value))
    elif isinstance(node, list):
        for value in node:
            found.extend(cards(value))
    return found


def assert_contract(evaluation: dict[str, Any]) -> None:
    errors = list(VALIDATOR.iter_errors(evaluation))
    assert not errors, [f"{list(e.absolute_path)}: {e.message}" for e in errors[:5]]
    Evaluation.model_validate(evaluation)


# ---------- piezas puras ----------


def test_organic_matter_uses_van_bemmelen() -> None:
    # 10 g/kg de carbono = 1 %; × 1.724 = 1.724 % de materia orgánica
    assert ttc.organic_matter_pct(10.0) == pytest.approx(1.724)
    assert ttc.organic_matter_pct(14.5) == pytest.approx(14.5 * 0.1724)


def test_saxton_rawls_by_hand() -> None:
    # Franco: arena 40 %, arcilla 20 %, materia orgánica 2.5 %
    # θ1500t = 0.13774 -> θ1500 = 0.13702 ; θ33t = 0.29376 -> θ33 = 0.27961
    # agua disponible = (0.27961 - 0.13702) × 1000 = 142.6 mm/m
    assert ttc.saxton_rawls_awc_mm_m(40.0, 20.0, 2.5) == pytest.approx(142.6, abs=0.3)
    # Una arena retiene menos que un franco
    assert ttc.saxton_rawls_awc_mm_m(90.0, 5.0, 1.0) < 100


def test_wkb_polygon_center_and_area() -> None:
    ring = ttc.parse_wkb_polygon(wkb_polygon(RING))
    assert ring[0] == ring[-1] == RING[0]
    assert len(ring) == 5
    lat, lon, area = ttc.polygon_center_and_area_ha(ring)
    assert (lat, lon) == pytest.approx((39.68, -116.03))
    # 0.009° × cos(39.68°) × 111.195 km = 770.2 m ; 0.007° × 111.195 km = 778.4 m -> 59.95 ha
    assert area == pytest.approx(59.95, abs=0.1)


def test_wkb_rejects_what_is_not_a_polygon() -> None:
    point = struct.pack("<BI2d", 1, 1, -116.0, 39.0)
    with pytest.raises(ttc.TableError):
        ttc.parse_wkb_polygon(point)
    with pytest.raises(ttc.TableError):
        ttc.parse_wkb_polygon(b"\x01\x03")


def test_normalize_weights_sums_to_one() -> None:
    weights = ttc.normalize_weights([2.0, 1.0, 1.0])
    assert weights == pytest.approx([0.5, 0.25, 0.25])
    assert sum(ttc.normalize_weights([0.3] * 36)) == pytest.approx(1.0)  # type: ignore[arg-type]
    assert ttc.normalize_weights([0.0, 0.0]) is None


def test_annual_water_by_hand() -> None:
    months = [f"2023-{m:02d}" for m in range(1, 13)]
    # Alfalfa, ET0 = 100 mm cada mes, sin lluvia: suma de Kc mensual × 100
    # (0.40+0.40+0.65+0.85+0.95×4+0.90+0.75+0.40+0.40) × 100 = 855 mm
    assert ttc.annual_water_mm(months, ["alfalfa"] * 12, [100.0] * 12, [0.0] * 12) == pytest.approx(
        855.0
    )
    # Barbecho: Kc 0.20 todo el año -> 240 mm
    assert ttc.annual_water_mm(
        months, ["barbecho"] * 12, [100.0] * 12, [0.0] * 12
    ) == pytest.approx(240.0)
    # Sin cultivo conocido o sin clima no se inventa una cifra
    assert ttc.annual_water_mm(months, ["no_declarado"] * 12, [100.0] * 12, [0.0] * 12) is None
    assert ttc.annual_water_mm(months, ["alfalfa"] * 12, [None] * 12, [0.0] * 12) is None


# ---------- evaluación completa ----------


def test_labeled_table_becomes_a_valid_real_evaluation(
    make_settings: Callable[..., Settings], tmp_path: Path
) -> None:
    settings = real_settings(make_settings, write_table(tmp_path / "data", make_table()))
    evaluation = evaluation_service.evaluate(PARCEL, settings)
    assert_contract(evaluation)

    assert evaluation["data_status"] == "real"
    assert "fixture_disclaimer" not in evaluation
    all_cards = cards(evaluation)
    assert {c["type"] for c in all_cards} <= {"observed", "modeled", "assumed"}
    assert all(c["source"] and c["date"] and c["native_scale"] for c in all_cards)

    parcel = evaluation["parcel"]
    assert parcel["id"] == PARCEL
    assert parcel["region_mode"] == "labeled"
    assert parcel["center"] == {"lat": 39.68, "lon": -116.03}
    assert parcel["area_ha"]["value"] == pytest.approx(59.95, abs=0.1)
    assert parcel["native_pixel_footprints_m"]["openet"] == 30
    assert parcel["soil_profile"]["organic_matter_pct"]["value"] == pytest.approx(2.5, abs=0.01)
    assert "Van Bemmelen" in parcel["soil_profile"]["organic_matter_pct"]["source"]
    awc = parcel["soil_profile"]["awc_mm_m"]
    assert awc["type"] == "modeled"
    assert "Saxton" in awc["source"]
    assert awc["value"] == pytest.approx(142.6, abs=0.5)
    assert parcel["climate_summary"]["annual_et0_mm"]["value"] == 1200
    assert parcel["climate_summary"]["frost_days_year"]["value"] == 30
    assert parcel["climate_summary"]["heat_days_year"]["value"] == 3

    timeline = evaluation["timeline"]
    assert [m["month"] for m in timeline] == [
        f"{2022 + i // 12}-{i % 12 + 1:02d}" for i in range(36)
    ]
    january, july = timeline[0], timeline[6]
    assert (january["crop_code"], july["crop_code"]) == ("alfalfa_dormant", "alfalfa")
    assert july["hls_rgb"] == [78, 138, 66]
    assert july["indices"]["ndvi"] == {
        "value": 0.5,
        "unit": "index",
        "type": "observed",
        "source": ttc.SRC_HLS,
        "date": "2022-07",
        "native_scale": "30 m",
    }
    assert july["et_mm"]["value"] == 80.0  # OpenET cuando existe
    assert "OpenET" in july["et_mm"]["source"]
    # Escala: SMAP y POWER son contexto regional, nunca de la parcela
    assert july["soil_moisture"]["native_scale"] == "9 km (contexto regional)"
    assert july["root_zone_water_index"]["native_scale"] == "9 km (contexto regional)"
    assert "50 km" in july["rain_mm"]["native_scale"]
    assert all(m["attention_weight"] is None for m in timeline)  # modelo 3 en respaldo


def test_strategies_water_and_models(
    make_settings: Callable[..., Settings], tmp_path: Path
) -> None:
    settings = real_settings(make_settings, write_table(tmp_path / "data", make_table()))
    evaluation = evaluation_service.evaluate(PARCEL, settings)
    by_id = {s["id"]: s for s in evaluation["strategies"]}
    assert list(by_id) == ["current", "less_water", "more_soil"]

    current = by_id["current"]["metrics"]
    assert current["annual_water_mm"]["value"] == 855  # alfalfa, calculado a mano arriba
    assert current["annual_water_mm"]["type"] == "modeled"
    assert "FAO-56" in current["annual_water_mm"]["source"]
    assert current["water_delta_vs_current_mm"]["value"] == 0
    assert current["soil_cover_months_36m"]["value"] == 36
    assert current["prior_crop_vigor_delta_pct"]["value"] is None  # modelo 2 no inventa
    assert current["frost_risk_days_year"]["value"] == 30

    less = by_id["less_water"]["metrics"]
    assert less["annual_water_mm"]["value"] < 855
    assert less["water_delta_vs_current_mm"]["value"] == less["annual_water_mm"]["value"] - 855
    assert less["soil_cover_months_36m"]["type"] == "assumed"  # la secuencia es una plantilla
    assert "plantilla" in by_id["less_water"]["evidence_card"]["information_gaps"][2]["es"]
    assert by_id["more_soil"]["metrics"]["soil_cover_months_36m"]["value"] == 36

    for strategy in by_id.values():
        assert len(strategy["sequence_36m"]) == 36
        assert strategy["title"]["es"] and strategy["title"]["en"]
    assert by_id["current"]["title"]["es"] == "Rotación actual: Alfalfa henificada"

    assert {m["status"] for m in evaluation["models"].values()} == {"fallback"}
    assert not any(m["experimental"] for m in evaluation["models"].values())


def test_without_declared_constraints_nothing_is_ruled_out_and_it_says_so(
    make_settings: Callable[..., Settings], tmp_path: Path
) -> None:
    settings = real_settings(make_settings, write_table(tmp_path / "data", make_table()))
    evaluation = evaluation_service.evaluate(PARCEL, settings)
    assert evaluation["has_viable_options"] is True
    assert evaluation["constraints"]["max_water_mm_year"]["value"] is None
    assert "Sin declarar" in evaluation["constraints"]["max_water_mm_year"]["source"]
    for strategy in evaluation["strategies"]:
        assert strategy["viable"] is True
        assert ttc.UNDECLARED_GAP in strategy["evidence_card"]["information_gaps"]


def test_declared_constraints_in_meta_are_applied_first(
    make_settings: Callable[..., Settings], tmp_path: Path
) -> None:
    meta = {
        "name": {"es": "Pivote norte", "en": "North pivot"},
        "constraints": {
            "max_water_mm_year": 100,
            "available_machinery": ["pivote_central"],
            "crops_without_buyer": [],
            "planting_window": {"start_month": 3, "end_month": 9},
        },
    }
    settings = real_settings(make_settings, write_table(tmp_path / "data", make_table(), meta))
    evaluation = evaluation_service.evaluate(PARCEL, settings)
    assert_contract(evaluation)
    assert evaluation["parcel"]["name"] == meta["name"]
    assert evaluation["has_viable_options"] is False
    assert evaluation["constraints"]["max_water_mm_year"]["value"] == 100
    assert evaluation["constraints"]["max_water_mm_year"]["type"] == "assumed"
    for strategy in evaluation["strategies"]:
        assert strategy["viable"] is False
        assert strategy["rejection_reason"]["es"].startswith("Descartada: ")
        assert ttc.UNDECLARED_GAP not in strategy["evidence_card"]["information_gaps"]


def test_unlabeled_region(make_settings: Callable[..., Settings], tmp_path: Path) -> None:
    folder = write_table(tmp_path / "data", make_table(labeled=False))
    settings = real_settings(make_settings, folder)
    evaluation = evaluation_service.evaluate(PARCEL, settings)
    assert_contract(evaluation)
    assert evaluation["parcel"]["region_mode"] == "unlabeled"
    assert "openet" not in evaluation["parcel"]["native_pixel_footprints_m"]
    assert evaluation["models"]["model_2_prior_crop_effect"]["status"] == "absent"
    assert evaluation["models"]["model_3_crop_history_gru"]["experimental"] is True  # S-01
    # Sin CDL y sin historial declarado no se inventa el cultivo ni su agua
    assert evaluation["timeline"][0]["crop_code"] == "no_declarado"
    current = evaluation["strategies"][0]
    assert current["metrics"]["annual_water_mm"]["value"] is None
    assert "ET de referencia" in evaluation["timeline"][6]["et_mm"]["source"]
    # Las alternativas sí son del sistema de grano de verano
    codes = {m["crop_code"] for m in evaluation["strategies"][1]["sequence_36m"]}
    assert codes == {"sorgo_grano", "rastrojo_sorgo"}

    # Con el historial declarado por el agricultor sí hay cifra
    history = {str(m): ("maiz" if 5 <= m <= 10 else "barbecho") for m in range(1, 13)}
    write_table(folder, make_table(labeled=False), {"declared_history": history})
    declared = evaluation_service.evaluate(PARCEL, settings)
    assert_contract(declared)
    assert declared["timeline"][6]["crop_code"] == "maiz"
    assert declared["strategies"][0]["metrics"]["annual_water_mm"]["value"] > 0
    assert declared["strategies"][0]["metrics"]["soil_cover_months_36m"]["type"] == "assumed"


def test_month_without_image_stays_empty(
    make_settings: Callable[..., Settings], tmp_path: Path
) -> None:
    table = make_table()
    table.loc[3, ["hls_color_hex", "ndvi", "ndmi", "bsi", "ndti"]] = None
    settings = real_settings(make_settings, write_table(tmp_path / "data", table))
    evaluation = evaluation_service.evaluate(PARCEL, settings)
    assert_contract(evaluation)
    april = evaluation["timeline"][3]
    assert april["hls_color_hex"] == ttc.NO_DATA_HEX
    assert all(card["value"] is None for card in april["indices"].values())
    assert "Sin imagen" in april["indices"]["ndvi"]["source"]
    assert evaluation["timeline"][4]["indices"]["ndvi"]["value"] == 0.5


def test_ssurgo_awc_is_used_when_present(
    make_settings: Callable[..., Settings], tmp_path: Path
) -> None:
    settings = real_settings(
        make_settings, write_table(tmp_path / "data", make_table(awc_mm_m=150.0))
    )
    awc = evaluation_service.evaluate(PARCEL, settings)["parcel"]["soil_profile"]["awc_mm_m"]
    assert (awc["value"], awc["type"]) == (150.0, "observed")
    assert "SSURGO" in awc["source"]


def test_root_zone_index_sources(make_settings: Callable[..., Settings], tmp_path: Path) -> None:
    # Con zona de raíces de SMAP: mínimo-máximo de la propia serie
    settings = real_settings(make_settings, write_table(tmp_path / "data", make_table()))
    timeline = evaluation_service.evaluate(PARCEL, settings)["timeline"]
    assert timeline[0]["root_zone_water_index"]["value"] == 0.0  # mes más seco de la serie
    assert timeline[11]["root_zone_water_index"]["value"] == 1.0
    assert "zona de raíces" in timeline[0]["root_zone_water_index"]["source"]

    # Sin zona de raíces: filtro exponencial sobre la humedad superficial
    table = make_table().drop(columns=["smap_sm_rootzone"])
    settings = real_settings(make_settings, write_table(tmp_path / "otra", table))
    timeline = evaluation_service.evaluate(PARCEL, settings)["timeline"]
    surface = table["smap_sm_surface"].tolist()
    filtered = wb.exponential_filter(surface, [i * ttc.DAYS_PER_MONTH for i in range(36)], 30.0)
    expected = [(v - min(filtered)) / (max(filtered) - min(filtered)) for v in filtered]
    values = [m["root_zone_water_index"]["value"] for m in timeline]
    assert values == pytest.approx(expected, abs=1e-3)
    assert "Filtro exponencial" in timeline[0]["root_zone_water_index"]["source"]
    assert timeline[0]["root_zone_water_index"]["native_scale"] == "9 km (contexto regional)"
    assert timeline[0]["soil_moisture"]["value"] == pytest.approx(surface[0])


def test_attention_weights_are_normalized_when_model_3_is_trained(tmp_path: Path) -> None:
    class FakeModel:
        status = "trained"

        def predict(self, features: Any) -> tuple[Any, Any]:
            assert features.shape == (1, 12, 5)
            return None, [[2.0] * 6 + [1.0] * 6]  # no suma 1 a propósito

    class FakeRegistry(ModelRegistry):
        def get(self, name: str) -> Any:
            return FakeModel() if name == "model_3_crop_history_gru" else super().get(name)

    table = write_table(tmp_path / "data", make_table())
    rows = ttc.read_rows(table / f"{PARCEL}.parquet", PARCEL)
    evaluation = ttc.build_evaluation(rows, ttc.ParcelMeta(), FakeRegistry(tmp_path / "x"), "0.1.1")
    assert_contract(evaluation)
    weights = [m["attention_weight"]["value"] for m in evaluation["timeline"]]
    assert sum(weights) == pytest.approx(1.0, abs=1e-4)
    assert weights[0] == pytest.approx(2 / 54, abs=1e-5)
    assert "no es explicación causal" in evaluation["timeline"][0]["attention_weight"]["source"]


# ---------- DATA_MODE=real en la API ----------


def test_api_real_mode_end_to_end(make_client: Callable[..., TestClient], tmp_path: Path) -> None:
    client = make_client(data_mode="real", data_dir=write_table(tmp_path / "data", make_table()))

    pilots = client.get("/api/v1/pilots").json()
    assert pilots["data_status"] == "real"
    assert [p["id"] for p in pilots["pilots"]] == [PARCEL]
    assert pilots["pilots"][0]["region_mode"] == "labeled"

    response = client.post("/api/v1/evaluate", json={"parcel_id": PARCEL})
    assert response.status_code == 200
    assert_contract(response.json())
    assert response.json()["data_status"] == "real"

    tight = {
        "max_water_mm_year": 300,
        "available_machinery": ["pivote_central", "sembradora_grano", "empacadora"],
        "crops_without_buyer": [],
        "planting_window": {"start_month": 3, "end_month": 10},
    }
    simulated = client.post(
        "/api/v1/simulate", json={"parcel_id": PARCEL, "constraints": tight}
    ).json()
    assert_contract(simulated)
    assert simulated["has_viable_options"] is False
    assert "855 mm" in simulated["strategies"][0]["rejection_reason"]["es"]
    assert simulated["constraints"]["max_water_mm_year"]["type"] == "assumed"

    answer = client.post(
        "/api/v1/ask",
        json={"parcel_id": PARCEL, "question": "¿Cuánta agua usa la rotación actual?"},
    ).json()
    assert answer["answered"] is True
    assert not answer["answer"].startswith("Datos de ejemplo")
    assert "855 mm/yr (modelado" in answer["answer"]

    assert client.post("/api/v1/evaluate", json={"parcel_id": "otra"}).status_code == 404


def test_api_real_mode_incomplete_table_is_503(
    make_client: Callable[..., TestClient], tmp_path: Path
) -> None:
    client = make_client(
        data_mode="real", data_dir=write_table(tmp_path / "data", make_table(months=30))
    )
    response = client.post("/api/v1/evaluate", json={"parcel_id": PARCEL})
    assert response.status_code == 503
    assert response.json()["error"] == "real_data_incomplete"
    assert "30 meses de 36" in response.json()["message"]["es"]
    assert client.get("/api/v1/pilots").json()["pilots"] == []  # no se ofrece como piloto


def test_api_real_mode_missing_column_is_503(
    make_client: Callable[..., TestClient], tmp_path: Path
) -> None:
    table = make_table().drop(columns=["et0_mm"])
    client = make_client(data_mode="real", data_dir=write_table(tmp_path / "data", table))
    response = client.post("/api/v1/evaluate", json={"parcel_id": PARCEL})
    assert response.status_code == 503
    assert "et0_mm" in response.json()["message"]["es"]


def test_api_real_mode_without_any_table_is_503(
    make_client: Callable[..., TestClient], tmp_path: Path
) -> None:
    client = make_client(data_mode="real", data_dir=tmp_path / "vacio")
    response = client.post("/api/v1/evaluate", json={"parcel_id": PARCEL})
    assert response.status_code == 503
    assert response.json()["error"] == "real_data_unavailable"
