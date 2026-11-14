"""Arma la evaluación que pide el contrato.

DATA_MODE=fixture: /evaluate sirve el fixture tal cual. /simulate toma el mismo
fixture y solo vuelve a pasar las rotaciones por el evaluador de restricciones
con lo que declaró el agricultor; todo sigue marcado como dato de ejemplo.

DATA_MODE=real: usará las tablas precalculadas de /data-pipeline. Hoy no
existen, así que responde 503 en vez de inventar.
"""

from __future__ import annotations

import copy
import json
from functools import lru_cache
from typing import Any

from app.config import FIXTURES_DIR, Settings
from app.engine.constraints import (
    MONTH_NAMES,
    FarmerConstraints,
    RotationPlan,
    evaluate_rotations,
)
from app.errors import parcel_not_found, real_data_unavailable
from app.schemas.api import ConstraintsIn

EvaluationDict = dict[str, Any]


@lru_cache
def load_fixtures() -> dict[str, EvaluationDict]:
    """Los fixtures del contrato, por id de parcela."""
    out: dict[str, EvaluationDict] = {}
    for path in sorted(FIXTURES_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        out[data["parcel"]["id"]] = data
    return out


def contract_version() -> str:
    return next(iter(load_fixtures().values()))["contract_version"]


def list_pilots(settings: Settings) -> dict[str, Any]:
    if settings.data_mode == "real":
        # Aún no hay parcelas con datos reales precalculados.
        return {"data_status": "real", "pilots": []}
    pilots = [
        {
            "id": data["parcel"]["id"],
            "name": data["parcel"]["name"],
            "center": data["parcel"]["center"],
            "area_ha": data["parcel"]["area_ha"],
            "region_mode": data["parcel"]["region_mode"],
            "has_viable_options": data["has_viable_options"],
        }
        for data in load_fixtures().values()
    ]
    return {"data_status": "fixture", "pilots": pilots}


def evaluate(parcel_id: str, settings: Settings) -> EvaluationDict:
    if settings.data_mode == "real":
        raise real_data_unavailable(parcel_id)
    fixture = load_fixtures().get(parcel_id)
    if fixture is None:
        raise parcel_not_found(parcel_id)
    return fixture


def simulate(parcel_id: str, declared: ConstraintsIn, settings: Settings) -> EvaluationDict:
    """Recalcula viabilidad con las restricciones declaradas. No toca otras cifras."""
    evaluation = copy.deepcopy(evaluate(parcel_id, settings))
    return apply_constraints(evaluation, declared)


def crop_labels(evaluation: EvaluationDict) -> dict[str, dict[str, str]]:
    labels: dict[str, dict[str, str]] = {}
    for strategy in evaluation["strategies"]:
        for item in strategy["sequence_36m"]:
            labels.setdefault(item["crop_code"], item["crop_label"])
    return labels


def apply_constraints(evaluation: EvaluationDict, declared: ConstraintsIn) -> EvaluationDict:
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
            annual_water_mm=strategy["metrics"]["annual_water_mm"]["value"],
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
        "source": "Restricción declarada por el agricultor"
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
    evaluation["has_viable_options"] = result.has_viable_options
    return evaluation
