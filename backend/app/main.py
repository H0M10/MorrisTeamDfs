"""Field Shift API. Arranque: `uvicorn app.main:app`."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import get_registry, router
from app.config import Settings, get_settings
from app.errors import ApiError, api_error_handler
from app.models.loader import ModelRegistry
from app.services.evaluation import contract_version


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Field Shift API",
        version="0.1.0",
        description="Apoyo a la decisión de rotación de cultivos. Equipo The CSC.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=settings.cors_origin_regex or None,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    app.add_exception_handler(ApiError, api_error_handler)
    app.include_router(router)

    @app.get("/health")
    def health(
        current: Annotated[Settings, Depends(get_settings)],
        registry: Annotated[ModelRegistry, Depends(get_registry)],
    ) -> dict[str, Any]:
        return {
            "status": "ok",
            "data_mode": current.data_mode,
            "contract_version": contract_version(),
            "supabase_configured": current.supabase_configured,
            "models": registry.summary(),
        }

    return app


app = create_app()
