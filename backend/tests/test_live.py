"""Análisis en vivo de un punto (/api/v1/analyze) sin red: Earth Engine y POWER se
reemplazan por las filas reales de Diamond Valley que ya están en backend/data."""

from __future__ import annotations

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
