"""Arma la evaluación que pide el contrato.

DATA_MODE=fixture: /evaluate sirve el fixture tal cual. /simulate toma el mismo
fixture y solo vuelve a pasar las rotaciones por el evaluador de restricciones
con lo que declaró el agricultor; todo sigue marcado como dato de ejemplo.

DATA_MODE=real: arma la evaluación desde las tablas .parquet de /data-pipeline
que haya en DATA_DIR (ver table_to_contract.py). Si no hay tabla, o no alcanza
para una evaluación honesta, responde 503 en vez de inventar.
"""

from __future__ import annotations

import copy
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import FIXTURES_DIR, Settings
from app.engine.constraints import (
    MONTH_NAMES,
    FarmerConstraints,
    RotationPlan,
    evaluate_rotations,
)
from app.errors import ApiError, parcel_not_found, real_data_incomplete, real_data_unavailable
from app.models.loader import get_registry
from app.schemas.api import ConstraintsIn
from app.services import live, table_to_contract

EvaluationDict = dict[str, Any]

FIXTURE_TO_REAL_PARCEL: dict[str, str] = {
    "dv-nv-fixture-01": "dv-nv-01",
}


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


def _data_signature(data_dir: Path) -> tuple[tuple[str, int, int], ...]:
    """Nombre, tamaño y fecha de cada archivo de datos: si algo cambia, la lista se rehace."""
    if not data_dir.is_dir():
        return ()
    return tuple(
        (path.name, path.stat().st_size, path.stat().st_mtime_ns)
        for path in sorted(data_dir.iterdir())
        if path.suffix in {".parquet", ".json"}
    )


_PILOTS_CACHE: dict[tuple[Any, ...], dict[str, Any]] = {}


def list_pilots(settings: Settings) -> dict[str, Any]:
    if settings.data_mode == "real":
        data_dir = _data_dir(settings)
        key = (str(data_dir), str(settings.resolve(settings.models_dir)), _data_signature(data_dir))
        if key not in _PILOTS_CACHE:
            _PILOTS_CACHE.clear()
            _PILOTS_CACHE[key] = _real_pilots(settings)
        return copy.deepcopy(_PILOTS_CACHE[key])
    return {
        "data_status": "fixture",
        "pilots": [_summary(data) for data in load_fixtures().values()],
    }


def _real_pilots(settings: Settings) -> dict[str, Any]:
    """Resumen de cada parcela real. Evalúa todas: se guarda en memoria."""
    pilots = []
    for parcel_id in sorted(table_to_contract.find_tables(_data_dir(settings))):
        try:
            pilots.append(_summary(evaluate(parcel_id, settings)))
        except ApiError:
            continue  # tabla incompleta: no se ofrece como piloto
    return {"data_status": "real", "pilots": pilots}


def _summary(data: EvaluationDict) -> dict[str, Any]:
    return {
        "id": data["parcel"]["id"],
        "name": data["parcel"]["name"],
        "center": data["parcel"]["center"],
        "area_ha": data["parcel"]["area_ha"],
        "region_mode": data["parcel"]["region_mode"],
        "has_viable_options": data["has_viable_options"],
    }


def _data_dir(settings: Settings) -> Path:
    return settings.resolve(settings.data_dir)


def parcel_rows(
    parcel_id: str, settings: Settings
) -> tuple[list[dict[str, Any]], table_to_contract.ParcelMeta]:
    """Las 36 filas mensuales y la meta de una parcela real (fija o en vivo)."""
    if live.is_live(parcel_id):
        loaded = live.load(settings, parcel_id)
        if loaded is None:
            raise parcel_not_found(parcel_id)
        return loaded
    data_dir = _data_dir(settings)
    tables = table_to_contract.find_tables(data_dir)
    if not tables:
        raise real_data_unavailable(parcel_id)
    if parcel_id not in tables and FIXTURE_TO_REAL_PARCEL.get(parcel_id) in tables:
        parcel_id = FIXTURE_TO_REAL_PARCEL[parcel_id]
    if parcel_id not in tables:
        raise parcel_not_found(parcel_id)
    try:
        rows = table_to_contract.read_rows(tables[parcel_id], parcel_id)
        return rows, table_to_contract.load_meta(data_dir, parcel_id)
    except table_to_contract.TableError as exc:
        raise real_data_incomplete(parcel_id, str(exc)) from exc


def _real_base(
    parcel_id: str, settings: Settings
) -> tuple[EvaluationDict, table_to_contract.ParcelMeta]:
    """Evaluación real desde la tabla de /data-pipeline, sin restricciones aplicadas."""
    if live.is_live(parcel_id):
        loaded = live.load(settings, parcel_id)
        if loaded is None:
            raise parcel_not_found(parcel_id)
        rows, meta = loaded
        registry = get_registry(settings.resolve(settings.models_dir))
        try:
            return table_to_contract.build_evaluation(
                rows, meta, registry, contract_version()
            ), meta
        except table_to_contract.TableError as exc:
            raise real_data_incomplete(parcel_id, str(exc)) from exc
    data_dir = _data_dir(settings)
    tables = table_to_contract.find_tables(data_dir)
    if not tables:
        raise real_data_unavailable(parcel_id)
    if parcel_id not in tables and FIXTURE_TO_REAL_PARCEL.get(parcel_id) in tables:
        parcel_id = FIXTURE_TO_REAL_PARCEL[parcel_id]
    if parcel_id not in tables:
        raise parcel_not_found(parcel_id)
    try:
        rows = table_to_contract.read_rows(tables[parcel_id], parcel_id)
        meta = table_to_contract.load_meta(data_dir, parcel_id)
        registry = get_registry(settings.resolve(settings.models_dir))
        return table_to_contract.build_evaluation(rows, meta, registry, contract_version()), meta
    except table_to_contract.TableError as exc:
        raise real_data_incomplete(parcel_id, str(exc)) from exc


def evaluate(parcel_id: str, settings: Settings) -> EvaluationDict:
    if settings.data_mode == "real":
        evaluation, meta = _real_base(parcel_id, settings)
        if meta.constraints is not None:
            return apply_constraints(evaluation, meta.constraints, meta.constraints_source)
        # Sin restricciones declaradas no hay nada que descartar; se dice en cada ficha.
        for strategy in evaluation["strategies"]:
            strategy["evidence_card"]["information_gaps"].append(table_to_contract.UNDECLARED_GAP)
        return evaluation
    fixture = load_fixtures().get(parcel_id)
    if fixture is None:
        raise parcel_not_found(parcel_id)
    return fixture


def simulate(parcel_id: str, declared: ConstraintsIn, settings: Settings) -> EvaluationDict:
    """Recalcula viabilidad con las restricciones declaradas. No toca otras cifras."""
    if settings.data_mode == "real":
        evaluation, _ = _real_base(parcel_id, settings)
        return apply_constraints(evaluation, declared)
    evaluation = copy.deepcopy(evaluate(parcel_id, settings))
    return apply_constraints(evaluation, declared)


def crop_labels(evaluation: EvaluationDict) -> dict[str, dict[str, str]]:
    labels: dict[str, dict[str, str]] = {}
    for strategy in evaluation["strategies"]:
        for item in strategy["sequence_36m"]:
            labels.setdefault(item["crop_code"], item["crop_label"])
    return labels


def apply_constraints(
    evaluation: EvaluationDict, declared: ConstraintsIn, source: str | None = None
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
    evaluation["has_viable_options"] = result.has_viable_options
    return evaluation
