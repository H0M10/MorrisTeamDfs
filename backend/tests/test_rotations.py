"""Rotaciones candidatas del Modelo 5 con el artefacto real."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.services import rotations
from app.services import table_to_contract as ttc

BACKEND = Path(__file__).resolve().parent.parent
ARTIFACTS = BACKEND / "artifacts"


@pytest.fixture
def current_and_months() -> tuple[list[str], list[str]]:
    rows = ttc.read_rows(BACKEND / "data" / "diamond_valley.parquet", "dv-nv-01")
    months = [r["month"] for r in rows]
    meta = ttc.ParcelMeta()
    return ttc.current_sequence(rows, meta, labeled=True), months


def test_next_year_is_a_probability_distribution() -> None:
    if not rotations.available(ARTIFACTS):
        pytest.skip("sin artefacto del modelo 5")
    model = rotations._load(str(ARTIFACTS))
    dist = rotations.next_year(model, "alfalfa", "alfalfa")
    assert abs(sum(dist.values()) - 1) < 1e-9
    # Lo más común después de dos años de alfalfa es seguir con alfalfa.
    assert max(dist, key=dist.get) == "alfalfa"


def test_candidates_follow_the_rules(current_and_months: tuple[list[str], list[str]]) -> None:
    if not rotations.available(ARTIFACTS):
        pytest.skip("sin artefacto del modelo 5")
    current, months = current_and_months
    found = rotations.candidates(ARTIFACTS, current, months, frozenset({"trigo_primavera"}))
    assert found
    current_groups = tuple(rotations.year_group(current[i : i + 12]) for i in range(0, 36, 12))
    probabilities = [p for _, _, p in found]
    assert probabilities == sorted(probabilities, reverse=True)
    for name, sequence, probability in found:
        assert len(sequence) == 36
        groups = tuple(rotations.year_group(sequence[i : i + 12]) for i in range(0, 36, 12))
        assert groups != current_groups  # un cambio real
        assert sum(g in rotations.SOLD for g in groups) >= 2  # dos años con ingreso
        assert "trigo_primavera" not in sequence  # sin comprador: se usa otro grano
        assert probability >= rotations.MIN_PROBABILITY
        assert "Modelo 5" in name


def test_without_artifact_there_are_no_candidates(tmp_path: Path) -> None:
    assert rotations.candidates(tmp_path, ["alfalfa"] * 36, ["2024-01"] * 36, None) == []


def test_ineligible_candidates_are_not_ranked(current_and_months):
    _, months = current_and_months
    allowed = ["alfalfa"] * 36
    calls = []

    def water(crops):
        calls.append(crops)
        assert crops == allowed
        return 500.0

    chosen, _ = ttc.choose_rotation(
        "alfalfa",
        "less_water",
        months,
        None,
        [("eligible", allowed, 0.5)],
        water,
        lambda crops: crops == allowed,
    )
    assert chosen == allowed
    assert calls
