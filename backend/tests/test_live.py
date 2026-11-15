"""Análisis en vivo de un punto (/api/v1/analyze) sin red: Earth Engine y POWER se
reemplazan por las filas reales de Diamond Valley que ya están en backend/data."""

from __future__ import annotations

import math
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.services import live
from app.sources import earth_engine

DATA = Path(__file__).resolve().parent.parent / "data" / "diamond_valley.parquet"
WEATHER = ["et0_mm", "rain_mm", "tmax_c", "tmin_c", "frost_days", "heat_days"]


def _fake_sources(monkeypatch: pytest.MonkeyPatch, cdl_code: int | None = 36) -> None:
    table = pd.read_parquet(DATA)
    table = table[table["parcel_id"] == "dv-nv-01"].sort_values("month")
    rows = [
        {k: (None if pd.isna(v) else v) for k, v in r.items()}
        for r in table.to_dict(orient="records")
    ]
    monthly = [
        {
            "month": r["month"],
            "hls_n_images": r["hls_n_images"],
            **{
                k: r[k]
                for k in (
                    "red",
                    "green",
                    "blue",
                    "ndvi",
                    "ndmi",
                    "bsi",
                    "ndti",
                    "smap_sm_surface",
                    "smap_sm_rootzone",
                    "openet_et_mm",
                )
            },
        }
        for r in rows
    ]
    first = rows[0]
    static = {
        "elevation_m": first["elevation_m"],
        "slope_pct": first["slope_pct"],
        "clay_gkg": first["clay_pct"] * 10,
        "sand_gkg": first["sand_pct"] * 10,
        "silt_gkg": first["silt_pct"] * 10,
        "soc_dgkg": first["soc_gkg"] * 10,
    }
    cdl = dict.fromkeys(range(2021, 2025), cdl_code)
    weather = {r["month"]: {k: r[k] for k in WEATHER} for r in rows}

    def fetch(*_: Any, **__: Any) -> tuple[list[dict[str, Any]], dict[str, Any], dict[int, Any]]:
        return monthly, static, cdl

    monkeypatch.setattr(earth_engine, "fetch_field", fetch)
    monkeypatch.setattr(live, "power_monthly", lambda *_, **__: weather)
    monkeypatch.setattr(live, "YEARS", sorted({int(r["month"][:4]) for r in rows}))


@pytest.fixture
def live_client(make_client: Callable[..., TestClient], tmp_path: Path) -> TestClient:
    return make_client(data_mode="real", ee_project="demo", live_cache_dir=tmp_path)


def test_analyze_builds_a_full_evaluation_with_the_models(
    live_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _fake_sources(monkeypatch)
    response = live_client.post("/api/v1/analyze", json={"lat": 39.7, "lon": -116.0})
    assert response.status_code == 200, response.text
    body = response.json()
    parcel_id = body["parcel"]["id"]
    assert parcel_id == "live-39.7000n-116.0000w"
    assert body["data_status"] == "real"
    assert len(body["timeline"]) == 36
    assert len(body["strategies"]) == 3
    # El mismo id sirve después en /evaluate y /simulate.
    again = live_client.post("/api/v1/evaluate", json={"parcel_id": parcel_id})
    assert again.status_code == 200
    assert again.json()["timeline"] == body["timeline"]


def test_analyze_outside_conus_is_a_clear_422(live_client: TestClient) -> None:
    response = live_client.post("/api/v1/analyze", json={"lat": 20.5, "lon": -100.2})
    assert response.status_code == 422
    assert response.json()["error"] == "outside_coverage"


def test_analyze_rejects_points_that_are_not_cropland(
    live_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _fake_sources(monkeypatch, cdl_code=176)  # pastizal
    response = live_client.post("/api/v1/analyze", json={"lat": 37.65, "lon": -100.95})
    assert response.status_code == 422
    assert response.json()["error"] == "not_cropland"


def test_analyze_without_earth_engine_is_503_and_the_rest_works(
    make_client: Callable[..., TestClient],
) -> None:
    client = make_client(data_mode="real", ee_project="")
    response = client.post("/api/v1/analyze", json={"lat": 39.7, "lon": -116.0})
    assert response.status_code == 503
    assert response.json()["error"] == "live_unavailable"
    assert client.get("/health").status_code == 200


def test_unknown_live_id_is_404(live_client: TestClient) -> None:
    response = live_client.post("/api/v1/evaluate", json={"parcel_id": "live-1.0000n-1.0000w"})
    assert response.status_code == 404


def test_predictions_reads_crops_per_year_without_earth_engine(
    make_client: Callable[..., TestClient],
) -> None:
    backend = Path(__file__).resolve().parent.parent
    client = make_client(
        data_mode="real",
        ee_project="",
        data_dir=backend / "data",
        models_dir=backend / "artifacts",
    )
    response = client.get("/api/v1/predictions/dv-nv-01")
    assert response.status_code == 200
    body = response.json()
    reading = body["crop_reading"]
    if reading["status"] == "trained":
        assert [y["year"] for y in reading["years"]] == ["2022", "2023", "2024"]
        for year in reading["years"]:
            assert 0 <= year["probability"] <= 1
            assert abs(sum(year["probabilities"].values()) - 1) < 0.01
            assert year["usda_cdl_group"] is not None  # hay registro oficial: se compara
    # Sin Earth Engine, Dynamic World se declara no disponible y lo demás responde.
    assert body["dynamic_world"]["available"] is False
    assert client.get("/api/v1/predictions/no-existe").status_code == 404


def _square(lat: float, lon: float, side_m: float) -> list[list[float]]:
    dlat = side_m / 2 / 111_195
    dlon = side_m / 2 / (111_195 * math.cos(math.radians(lat)))
    return [
        [lon - dlon, lat - dlat],
        [lon + dlon, lat - dlat],
        [lon + dlon, lat + dlat],
        [lon - dlon, lat + dlat],
    ]


def test_analyze_a_drawn_area_uses_its_real_size(
    live_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _fake_sources(monkeypatch)
    square = _square(39.7, -116.0, 400)  # 16 ha
    response = live_client.post(
        "/api/v1/analyze", json={"lat": 39.7, "lon": -116.0, "polygon": square}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["parcel"]["id"].startswith("live-39.7000n-116.0000w-a")
    assert body["parcel"]["area_ha"]["value"] == pytest.approx(16, rel=0.02)
    assert body["parcel"]["name"]["es"].startswith("Área definida en el mapa")
    # Otra figura en el mismo lugar es otra parcela.
    other = live_client.post(
        "/api/v1/analyze",
        json={"lat": 39.7, "lon": -116.0, "polygon": _square(39.7, -116.0, 800)},
    )
    assert other.json()["parcel"]["id"] != body["parcel"]["id"]
    assert other.json()["parcel"]["area_ha"]["value"] == pytest.approx(64, rel=0.02)


@pytest.mark.parametrize(
    "polygon",
    [
        [[-116.0, 39.7], [-116.001, 39.7]],  # dos esquinas
        _square(39.7, -116.0, 30),  # 0.09 ha: demasiado chica
        _square(39.7, -116.0, 5000),  # 2 500 ha: demasiado grande
    ],
)
def test_analyze_rejects_bad_areas(live_client: TestClient, polygon: list[list[float]]) -> None:
    response = live_client.post(
        "/api/v1/analyze", json={"lat": 39.7, "lon": -116.0, "polygon": polygon}
    )
    assert response.status_code == 422
    assert response.json()["error"] == "bad_polygon"
