"""Configuración por variables de entorno. Ningún secreto vive en el código."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
CONTRACT_DIR = APP_DIR / "contract_data"
FIXTURES_DIR = CONTRACT_DIR / "fixtures"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    data_mode: Literal["fixture", "real"] = "fixture"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_origin_regex: str = r"https://.*\.vercel\.app"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_timeout_s: float = 8.0

    power_timeout_s: float = 15.0
    power_cache_dir: Path = Path(".cache/power")

    models_dir: Path = Path("artifacts")
    data_dir: Path = Path("data")

    # Análisis en vivo de un punto (/api/v1/analyze) con Google Earth Engine.
    # EE_SERVICE_ACCOUNT_JSON es el contenido del archivo de llave de una cuenta
    # de servicio; va solo en variables de entorno, nunca en el repositorio.
    # Sin cuenta de servicio y con EE_PROJECT, se usan las credenciales locales
    # de `earthengine authenticate` (solo para la laptop).
    ee_project: str = ""
    ee_service_account_json: str = ""
    live_cache_dir: Path = Path(".cache/live")

    # Guía tutorial (/api/v1/guide). Sin GUIDE_LLM_API_KEY responde la capa
    # determinista; con llave, el modelo de lenguaje redacta y el backend valida.
    guide_llm_api_key: str = ""
    guide_llm_provider: Literal["anthropic", "gemini"] = "anthropic"
    # Vacío = modelo por omisión del proveedor (ver services/guide.py).
    guide_llm_model: str = ""
    guide_timeout_s: float = 8.0
    guide_cache_ttl_s: float = 3600.0
    guide_cache_size: int = 512
    # Peticiones al modelo por sesión y ventana; al pasarse responde la capa determinista.
    guide_session_limit: int = 30
    guide_anonymous_limit: int = 300
    guide_window_s: float = 600.0

    @property
    def guide_llm_configured(self) -> bool:
        return bool(self.guide_llm_api_key)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def earth_engine_configured(self) -> bool:
        return bool(self.ee_project)

    def resolve(self, path: Path) -> Path:
        """Las rutas relativas se resuelven contra /backend."""
        return path if path.is_absolute() else BACKEND_DIR / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
