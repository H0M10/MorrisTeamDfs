"""El contrato: los tres fixtures cumplen el esquema y los modelos generados."""

from __future__ import annotations

import filecmp
import json
import subprocess
import sys
from typing import Any

import pytest
from jsonschema import Draft202012Validator

from app.config import BACKEND_DIR, CONTRACT_DIR
from app.schemas.contract import Evaluation
from tests.conftest import FIXTURE_NAMES, load_fixture

SCHEMA = json.loads((CONTRACT_DIR / "schema.json").read_text(encoding="utf-8"))
REPO_CONTRACTS = BACKEND_DIR.parent / "contracts"


def metric_cards(node: Any) -> list[dict[str, Any]]:
    """Todos los MetricValue de un documento."""
    found: list[dict[str, Any]] = []
    if isinstance(node, dict):
        if "native_scale" in node:
            found.append(node)
        for value in node.values():
            found.extend(metric_cards(value))
    elif isinstance(node, list):
        for value in node:
            found.extend(metric_cards(value))
    return found


def test_schema_is_valid_json_schema() -> None:
    Draft202012Validator.check_schema(SCHEMA)


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_fixture_meets_json_schema(name: str) -> None:
    errors = list(Draft202012Validator(SCHEMA).iter_errors(load_fixture(name)))
    assert not errors, [f"{list(e.absolute_path)}: {e.message}" for e in errors[:5]]


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_fixture_meets_pydantic_models(name: str) -> None:
    evaluation = Evaluation.model_validate(load_fixture(name))
    assert len(evaluation.timeline) == 36
    assert [s.id for s in evaluation.strategies] == ["current", "less_water", "more_soil"]


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_fixture_round_trips_without_changes(name: str) -> None:
    """Validar y volver a serializar no agrega ni quita campos."""
    raw = load_fixture(name)
    dumped = Evaluation.model_validate(raw).model_dump(mode="json", exclude_unset=True)
    assert dumped == raw


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_fixture_is_marked_as_fixture(name: str) -> None:
    """AGENTS.md regla 2: data_status fixture y cada cifra con type fixture."""
    data = load_fixture(name)
    assert data["data_status"] == "fixture"
    cards = metric_cards(data)
    assert cards
    assert {card["type"] for card in cards} == {"fixture"}


def test_pydantic_rejects_what_the_schema_rejects() -> None:
    data = load_fixture("diamond_valley")
    data["strategies"] = data["strategies"][:2]
    with pytest.raises(ValueError):
        Evaluation.model_validate(data)
    assert list(Draft202012Validator(SCHEMA).iter_errors(data))


@pytest.mark.skipif(not REPO_CONTRACTS.exists(), reason="/contracts no está (despliegue)")
@pytest.mark.parametrize("name", ["schema.json", *[f"fixtures/{n}.json" for n in FIXTURE_NAMES]])
def test_backend_copy_matches_contracts_folder(name: str) -> None:
    assert filecmp.cmp(REPO_CONTRACTS / name, CONTRACT_DIR / name, shallow=False), (
        "La copia del contrato está desactualizada: corre `python contracts/sync.py`"
    )


def test_generated_models_are_up_to_date() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/gen_schemas.py", "--check"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
