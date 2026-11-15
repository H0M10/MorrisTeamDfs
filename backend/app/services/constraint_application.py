"""Aplica los veredictos del motor al contrato, sin ejecutar modelos."""

from typing import Any

from app.engine.constraints import MONTH_NAMES, FarmerConstraints, RotationPlan, evaluate_rotations
from app.schemas.api import ConstraintsIn

EvaluationDict = dict[str, Any]


def crop_labels(evaluation: EvaluationDict) -> dict[str, dict[str, str]]:
    labels: dict[str, dict[str, str]] = {}
    for strategy in evaluation["strategies"]:
        for item in strategy["sequence_36m"]:
            labels.setdefault(item["crop_code"], item["crop_label"])
    return labels


def apply_constraints(
    evaluation: EvaluationDict,
    declared: ConstraintsIn,
    source: str | None = None,
    *,
    water_peaks: dict[str, float | None] | None = None,
) -> EvaluationDict:
    """Pasa las tres rotaciones por el evaluador y actualiza la evaluación en sitio."""
    window = declared.planting_window
    farmer = FarmerConstraints(
        max_water_mm_year=declared.max_water_mm_year,
        available_machinery=frozenset(declared.available_machinery),
        crops_without_buyer=frozenset(declared.crops_without_buyer),
        planting_start_month=window.start_month,
        planting_end_month=window.end_month,
    )
    plans = [
        RotationPlan(
            rotation_id=strategy["id"],
            annual_water_mm=(
                water_peaks[strategy["id"]]
                if water_peaks is not None
                else strategy["metrics"]["annual_water_mm"]["value"]
            ),
            months=[(item["month"], item["crop_code"]) for item in strategy["sequence_36m"]],
        )
        for strategy in evaluation["strategies"]
    ]
    result = evaluate_rotations(plans, farmer, labels=crop_labels(evaluation))

    is_fixture = evaluation["data_status"] == "fixture"
    constraints = evaluation["constraints"]
    constraints["evaluated_before_models"] = True
    constraints["max_water_mm_year"] = {
        **constraints["max_water_mm_year"],
        "value": declared.max_water_mm_year,
        "type": "fixture" if is_fixture else "assumed",
        "source": (source or "Restricción declarada por el agricultor")
        + (" (simulación sobre datos de ejemplo)" if is_fixture else ""),
    }
    constraints["available_machinery"] = list(declared.available_machinery)
    constraints["crops_without_buyer"] = list(declared.crops_without_buyer)
    constraints["planting_window"] = {
        "start_month": window.start_month,
        "end_month": window.end_month,
        "label": {
            lang: f"{names[window.start_month - 1].capitalize()} {joiner} "
            f"{names[window.end_month - 1]}"
            for lang, names, joiner in (
                ("es", MONTH_NAMES["es"], "a"),
                ("en", MONTH_NAMES["en"], "to"),
            )
        },
    }

    for strategy, verdict in zip(evaluation["strategies"], result.verdicts, strict=True):
        strategy["viable"] = verdict.viable
        strategy["constraint_evaluation"] = {
            "water_ok": verdict.water_ok,
            "buyer_ok": verdict.buyer_ok,
            "machinery_ok": verdict.machinery_ok,
            "calendar_ok": verdict.calendar_ok,
        }
        strategy["rejection_reason"] = verdict.rejection_reason
        if water_peaks is not None and not verdict.water_ok and verdict.rejection_reason:
            verdict.rejection_reason["es"] = verdict.rejection_reason["es"].rstrip(".") + (
                "; se comprueba el año de mayor consumo, no el promedio."
            )
            verdict.rejection_reason["en"] = verdict.rejection_reason["en"].rstrip(".") + (
                "; the highest-use year is checked, not the average."
            )
    evaluation["has_viable_options"] = result.has_viable_options
    return evaluation
