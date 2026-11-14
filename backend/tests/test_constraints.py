"""Restricciones primero: una prueba por restricción y el caso sin opción viable."""

from __future__ import annotations

import pytest

from app.engine.constraints import (
    FarmerConstraints,
    RotationPlan,
    evaluate_rotation,
    evaluate_rotations,
    month_in_window,
    planting_events,
)
from tests.conftest import FIXTURE_NAMES, load_fixture


def months(*blocks: tuple[str, int], start_year: int = 2023) -> list[tuple[str, str]]:
    """months(("barbecho", 4), ("maiz", 6)) -> meses consecutivos desde enero."""
    out: list[tuple[str, str]] = []
    index = 0
    for code, length in blocks:
        for _ in range(length):
            out.append((f"{start_year + index // 12:04d}-{index % 12 + 1:02d}", code))
            index += 1
    return out


def farmer(**overrides: object) -> FarmerConstraints:
    values: dict[str, object] = {
        "max_water_mm_year": 700.0,
        "available_machinery": frozenset({"pivote_central", "sembradora_grano", "empacadora"}),
        "crops_without_buyer": frozenset(),
        "planting_start_month": 3,
        "planting_end_month": 9,
    }
    values.update(overrides)
    return FarmerConstraints(**values)  # type: ignore[arg-type]


# barbecho ene-abr, maíz sembrado en mayo, rastrojo nov-dic
MAIZE = RotationPlan("current", 600.0, months(("barbecho", 4), ("maiz", 6), ("rastrojo_maiz", 2)))


def test_rotation_that_meets_everything_is_viable() -> None:
    verdict = evaluate_rotation(MAIZE, farmer())
    assert verdict.viable
    assert (verdict.water_ok, verdict.buyer_ok, verdict.machinery_ok, verdict.calendar_ok) == (
        True,
        True,
        True,
        True,
    )
    assert verdict.rejection_reason is None


# ---------- agua ----------


def test_water_over_the_limit_rejects() -> None:
    verdict = evaluate_rotation(MAIZE, farmer(max_water_mm_year=599.0))
    assert not verdict.viable
    assert not verdict.water_ok
    assert (verdict.buyer_ok, verdict.machinery_ok, verdict.calendar_ok) == (True, True, True)
    assert verdict.rejection_reason is not None
    assert "600 mm" in verdict.rejection_reason["es"]
    assert "599 mm" in verdict.rejection_reason["es"]
    assert "600 mm" in verdict.rejection_reason["en"]


def test_water_exactly_at_the_limit_passes() -> None:
    assert evaluate_rotation(MAIZE, farmer(max_water_mm_year=600.0)).water_ok


def test_missing_water_estimate_is_not_assumed_ok() -> None:
    plan = RotationPlan("current", None, MAIZE.months)
    verdict = evaluate_rotation(plan, farmer())
    assert not verdict.water_ok
    assert not verdict.viable
    assert "no hay estimación de agua" in verdict.rejection_reason["es"]  # type: ignore[index]


# ---------- comprador ----------


def test_crop_without_buyer_rejects() -> None:
    verdict = evaluate_rotation(MAIZE, farmer(crops_without_buyer=frozenset({"maiz"})))
    assert not verdict.buyer_ok
    assert not verdict.viable
    assert verdict.crops_without_buyer == ("maiz",)
    assert (verdict.water_ok, verdict.machinery_ok, verdict.calendar_ok) == (True, True, True)
    assert "no hay comprador para maiz" in verdict.rejection_reason["es"]  # type: ignore[index]


def test_buyer_list_matches_crop_group() -> None:
    """Decir 'alfalfa' también cubre la alfalfa en latencia."""
    plan = RotationPlan("current", 500.0, months(("alfalfa_dormant", 2), ("alfalfa", 8)))
    verdict = evaluate_rotation(plan, farmer(crops_without_buyer=frozenset({"alfalfa"})))
    assert not verdict.buyer_ok


def test_cover_crop_does_not_need_buyer() -> None:
    plan = RotationPlan("more_soil", 300.0, months(("barbecho", 3), ("avena_cubierta", 4)))
    verdict = evaluate_rotation(plan, farmer(crops_without_buyer=frozenset({"avena_cubierta"})))
    assert verdict.buyer_ok


def test_reason_uses_given_crop_labels() -> None:
    labels = {"maiz": {"es": "Maíz de grano", "en": "Grain corn"}}
    verdict = evaluate_rotation(
        MAIZE, farmer(crops_without_buyer=frozenset({"maiz"})), labels=labels
    )
    assert "Maíz de grano" in verdict.rejection_reason["es"]  # type: ignore[index]
    assert "Grain corn" in verdict.rejection_reason["en"]  # type: ignore[index]


# ---------- maquinaria ----------


def test_missing_seeder_rejects() -> None:
    verdict = evaluate_rotation(MAIZE, farmer(available_machinery=frozenset({"pivote_central"})))
    assert not verdict.machinery_ok
    assert not verdict.viable
    assert (verdict.water_ok, verdict.buyer_ok, verdict.calendar_ok) == (True, True, True)
    assert "falta maquinaria: sembradora" in verdict.rejection_reason["es"]  # type: ignore[index]
    assert "missing machinery: seeder" in verdict.rejection_reason["en"]  # type: ignore[index]


def test_any_alternative_satisfies_a_requirement() -> None:
    machinery = frozenset({"riego_compuerta", "sembradora_convencional"})
    assert evaluate_rotation(MAIZE, farmer(available_machinery=machinery)).machinery_ok


def test_hay_needs_baler() -> None:
    plan = RotationPlan("current", 500.0, months(("alfalfa_dormant", 2), ("alfalfa", 8)))
    machinery = frozenset({"pivote_central", "sembradora_grano"})
    verdict = evaluate_rotation(plan, farmer(available_machinery=machinery))
    assert not verdict.machinery_ok
    assert "empacadora" in verdict.rejection_reason["es"]  # type: ignore[index]


def test_fallow_needs_no_machinery() -> None:
    plan = RotationPlan("current", 0.0, months(("barbecho", 12)))
    assert evaluate_rotation(plan, farmer(available_machinery=frozenset())).viable


# ---------- ventana de siembra ----------


def test_planting_outside_window_rejects() -> None:
    verdict = evaluate_rotation(MAIZE, farmer(planting_start_month=6, planting_end_month=9))
    assert not verdict.calendar_ok
    assert not verdict.viable
    assert verdict.plantings_outside_window == (("2023-05", "maiz"),)
    assert (verdict.water_ok, verdict.buyer_ok, verdict.machinery_ok) == (True, True, True)
    reason = verdict.rejection_reason
    assert reason is not None
    assert "siembra fuera de la ventana de junio a septiembre" in reason["es"]
    assert "mayo 2023" in reason["es"]
    assert "May 2023" in reason["en"]


def test_planting_events_ignore_first_month_and_same_group() -> None:
    plan = months(("alfalfa_dormant", 2), ("alfalfa", 8), ("alfalfa_dormant", 2), ("maiz", 3))
    # La alfalfa ya estaba; salir de latencia no es sembrar. Solo el maíz se siembra.
    assert planting_events(plan) == [("2024-01", "maiz")]


def test_residue_is_not_a_planting() -> None:
    assert planting_events(months(("maiz", 6), ("rastrojo_maiz", 3), ("barbecho", 3))) == []


@pytest.mark.parametrize(
    ("month", "start", "end", "expected"),
    [(3, 3, 9, True), (9, 3, 9, True), (10, 3, 9, False), (2, 3, 9, False)]
    + [(11, 10, 2, True), (1, 10, 2, True), (2, 10, 2, True), (5, 10, 2, False)],
)
def test_month_in_window(month: int, start: int, end: int, expected: bool) -> None:
    assert month_in_window(month, start, end) is expected


def test_window_can_wrap_around_december() -> None:
    plan = RotationPlan("more_soil", 300.0, months(("barbecho", 9), ("trigo_invierno", 3)))
    assert planting_events(plan.months) == [("2023-10", "trigo_invierno")]
    assert evaluate_rotation(plan, farmer(planting_start_month=9, planting_end_month=2)).calendar_ok
    assert not evaluate_rotation(plan, farmer()).calendar_ok  # ventana marzo a septiembre


# ---------- cultivo desconocido y entradas inválidas ----------


def test_unknown_crop_cannot_be_verified() -> None:
    plan = RotationPlan("less_water", 100.0, months(("barbecho", 3), ("quinoa", 5)))
    verdict = evaluate_rotation(plan, farmer())
    assert not verdict.viable
    assert verdict.unknown_crops == ("quinoa",)
    assert "quinoa" in verdict.rejection_reason["es"]  # type: ignore[index]


def test_invalid_constraints_are_rejected() -> None:
    with pytest.raises(ValueError):
        farmer(max_water_mm_year=-1.0)
    with pytest.raises(ValueError):
        farmer(planting_start_month=13)


# ---------- ninguna opción viable ----------


def test_no_viable_options_when_all_three_fail() -> None:
    plans = [
        RotationPlan("current", 795.0, months(("alfalfa_dormant", 2), ("alfalfa", 10))),
        RotationPlan("less_water", 545.0, months(("barbecho", 3), ("cebada_forrajera", 5))),
        RotationPlan("more_soil", 610.0, months(("barbecho", 9), ("trigo_invierno", 3))),
    ]
    result = evaluate_rotations(plans, farmer(max_water_mm_year=320.0))
    assert result.has_viable_options is False
    assert [v.viable for v in result.verdicts] == [False, False, False]
    for verdict in result.verdicts:
        assert verdict.rejection_reason is not None
        assert verdict.rejection_reason["es"].startswith("Descartada: ")
        assert verdict.rejection_reason["en"].startswith("Ruled out: ")


def test_one_viable_rotation_is_enough() -> None:
    plans = [
        RotationPlan("current", 795.0, MAIZE.months),
        RotationPlan("less_water", 545.0, MAIZE.months),
        RotationPlan("more_soil", 900.0, MAIZE.months),
    ]
    result = evaluate_rotations(plans, farmer(max_water_mm_year=600.0))
    assert result.has_viable_options is True
    assert [v.viable for v in result.verdicts] == [False, True, False]


# ---------- el motor contra los fixtures ----------

# Banderas del fixture ya alineadas con el motor (v0.1.1); este set debe seguir vacío.
KNOWN_FIXTURE_DIVERGENCES: set[tuple[str, str, str]] = set()


def engine_flags(name: str) -> dict[tuple[str, str, str], tuple[bool, bool]]:
    data = load_fixture(name)
    declared = data["constraints"]
    constraints = FarmerConstraints(
        max_water_mm_year=declared["max_water_mm_year"]["value"],
        available_machinery=frozenset(declared["available_machinery"]),
        crops_without_buyer=frozenset(declared["crops_without_buyer"]),
        planting_start_month=declared["planting_window"]["start_month"],
        planting_end_month=declared["planting_window"]["end_month"],
    )
    out: dict[tuple[str, str, str], tuple[bool, bool]] = {}
    for strategy in data["strategies"]:
        plan = RotationPlan(
            strategy["id"],
            strategy["metrics"]["annual_water_mm"]["value"],
            [(m["month"], m["crop_code"]) for m in strategy["sequence_36m"]],
        )
        verdict = evaluate_rotation(plan, constraints)
        for flag, expected in strategy["constraint_evaluation"].items():
            out[(name, strategy["id"], flag)] = (getattr(verdict, flag), expected)
    return out


def test_engine_reproduces_fixture_flags_except_known_divergences() -> None:
    divergences = set()
    for name in FIXTURE_NAMES:
        for key, (got, expected) in engine_flags(name).items():
            if got != expected:
                divergences.add(key)
    assert divergences == KNOWN_FIXTURE_DIVERGENCES


def test_no_viable_fixture_stays_without_viable_options_under_the_engine() -> None:
    flags = engine_flags("no_viable_options")
    for strategy_id in ("current", "less_water", "more_soil"):
        assert flags[("no_viable_options", strategy_id, "water_ok")][0] is False
