"""Cliente de NASA POWER (serie diaria en un punto). Sin llave.

Es la única fuente en vivo de la API; lo demás llega precalculado desde
/data-pipeline. POWER tiene una rejilla de cerca de 50 km: es clima regional y
la ficha de cada cifra debe decirlo.

- Máximo 20 parámetros por petición: las listas largas se parten solas.
- Caché en disco: una respuesta ya descargada no vuelve a pedirse.
- Tiempo de espera: si POWER no responde se lanza PowerError; nunca se
  devuelven valores inventados.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import httpx

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
MAX_PARAMETERS = 20
DEFAULT_FILL_VALUE = -999.0
NATIVE_SCALE = "cerca de 50 km (rejilla de 0.5° x 0.625°)"
SOURCE = "NASA POWER (Prediction Of Worldwide Energy Resources), comunidad AG"

# Lo que necesita el motor: Penman-Monteith, lluvia, heladas y calor.
ENGINE_PARAMETERS = (
    "T2M_MAX",
    "T2M_MIN",
    "T2MDEW",
    "WS2M",
    "ALLSKY_SFC_SW_DWN",
    "PRECTOTCORR",
)


class PowerError(Exception):
    """POWER no respondió o respondió algo que no se puede usar."""


@dataclass(frozen=True)
class PowerDaily:
    latitude: float
    longitude: float
    dates: tuple[date, ...]
    values: dict[str, tuple[float | None, ...]]  # None = sin dato
    units: dict[str, str]
    source: str = SOURCE
    native_scale: str = NATIVE_SCALE


def _chunks(items: Sequence[str], size: int) -> list[list[str]]:
    return [list(items[i : i + size]) for i in range(0, len(items), size)]


class PowerClient:
    def __init__(
        self,
        cache_dir: Path,
        timeout_s: float = 15.0,
        transport: httpx.BaseTransport | None = None,
        community: str = "AG",
    ) -> None:
        self.cache_dir = cache_dir
        self.timeout_s = timeout_s
        self.community = community
        self._transport = transport

    def daily(
        self,
        latitude: float,
        longitude: float,
        start: date,
        end: date,
        parameters: Sequence[str] = ENGINE_PARAMETERS,
    ) -> PowerDaily:
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError("coordenadas fuera de rango")
        if end < start:
            raise ValueError("la fecha final es anterior a la inicial")
        names = list(dict.fromkeys(p.strip().upper() for p in parameters if p.strip()))
        if not names:
            raise ValueError("falta al menos un parámetro")

        series: dict[str, dict[str, float]] = {}
        units: dict[str, str] = {}
        for chunk in _chunks(names, MAX_PARAMETERS):
            payload = self._fetch(latitude, longitude, start, end, chunk)
            fill = payload.get("header", {}).get("fill_value", DEFAULT_FILL_VALUE)
            try:
                block = payload["properties"]["parameter"]
            except (KeyError, TypeError) as exc:
                raise PowerError("POWER respondió sin el bloque properties.parameter") from exc
            for name in chunk:
                if name not in block:
                    raise PowerError(f"POWER no devolvió el parámetro {name}")
                series[name] = {
                    day: (None if value is None or value == fill else float(value))
                    for day, value in block[name].items()
                }
                units[name] = payload.get("parameters", {}).get(name, {}).get("units", "")

        days = sorted(series[names[0]])
        return PowerDaily(
            latitude=latitude,
            longitude=longitude,
            dates=tuple(datetime.strptime(day, "%Y%m%d").date() for day in days),
            values={name: tuple(series[name].get(day) for day in days) for name in names},
            units=units,
        )

    def _fetch(
        self, latitude: float, longitude: float, start: date, end: date, chunk: list[str]
    ) -> dict:
        params = {
            "parameters": ",".join(chunk),
            "community": self.community,
            "latitude": f"{latitude:.4f}",
            "longitude": f"{longitude:.4f}",
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        }
        key = hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest()[:32]
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                cache_file.unlink(missing_ok=True)  # caché dañado: se vuelve a pedir

        try:
            with httpx.Client(timeout=self.timeout_s, transport=self._transport) as client:
                response = client.get(BASE_URL, params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.TimeoutException as exc:
            raise PowerError(f"POWER no respondió en {self.timeout_s:.0f} s") from exc
        except httpx.HTTPStatusError as exc:
            raise PowerError(f"POWER respondió con error {exc.response.status_code}") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise PowerError(f"No se pudo leer la respuesta de POWER: {exc}") from exc

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(payload), encoding="utf-8")
        return payload
