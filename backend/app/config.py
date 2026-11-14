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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    def resolve(self, path: Path) -> Path:
        """Las rutas relativas se resuelven contra /backend."""
        return path if path.is_absolute() else BACKEND_DIR / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
