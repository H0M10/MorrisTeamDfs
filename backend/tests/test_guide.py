"""La Guía (/api/v1/guide): capa determinista, barandillas del modelo, tiempo, caché y límites.

Nunca se llama a un proveedor real: `guide_service.call_llm` se sustituye.
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable, Iterator
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.services import guide as guide_service

URL = "/api/v1/guide"

ITEMS = [
    {
        "id": "strip",
        "text": "La tira de tu campo: un cuadro por mes, pintado con el color "
        "que vio el satélite durante 36 meses.",
    },
    {"id": "legend-bare", "text": "La barra amarilla marca los meses con suelo desnudo."},
    {"id": "map", "text": "El mapa muestra el tamaño real del píxel de cada fuente."},
]


def body(**overrides: Any) -> dict[str, Any]:
    values: dict[str, Any] = {
        "screen": "retrato",
        "question": "¿Qué es la barra amarilla?",
        "lang": "es",
        "visible_guide_ids": ["strip", "legend-bare", "map"],
        "guide_items": ITEMS,
        "fields": {"/strategies/0/metrics/annual_water_mm/value": 812.4, "/data_status": "real"},
    }
    values.update(overrides)
    return values


def llm_reply(**overrides: Any) -> str:
    reply: dict[str, Any] = {
        "answer": "Esa barra marca los meses en que el suelo quedó sin cubrir.",
        "highlight": ["legend-bare"],
        "go_to_step": None,
        "terms": ["bare_soil"],
        "set_constraint": None,
    }
    reply.update(overrides)
    return json.dumps(reply, ensure_ascii=False)


@pytest.fixture(autouse=True)
def clean_state() -> Iterator[None]:
    guide_service.reset_state()
    yield
    guide_service.reset_state()


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> Callable[[Any], list[Any]]:
    """Sustituye al proveedor. Devuelve la lista de peticiones que recibió."""

    def install(reply: Any) -> list[Any]:
        calls: list[Any] = []

        def fake(request: Any, settings: Any) -> str:
            calls.append(request)
            if isinstance(reply, BaseException):
                raise reply
            return reply(request) if callable(reply) else reply

        monkeypatch.setattr(guide_service, "call_llm", fake)
        return calls

    return install


@pytest.fixture
def llm_client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client(guide_llm_api_key="test-key")


# ----------------------------------------------------------- capa determinista


def test_without_key_answers_with_rules_and_highlights_the_item(
    client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    calls = fake_llm(llm_reply())
    response = client.post(URL, json=body())
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "rules"
    assert data["highlight"] == ["legend-bare"]
    assert data["answer"] == ITEMS[1]["text"]
    assert data["go_to_step"] is None
    assert data["set_constraint"] is None
    assert calls == []  # sin llave nunca se llama al proveedor


def test_rules_answer_terms_from_glossary_whitelist(client: TestClient) -> None:
    data = client.post(URL, json=body(question="¿Qué es el NDVI?", guide_items=[])).json()
    assert data["terms"] == ["ndvi"]
    data = client.post(
        URL, json=body(question="¿Qué es el NDVI?", guide_items=[], glossary_ids=["pixel"])
    ).json()
    assert data["terms"] == []


@pytest.mark.parametrize(
    ("screen", "question", "step"),
    [
        ("retrato", "Llévame a las rotaciones", "rotaciones"),
        ("restricciones", "siguiente", "rotaciones"),
        ("restricciones", "atrás", "retrato"),
        ("rotaciones", "take me to the evidence", "evidencia"),
    ],
)
def test_rules_navigation(client: TestClient, screen: str, question: str, step: str) -> None:
    data = client.post(URL, json=body(screen=screen, question=question)).json()
    assert data["go_to_step"] == step


def test_rules_navigation_at_the_ends(client: TestClient) -> None:
    data = client.post(URL, json=body(screen="compartir", question="siguiente")).json()
    assert data["go_to_step"] is None
    assert "último" in data["answer"]


def test_rules_unknown_question_says_so(client: TestClient) -> None:
    data = client.post(URL, json=body(question="zzz qwerty", lang="es")).json()
    assert data["highlight"] == []
    assert "No encontré" in data["answer"]


# ------------------------------------------------------------- límites por voz


def test_voice_constraint_from_transcript(client: TestClient) -> None:
    said = "Tengo 24 pulgadas de agua al año y no tengo comprador de papa"
    data = client.post(
        URL, json=body(screen="restricciones", question=said, transcript=said)
    ).json()
    constraint = data["set_constraint"]
    assert constraint["max_water_mm_year"] == {"value": 24, "unit": "in", "value_mm": 609.6}
    assert constraint["crops_without_buyer"] == ["papa"]
    assert constraint["needs_confirmation"] is True
    assert constraint["heard"] == said
    assert "24 pulgadas" in data["answer"]
    assert "¿Lo aplico?" in data["answer"]


def test_voice_constraint_acre_feet_and_english(client: TestClient) -> None:
    said = "I get 2 acre-feet of water and nobody buys my oats"
    data = client.post(URL, json=body(screen="restricciones", question=said, lang="en")).json()
    constraint = data["set_constraint"]
    assert constraint["max_water_mm_year"] == {"value": 2, "unit": "acre_ft", "value_mm": 609.6}
    assert constraint["crops_without_buyer"] == ["avena_forrajera"]


def test_number_without_unit_is_not_a_constraint(client: TestClient) -> None:
    data = client.post(URL, json=body(screen="restricciones", question="Tengo 24 de agua")).json()
    assert data["set_constraint"] is None


def test_crop_without_no_buyer_phrase_is_not_a_constraint(client: TestClient) -> None:
    data = client.post(URL, json=body(question="Siembro papa")).json()
    assert data["set_constraint"] is None


# ----------------------------------------------------------- capa con modelo


def test_llm_answer_passes_and_ids_are_whitelisted(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    fake_llm(
        llm_reply(
            highlight=["legend-bare", "not-on-screen", "strip"],
            go_to_step="dashboard",
            terms=["bare_soil", "made_up_term"],
        )
    )
    data = llm_client.post(URL, json=body()).json()
    assert data["source"] == "llm"
    assert data["highlight"] == ["legend-bare", "strip"]
    assert data["go_to_step"] is None
    assert data["terms"] == ["bare_soil"]


def test_llm_go_to_step_must_be_a_real_step(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    fake_llm(llm_reply(go_to_step="rotaciones", highlight=[]))
    data = llm_client.post(URL, json=body()).json()
    assert data["go_to_step"] == "rotaciones"


def test_llm_invented_number_falls_back_to_rules(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    fake_llm(llm_reply(answer="La alfalfa usa unos 950 mm al año."))
    data = llm_client.post(URL, json=body()).json()
    assert data["source"] == "rules"
    assert "950" not in data["answer"]


@pytest.mark.parametrize(
    "answer",
    [
        "La rotación actual usa 812.4 mm al año.",  # campo enviado
        "La tira tiene 36 meses.",  # texto de la capa 1
    ],
)
def test_llm_numbers_from_sent_fields_are_allowed(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]], answer: str
) -> None:
    fake_llm(llm_reply(answer=answer))
    data = llm_client.post(URL, json=body()).json()
    assert data["source"] == "llm"
    assert data["answer"] == answer


def test_llm_rounding_a_field_counts_as_invented(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    fake_llm(llm_reply(answer="La rotación actual usa 812 mm al año."))
    assert llm_client.post(URL, json=body()).json()["source"] == "rules"


@pytest.mark.parametrize("reply", ["no es json", "[]", json.dumps({"answer": ""})])
def test_llm_bad_shape_falls_back_to_rules(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]], reply: str
) -> None:
    fake_llm(reply)
    assert llm_client.post(URL, json=body()).json()["source"] == "rules"


def test_llm_error_falls_back_without_error(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    fake_llm(RuntimeError("cuota agotada"))
    response = llm_client.post(URL, json=body())
    assert response.status_code == 200
    assert response.json()["source"] == "rules"


def test_llm_timeout_falls_back_to_rules(
    make_client: Callable[..., TestClient], fake_llm: Callable[[Any], list[Any]]
) -> None:
    client = make_client(guide_llm_api_key="test-key", guide_timeout_s=0.2)

    def slow(_: Any) -> str:
        time.sleep(1.0)
        return llm_reply()

    fake_llm(slow)
    started = time.monotonic()
    data = client.post(URL, json=body()).json()
    assert data["source"] == "rules"
    assert time.monotonic() - started < 0.9


def test_default_timeout_is_eight_seconds(make_settings: Callable[..., Any]) -> None:
    assert make_settings().guide_timeout_s == 8.0


def test_llm_constraint_must_be_in_transcript(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    said = "Tengo 24 pulgadas de agua al año"
    fake_llm(
        llm_reply(
            answer="Escuché tu límite de agua. ¿Lo aplico?",
            set_constraint={
                "max_water_mm_year": {"value": 30, "unit": "in"},
                "crops_without_buyer": ["papa"],
            },
        )
    )
    data = llm_client.post(
        URL, json=body(screen="restricciones", question=said, transcript=said)
    ).json()
    assert data["source"] == "llm"
    # El 30 no se dijo y la papa tampoco: se usa lo que sí se oyó.
    constraint = data["set_constraint"]
    assert constraint["max_water_mm_year"]["value"] == 24
    assert constraint["crops_without_buyer"] == []


def test_llm_constraint_unit_must_be_said(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    said = "Me dan 24 de agua"
    fake_llm(
        llm_reply(
            answer="¿Son pulgadas o milímetros?",
            set_constraint={
                "max_water_mm_year": {"value": 24, "unit": "in"},
                "crops_without_buyer": [],
            },
        )
    )
    data = llm_client.post(URL, json=body(screen="restricciones", question=said)).json()
    assert data["set_constraint"] is None


def test_llm_constraint_with_synonym_crop(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    said = "No tengo comprador para la papa ni para el maíz"
    fake_llm(
        llm_reply(
            answer="Escuché que no tienes comprador. ¿Lo aplico?",
            set_constraint={
                "max_water_mm_year": None,
                "crops_without_buyer": ["papa", "maiz", "algodon"],
            },
        )
    )
    data = llm_client.post(URL, json=body(screen="restricciones", question=said)).json()
    assert data["set_constraint"]["crops_without_buyer"] == ["papa", "maiz"]


# -------------------------------------------------------------- caché y límite


def test_cache_by_screen_and_normalized_question(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    calls = fake_llm(llm_reply())
    first = llm_client.post(URL, json=body(question="¿Qué es la barra amarilla?")).json()
    second = llm_client.post(URL, json=body(question="  ¿qué es la BARRA amarilla?  ")).json()
    assert first == second
    assert len(calls) == 1
    llm_client.post(URL, json=body(screen="rotaciones"))
    assert len(calls) == 2


def test_failed_answers_are_not_cached(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    calls = fake_llm(llm_reply(answer="Usa 999 mm."))
    llm_client.post(URL, json=body())
    llm_client.post(URL, json=body())
    assert len(calls) == 2


def test_session_limit_falls_back_to_rules(
    make_client: Callable[..., TestClient], fake_llm: Callable[[Any], list[Any]]
) -> None:
    client = make_client(guide_llm_api_key="test-key", guide_session_limit=2)
    calls = fake_llm(llm_reply())
    sources = [
        client.post(URL, json=body(question=f"pregunta {i}", session_id="abc")).json()["source"]
        for i in range(3)
    ]
    assert sources == ["llm", "llm", "rules"]
    assert len(calls) == 2
    other = client.post(URL, json=body(question="otra", session_id="xyz")).json()
    assert other["source"] == "llm"


# ---------------------------------------------------------------- validación


@pytest.mark.parametrize(
    "overrides",
    [
        {"screen": "dashboard"},
        {"visible_guide_ids": ["Bad Id!"]},
        {"question": ""},
        {"lang": "fr"},
        {"unexpected": True},
    ],
)
def test_request_validation(client: TestClient, overrides: dict[str, Any]) -> None:
    assert client.post(URL, json=body(**overrides)).status_code == 422


def test_profile_ignores_unknown_settings(client: TestClient) -> None:
    response = client.post(URL, json=body(profile={"plain_language": True, "large_text": True}))
    assert response.status_code == 200


def test_invented_numbers_reads_decimal_commas() -> None:
    allowed = guide_service.numbers_in("812,4 y 1,234.5")
    assert guide_service.invented_numbers("812.4 y 1234.5", allowed) == []
    assert guide_service.invented_numbers("813", allowed) == ["813"]


def test_payload_marks_question_as_data_and_lists_whitelists() -> None:
    request = guide_service.GuideRequest.model_validate(body())
    payload = guide_service.user_payload(request)
    assert "QUESTION:\n¿Qué es la barra amarilla?" in payload
    context = json.loads(payload.split("\n", 1)[1].split("\n\nQUESTION:")[0])
    assert context["visible_ids"] == ["strip", "legend-bare", "map"]
    assert "rotaciones" in context["steps"]
    assert "papa" in context["crop_codes"]


# ------------------------------------------------- adaptadores (sin red)


class _Block:
    def __init__(self, text: str) -> None:
        self.type = "text"
        self.text = text


class _Message:
    def __init__(self, text: str, stop_reason: str = "end_turn") -> None:
        self.content = [_Block(text)]
        self.stop_reason = stop_reason


def _fake_anthropic(monkeypatch: pytest.MonkeyPatch, message: _Message) -> dict[str, Any]:
    sent: dict[str, Any] = {}

    class Messages:
        def create(self, **kwargs: Any) -> _Message:
            sent.update(kwargs)
            return message

    class Client:
        messages = Messages()

    monkeypatch.setattr(guide_service, "_anthropic_client", lambda key, timeout: Client())
    return sent


def test_anthropic_adapter_asks_for_structured_json(
    monkeypatch: pytest.MonkeyPatch, make_client: Callable[..., TestClient]
) -> None:
    sent = _fake_anthropic(monkeypatch, _Message(llm_reply()))
    client = make_client(guide_llm_api_key="test-key")
    data = client.post(URL, json=body()).json()
    assert data["source"] == "llm"
    assert sent["model"] == "claude-opus-5-5"
    assert sent["output_config"]["effort"] == "low"
    assert sent["output_config"]["format"]["type"] == "json_schema"
    assert sent["system"] == guide_service.SYSTEM_PROMPT
    assert "temperature" not in sent


def test_anthropic_refusal_falls_back(
    monkeypatch: pytest.MonkeyPatch, make_client: Callable[..., TestClient]
) -> None:
    _fake_anthropic(monkeypatch, _Message("", stop_reason="refusal"))
    client = make_client(guide_llm_api_key="test-key")
    assert client.post(URL, json=body()).json()["source"] == "rules"


def test_gemini_adapter(
    monkeypatch: pytest.MonkeyPatch, make_client: Callable[..., TestClient]
) -> None:
    sent: dict[str, Any] = {}

    def fake_post(url: str, **kwargs: Any) -> httpx.Response:
        sent.update(url=url, **kwargs)
        payload = {"candidates": [{"content": {"parts": [{"text": llm_reply()}]}}]}
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(guide_service.httpx, "post", fake_post)
    client = make_client(
        guide_llm_api_key="test-key", guide_llm_provider="gemini", guide_llm_model="gemini-x"
    )
    data = client.post(URL, json=body()).json()
    assert data["source"] == "llm"
    assert sent["url"].endswith("/models/gemini-x:generateContent")
    assert sent["headers"] == {"x-goog-api-key": "test-key"}
    assert sent["timeout"] == 8.0


def test_gemini_asks_for_schema_and_no_thinking_on_flash() -> None:
    config = guide_service._gemini_config("gemini-2.5-flash")
    assert config["responseJsonSchema"] == guide_service.RESPONSE_SCHEMA
    assert config["thinkingConfig"] == {"thinkingBudget": 0}
    assert "thinkingConfig" not in guide_service._gemini_config("gemini-2.5-pro")


def test_quota_error_pauses_llm_calls(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    request = httpx.Request("POST", "https://example.test")
    quota = httpx.HTTPStatusError(
        "429",
        request=request,
        response=httpx.Response(429, headers={"retry-after": "60"}, request=request),
    )
    calls = fake_llm(quota)
    assert llm_client.post(URL, json=body(question="uno")).json()["source"] == "rules"
    assert llm_client.post(URL, json=body(question="dos")).json()["source"] == "rules"
    assert len(calls) == 1  # durante la pausa ya no se llama al proveedor


def test_other_provider_errors_do_not_pause(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    calls = fake_llm(RuntimeError("red"))
    llm_client.post(URL, json=body(question="uno"))
    llm_client.post(URL, json=body(question="dos"))
    assert len(calls) == 2


def test_llm_keeps_terms_found_by_rules(
    llm_client: TestClient, fake_llm: Callable[[Any], list[Any]]
) -> None:
    fake_llm(llm_reply(answer="Es una medida del verdor de las plantas.", terms=["pixel"]))
    data = llm_client.post(URL, json=body(question="¿Qué es el NDVI?")).json()
    assert data["source"] == "llm"
    assert data["terms"] == ["ndvi", "pixel"]
