"""Enlaces compartibles en Supabase (AGENTS.md sección 7).

La API habla con Supabase solo por dos funciones RPC (ver /supabase/migrations):
    create_shared_evaluation(p_token, p_input, p_result)
    get_shared_evaluation(p_token)
Con la seguridad a nivel de fila activada y sin políticas de lectura, la única
forma de leer una evaluación es conocer su token.

Si Supabase no está configurado o no responde, se lanza un ApiError 503 claro.
El resto de la API no depende de este módulo.
"""

from __future__ import annotations

import re
import secrets
from typing import Any

import httpx

from app.config import Settings
from app.errors import ApiError

TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def share_unavailable(detail: str) -> ApiError:
    return ApiError(
        503,
        "share_unavailable",
        f"Guardar y compartir no está disponible ahora ({detail}). "
        "Lo demás de la herramienta sigue funcionando.",
        f"Saving and sharing is unavailable right now ({detail}). "
        "The rest of the tool keeps working.",
    )


def share_not_found() -> ApiError:
    return ApiError(
        404,
        "share_not_found",
        "No existe una evaluación compartida con ese enlace.",
        "There is no shared evaluation for that link.",
    )


class ShareStore:
    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None) -> None:
        self._settings = settings
        self._transport = transport

    def _rpc(self, function: str, payload: dict[str, Any]) -> Any:
        settings = self._settings
        if not settings.supabase_configured:
            raise share_unavailable("Supabase no está configurado / Supabase is not configured")
        url = f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function}"
        headers = {"apikey": settings.supabase_anon_key}
        if settings.supabase_anon_key.count(".") == 2:
            headers["Authorization"] = f"Bearer {settings.supabase_anon_key}"
        try:
            with httpx.Client(
                timeout=settings.supabase_timeout_s, transport=self._transport
            ) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException as exc:
            raise share_unavailable("Supabase no respondió a tiempo / Supabase timed out") from exc
        except httpx.HTTPStatusError as exc:
            raise share_unavailable(f"Supabase: HTTP {exc.response.status_code}") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise share_unavailable("no hay conexión con Supabase / cannot reach Supabase") from exc

    def save(self, input_data: dict[str, Any], result: dict[str, Any]) -> str:
        token = secrets.token_urlsafe(16)
        self._rpc(
            "create_shared_evaluation",
            {"p_token": token, "p_input": input_data, "p_result": result},
        )
        return token

    def load(self, token: str) -> dict[str, Any]:
        if not TOKEN_PATTERN.fullmatch(token):
            raise share_not_found()
        rows = self._rpc("get_shared_evaluation", {"p_token": token})
        if not isinstance(rows, list) or not rows:
            raise share_not_found()
        row = rows[0]
        return {
            "token": token,
            "created_at": str(row.get("created_at", "")),
            "input": row.get("input") or {},
            "result": row.get("result") or {},
        }
