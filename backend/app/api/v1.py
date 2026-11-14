"""Rutas bajo /api/v1. Sin autenticación de usuarios.

Las rutas que devuelven una evaluación responden el diccionario tal cual, sin
pasar por `response_model`: así no aparecen `null` en campos opcionales que el
contrato no admite como nulos. El modelo solo se declara para la documentación.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.engine import crop_bank
from app.engine.crop_traits import TRAITS_SOURCE, TRAITS_TYPE
from app.models.loader import ModelRegistry
from app.models.loader import get_registry as cached_registry
from app.schemas.api import (
    AskRequest,
    AskResponse,
    ErrorResponse,
    EvaluateRequest,
    PilotsResponse,
    SharedEvaluation,
    ShareRequest,
    ShareResponse,
    SimulateRequest,
)
from app.schemas.contract import Evaluation
from app.services import ask as ask_service
from app.services import evaluation as evaluation_service
from app.services.share import ShareStore

router = APIRouter(prefix="/api/v1")

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_registry(settings: SettingsDep) -> ModelRegistry:
    return cached_registry(settings.resolve(settings.models_dir))


def get_share_store(settings: SettingsDep) -> ShareStore:
    return ShareStore(settings)


ShareDep = Annotated[ShareStore, Depends(get_share_store)]

EVALUATION_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"model": Evaluation},
    404: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}
SHARE_RESPONSES: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


@router.get("/pilots", response_model=None, responses={200: {"model": PilotsResponse}})
def pilots(settings: SettingsDep) -> JSONResponse:
    """Parcelas piloto disponibles."""
    return JSONResponse(evaluation_service.list_pilots(settings))


@router.get("/crops", response_model=None)
def crops() -> JSONResponse:
    """Banco de cultivos: coeficientes FAO-56 y rasgos. Todo es supuesto declarado."""
    return JSONResponse(
        {
            "type": crop_bank.BANK_TYPE,
            "source": crop_bank.BANK_SOURCE,
            "date": crop_bank.BANK_DATE,
            "native_scale": crop_bank.BANK_SCALE,
            "reference_note": crop_bank.fao56_reference_note(),
            "traits_type": TRAITS_TYPE,
            "traits_source": TRAITS_SOURCE,
            "crops": [
                {
                    "crop_code": spec.crop_code,
                    "crop_group": spec.crop_group,
                    "name": spec.name,
                    "cdl_codes": list(spec.cdl_codes),
                    "kc": {"ini": spec.kc_ini, "mid": spec.kc_mid, "end": spec.kc_end},
                    "kc_monthly": [
                        crop_bank.kc_for_month(spec.crop_code, month) for month in range(1, 13)
                    ],
                    "root_depth_m": spec.root_depth_m,
                    "depletion_fraction_p": spec.depletion_fraction_p,
                    "sown": spec.sown,
                    "sold": spec.sold,
                    "machinery": list(spec.machinery),
                    "source": spec.source,
                }
                for spec in crop_bank.list_crops()
            ],
        }
    )


@router.post("/evaluate", response_model=None, responses=EVALUATION_RESPONSES)
def evaluate(body: EvaluateRequest, settings: SettingsDep) -> JSONResponse:
    """Evaluación completa según el contrato.

    En modo fixture devuelve el fixture tal cual; si vienen restricciones se
    ignoran aquí (para recalcular con ellas usa /simulate).
    """
    return JSONResponse(evaluation_service.evaluate(body.parcel_id, settings))


@router.post("/simulate", response_model=None, responses=EVALUATION_RESPONSES)
def simulate(body: SimulateRequest, settings: SettingsDep) -> JSONResponse:
    """Recalcula la viabilidad al cambiar restricciones o deslizadores."""
    return JSONResponse(evaluation_service.simulate(body.parcel_id, body.constraints, settings))


@router.post(
    "/ask",
    response_model=None,
    responses={
        200: {"model": AskResponse},
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def ask(body: AskRequest, settings: SettingsDep) -> JSONResponse:
    """Responde con reglas y solo con campos del contrato. Si no sabe, lo dice."""
    if body.constraints is not None:
        evaluation = evaluation_service.simulate(body.parcel_id, body.constraints, settings)
    else:
        evaluation = evaluation_service.evaluate(body.parcel_id, settings)
    return JSONResponse(ask_service.answer(evaluation, body.question, body.lang))


@router.post("/share", response_model=ShareResponse, responses=SHARE_RESPONSES)
def share(body: ShareRequest, store: ShareDep) -> dict[str, str]:
    """Guarda una evaluación y devuelve el token de su enlace."""
    result = body.result.model_dump(mode="json", exclude_unset=True)
    token = store.save(body.input, result)
    return {"token": token, "path": f"/api/v1/share/{token}"}


@router.get("/share/{token}", response_model=SharedEvaluation, responses=SHARE_RESPONSES)
def shared(token: str, store: ShareDep) -> dict[str, Any]:
    """Lee una evaluación compartida. Solo se puede leer conociendo el token."""
    return store.load(token)
