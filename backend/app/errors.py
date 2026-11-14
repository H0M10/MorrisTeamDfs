"""Errores de la API con mensaje en español e inglés."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, es: str, en: str) -> None:
        super().__init__(es)
        self.status_code = status_code
        self.code = code
        self.message = {"es": es, "en": en}


def parcel_not_found(parcel_id: str) -> ApiError:
    return ApiError(
        404,
        "parcel_not_found",
        f"No existe la parcela '{parcel_id}'. Consulta /api/v1/pilots.",
        f"Parcel '{parcel_id}' does not exist. See /api/v1/pilots.",
    )


def real_data_unavailable(parcel_id: str) -> ApiError:
    return ApiError(
        503,
        "real_data_unavailable",
        f"Aún no hay datos reales precalculados para '{parcel_id}'. "
        "Usa DATA_MODE=fixture mientras llegan las tablas de /data-pipeline.",
        f"No precomputed real data for '{parcel_id}' yet. "
        "Use DATA_MODE=fixture until the /data-pipeline tables arrive.",
    )


async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message},
    )
