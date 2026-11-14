"""Rutas de la API en modo fixture, con Supabase simulado."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from app.api.v1 import get_share_store
from app.config import CONTRACT_DIR, Settings
from app.services.share import ShareStore
from tests.conftest import DV, NO_VIABLE, QRO, load_fixture

VALIDATOR = Draft202012Validator(
    json.loads((CONTRACT_DIR / "schema.json").read_text(encoding="utf-8"))
)


def assert_meets_contract(payload: dict[str, Any]) -> None:
    errors = list(VALIDATOR.iter_errors(payload))
    assert not errors, [f"{list(e.absolute_path)}: {e.message}" for e in errors[:5]]


def constraints(**overrides: Any) -> dict[str, Any]:
    values: dict[str, Any] = {
        "max_water_mm_year": 820,
        "available_machinery": ["pivote_central", "sembradora_grano", "empacadora"],
        "crops_without_buyer": [],
        "planting_window": {"start_month": 3, "end_month": 10},
    }
    values.update(overrides)
    return values


# ---------- salud y CORS ----------


def test_health(client: TestClient) -> None:
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["data_mode"] == "fixture"
    assert body["contract_version"] == load_fixture("diamond_valley")["contract_version"]
    assert body["supabase_configured"] is False
    assert body["models"]["model_1_crop_water"] == {
        "status": "fallback",
        "reason": "no hay artefacto",
    }


@pytest.mark.parametrize(
    "origin",
    ["http://localhost:3000", "https://fieldshift.vercel.app", "https://x-git-main.vercel.app"],
)
def test_cors_allows_localhost_and_vercel(client: TestClient, origin: str) -> None:
    response = client.get("/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_blocks_other_origins(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "https://example.com"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_preflight_for_post(client: TestClient) -> None:
    response = client.options(
        "/api/v1/evaluate",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]


# ---------- /pilots ----------


def test_pilots_lists_the_three_fixture_parcels(client: TestClient) -> None:
    body = client.get("/api/v1/pilots").json()
    assert body["data_status"] == "fixture"
    assert {p["id"] for p in body["pilots"]} == {DV, QRO, NO_VIABLE}
    by_id = {p["id"]: p for p in body["pilots"]}
    assert by_id[DV]["region_mode"] == "labeled"
    assert by_id[QRO]["region_mode"] == "unlabeled"
    assert by_id[NO_VIABLE]["has_viable_options"] is False
    assert by_id[DV]["area_ha"]["type"] == "fixture"
    assert "interval" not in by_id[DV]["area_ha"]  # sin nulos que el contrato no admite


# ---------- /evaluate ----------


@pytest.mark.parametrize(
    ("parcel_id", "name"),
    [(DV, "diamond_valley"), (QRO, "queretaro"), (NO_VIABLE, "no_viable_options")],
)
def test_evaluate_serves_the_fixture_as_is(client: TestClient, parcel_id: str, name: str) -> None:
    response = client.post("/api/v1/evaluate", json={"parcel_id": parcel_id})
    assert response.status_code == 200
    body = response.json()
    assert body == load_fixture(name)
    assert body["data_status"] == "fixture"
    assert_meets_contract(body)


def test_evaluate_unknown_parcel_is_404_with_bilingual_message(client: TestClient) -> None:
    response = client.post("/api/v1/evaluate", json={"parcel_id": "no-existe"})
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "parcel_not_found"
    assert set(body["message"]) == {"es", "en"}


def test_evaluate_rejects_unknown_fields(client: TestClient) -> None:
    response = client.post("/api/v1/evaluate", json={"parcel_id": DV, "extra": 1})
    assert response.status_code == 422


def test_real_mode_says_data_is_not_available(make_client: Callable[..., TestClient]) -> None:
    client = make_client(data_mode="real")
    response = client.post("/api/v1/evaluate", json={"parcel_id": DV})
    assert response.status_code == 503
    assert response.json()["error"] == "real_data_unavailable"
    assert client.get("/api/v1/pilots").json() == {"data_status": "real", "pilots": []}
    assert client.get("/health").json()["data_mode"] == "real"


# ---------- /simulate ----------


def test_simulate_keeps_contract_and_fixture_marks(client: TestClient) -> None:
    response = client.post("/api/v1/simulate", json={"parcel_id": DV, "constraints": constraints()})
    assert response.status_code == 200
    body = response.json()
    assert_meets_contract(body)
    assert body["data_status"] == "fixture"
    assert body["constraints"]["max_water_mm_year"]["value"] == 820
    assert body["constraints"]["max_water_mm_year"]["type"] == "fixture"
    assert body["constraints"]["planting_window"]["label"] == {
        "es": "Marzo a octubre",
        "en": "March to October",
    }
    assert body["has_viable_options"] is True
    assert [s["viable"] for s in body["strategies"]] == [True, True, True]
    assert all(s["rejection_reason"] is None for s in body["strategies"])


def test_simulate_lowering_water_rules_out_rotations(client: TestClient) -> None:
    body = client.post(
        "/api/v1/simulate",
        json={"parcel_id": DV, "constraints": constraints(max_water_mm_year=600)},
    ).json()
    assert_meets_contract(body)
    by_id = {s["id"]: s for s in body["strategies"]}
    # Agua anual del fixture: actual 795, menos agua 545, más suelo 610
    assert by_id["current"]["viable"] is False
    assert by_id["current"]["constraint_evaluation"]["water_ok"] is False
    assert "795 mm" in by_id["current"]["rejection_reason"]["es"]
    assert by_id["less_water"]["viable"] is True
    assert by_id["more_soil"]["viable"] is False
    assert body["has_viable_options"] is True


def test_simulate_can_end_with_no_viable_options(client: TestClient) -> None:
    body = client.post(
        "/api/v1/simulate",
        json={"parcel_id": DV, "constraints": constraints(max_water_mm_year=100)},
    ).json()
    assert_meets_contract(body)
    assert body["has_viable_options"] is False
    for strategy in body["strategies"]:
        assert strategy["viable"] is False
        assert strategy["rejection_reason"]["es"].startswith("Descartada: ")
        assert strategy["rejection_reason"]["en"].startswith("Ruled out: ")


def test_simulate_buyer_and_machinery(client: TestClient) -> None:
    body = client.post(
        "/api/v1/simulate",
        json={
            "parcel_id": DV,
            "constraints": constraints(
                crops_without_buyer=["cebada_forrajera"],
                available_machinery=["pivote_central", "sembradora_grano"],
            ),
        },
    ).json()
    by_id = {s["id"]: s for s in body["strategies"]}
    assert by_id["less_water"]["constraint_evaluation"]["buyer_ok"] is False
    assert "Cebada" in by_id["less_water"]["rejection_reason"]["es"]
    assert by_id["current"]["constraint_evaluation"]["machinery_ok"] is False
    assert "empacadora" in by_id["current"]["rejection_reason"]["es"]


def test_simulate_relaxing_constraints_recovers_the_no_viable_case(client: TestClient) -> None:
    body = client.post(
        "/api/v1/simulate", json={"parcel_id": NO_VIABLE, "constraints": constraints()}
    ).json()
    assert_meets_contract(body)
    assert body["has_viable_options"] is True


def test_simulate_does_not_change_the_fixture_in_memory(client: TestClient) -> None:
    client.post(
        "/api/v1/simulate",
        json={"parcel_id": DV, "constraints": constraints(max_water_mm_year=100)},
    )
    assert client.post("/api/v1/evaluate", json={"parcel_id": DV}).json() == load_fixture(
        "diamond_valley"
    )


def test_simulate_validates_input(client: TestClient) -> None:
    bad = constraints(planting_window={"start_month": 0, "end_month": 13})
    assert (
        client.post("/api/v1/simulate", json={"parcel_id": DV, "constraints": bad}).status_code
        == 422
    )
    assert client.post("/api/v1/simulate", json={"parcel_id": DV}).status_code == 422


# ---------- /ask ----------


def ask(client: TestClient, question: str, parcel_id: str = DV, lang: str = "es") -> dict[str, Any]:
    response = client.post(
        "/api/v1/ask", json={"parcel_id": parcel_id, "question": question, "lang": lang}
    )
    assert response.status_code == 200
    return response.json()


def test_ask_water_answers_only_with_contract_fields(client: TestClient) -> None:
    body = ask(client, "¿Cuánta agua usa cada rotación?")
    assert body["answered"] is True
    assert body["intent"] == "water"
    assert body["data_status"] == "fixture"
    assert body["answer"].startswith("Datos de ejemplo.")
    fixture = load_fixture("diamond_valley")
    assert [s["path"] for s in body["sources"]] == [
        f"/strategies/{i}/metrics/annual_water_mm" for i in range(3)
    ]
    for index, source in enumerate(body["sources"]):
        metric = fixture["strategies"][index]["metrics"]["annual_water_mm"]
        assert source["metric"] == metric
        assert f"{metric['value']:g} {metric['unit']}" in body["answer"]
        assert metric["source"] in body["answer"]


def test_ask_can_focus_on_one_rotation(client: TestClient) -> None:
    body = ask(client, "¿Cuánta agua usa la de menos agua?")
    assert [s["path"] for s in body["sources"]] == ["/strategies/1/metrics/annual_water_mm"]


def test_ask_in_english(client: TestClient) -> None:
    body = ask(client, "What are the risks?", lang="en")
    assert body["intent"] == "risks"
    assert body["answer"].startswith("Example data.")
    fixture = load_fixture("diamond_valley")
    assert (
        fixture["strategies"][0]["evidence_card"]["local_review_risks"][0]["en"] in body["answer"]
    )


def test_ask_says_when_it_does_not_know(client: TestClient) -> None:
    body = ask(client, "¿Cuál es el precio del diésel?")
    assert body["answered"] is False
    assert body["intent"] is None
    assert body["sources"] == []
    assert body["answer"].startswith("No sé responder eso")


def test_ask_does_not_recommend_when_nothing_is_viable(client: TestClient) -> None:
    body = ask(client, "¿Qué beneficios tiene?", parcel_id=NO_VIABLE)
    assert body["intent"] == "viability"
    assert "Ninguna rotación es viable" in body["answer"]
    fixture = load_fixture("no_viable_options")
    assert fixture["strategies"][0]["rejection_reason"]["es"] in body["answer"]
    assert fixture["strategies"][0]["evidence_card"]["benefits"][0]["es"] not in body["answer"]


def test_ask_about_data_status_and_models(client: TestClient) -> None:
    status = ask(client, "¿Estos son datos reales?")
    assert status["intent"] == "data_status"
    assert "EJEMPLO" in status["answer"]
    models = ask(client, "¿Qué modelos se usaron?", parcel_id=QRO)
    assert models["intent"] == "models"
    assert "model_2_prior_crop_effect (absent)" in models["answer"]


def test_ask_uses_simulated_constraints(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ask",
        json={
            "parcel_id": DV,
            "question": "¿Cuál es viable?",
            "constraints": constraints(max_water_mm_year=100),
        },
    )
    assert "Ninguna rotación es viable" in response.json()["answer"]


# ---------- /share ----------


class FakeSupabase:
    def __init__(self) -> None:
        self.rows: dict[str, dict[str, Any]] = {}
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        payload = json.loads(request.content)
        if request.url.path.endswith("/rpc/create_shared_evaluation"):
            self.rows[payload["p_token"]] = {
                "share_token": payload["p_token"],
                "input": payload["p_input"],
                "result": payload["p_result"],
                "created_at": "2026-11-14T08:00:00+00:00",
            }
            return httpx.Response(200, json=payload["p_token"])
        if request.url.path.endswith("/rpc/get_shared_evaluation"):
            row = self.rows.get(payload["p_token"])
            return httpx.Response(200, json=[row] if row else [])
        return httpx.Response(404)


def share_client(
    make_client: Callable[..., TestClient], handler: Callable[[httpx.Request], httpx.Response]
) -> TestClient:
    client = make_client(supabase_url="https://demo.supabase.co", supabase_anon_key="anon-key")

    def store() -> ShareStore:
        settings = Settings(
            _env_file=None, supabase_url="https://demo.supabase.co", supabase_anon_key="anon-key"
        )
        return ShareStore(settings, transport=httpx.MockTransport(handler))

    client.app.dependency_overrides[get_share_store] = store  # type: ignore[attr-defined]
    return client


def test_share_saves_and_reads_back_by_token(make_client: Callable[..., TestClient]) -> None:
    supabase = FakeSupabase()
    client = share_client(make_client, supabase)
    fixture = load_fixture("diamond_valley")

    saved = client.post("/api/v1/share", json={"input": {"parcel_id": DV}, "result": fixture})
    assert saved.status_code == 200
    token = saved.json()["token"]
    assert len(token) >= 16
    assert saved.json()["path"] == f"/api/v1/share/{token}"
    assert supabase.requests[0].headers["apikey"] == "anon-key"
    assert supabase.rows[token]["result"] == fixture  # se guarda sin alterar

    read = client.get(f"/api/v1/share/{token}")
    assert read.status_code == 200
    assert read.json()["result"] == fixture
    assert read.json()["input"] == {"parcel_id": DV}


def test_share_rejects_a_result_that_breaks_the_contract(
    make_client: Callable[..., TestClient],
) -> None:
    client = share_client(make_client, FakeSupabase())
    broken = load_fixture("diamond_valley")
    del broken["strategies"][0]["evidence_card"]
    assert client.post("/api/v1/share", json={"input": {}, "result": broken}).status_code == 422


def test_share_unknown_or_malformed_token_is_404(make_client: Callable[..., TestClient]) -> None:
    supabase = FakeSupabase()
    client = share_client(make_client, supabase)
    assert client.get("/api/v1/share/AAAAAAAAAAAAAAAAAAAAAA").status_code == 404
    assert client.get("/api/v1/share/corto").status_code == 404
    assert len(supabase.requests) == 1  # el token mal formado ni siquiera consulta


def test_share_without_supabase_config_is_a_clear_503(client: TestClient) -> None:
    response = client.post(
        "/api/v1/share", json={"input": {}, "result": load_fixture("diamond_valley")}
    )
    assert response.status_code == 503
    body = response.json()
    assert body["error"] == "share_unavailable"
    assert "sigue funcionando" in body["message"]["es"]
    assert "keeps working" in body["message"]["en"]


@pytest.mark.parametrize("failure", ["down", "timeout", "http500"])
def test_supabase_failure_is_a_clear_503_and_the_rest_keeps_working(
    make_client: Callable[..., TestClient], failure: str
) -> None:
    def broken(request: httpx.Request) -> httpx.Response:
        if failure == "down":
            raise httpx.ConnectError("sin conexión", request=request)
        if failure == "timeout":
            raise httpx.ReadTimeout("lento", request=request)
        return httpx.Response(500)

    client = share_client(make_client, broken)
    fixture = load_fixture("diamond_valley")
    saved = client.post("/api/v1/share", json={"input": {}, "result": fixture})
    assert saved.status_code == 503
    assert saved.json()["error"] == "share_unavailable"
    assert client.get("/api/v1/share/AAAAAAAAAAAAAAAAAAAAAA").status_code == 503

    # Lo demás sigue funcionando
    assert client.get("/health").status_code == 200
    assert client.post("/api/v1/evaluate", json={"parcel_id": DV}).json() == fixture
    simulated = client.post(
        "/api/v1/simulate", json={"parcel_id": DV, "constraints": constraints()}
    )
    assert simulated.status_code == 200
