"""Análisis en vivo de un punto cualquiera (POST /api/v1/analyze).

1. Campo: círculo de 250 m de radio alrededor del punto (unas 20 ha, del tamaño
   del interior de un pivote). Es una aproximación declarada, no un lindero.
2. Datos: 36 meses de HLS, SMAP, OpenET y CDL más suelo y elevación desde
   Earth Engine (app.sources.earth_engine), y clima diario de NASA POWER.
3. Proceso: las mismas funciones que la tabla de /data-pipeline (color, ET de
   referencia FAO-56, heladas y calor) y el mismo `build_evaluation` del motor,
   con los modelos entrenados. Ninguna cifra se inventa: un mes sin dato queda
   vacío.

Solo en los 48 estados contiguos de EE. UU., donde hay OpenET y CDL. El
resultado se guarda en disco por punto, así que /evaluate, /simulate, /ask y
/share funcionan con su id `live-…` igual que con las parcelas fijas.
"""

from __future__ import annotations

import hashlib
import json
import struct
from datetime import date
from pathlib import Path
from statistics import median
from typing import Any

from app.config import Settings
from app.engine import climate, crop_bank
from app.engine import water_balance as wb
from app.errors import ApiError
from app.schemas.contract import LocalizedText
from app.services import table_to_contract
from app.sources import earth_engine
from app.sources.power import PowerClient

YEARS = [2022, 2023, 2024]  # últimos años completos con OpenET en Earth Engine
RADIUS_M = 250.0
CONUS = (24.5, 49.5, -125.0, -66.9)  # sur, norte, oeste, este

# Grupos de CDL que usa el modelo 3 (AGENTS.md sección 5); igual que data-pipeline/config.py.
CDL_GROUPS: dict[str, tuple[int, ...]] = {
    "alfalfa": (36,),
    "small_grain": (21, 22, 23, 24, 27, 28, 205),
    "corn": (1, 12, 13),
    "fallow": (61,),
}
COLOR_WHITE_REFLECTANCE = 0.30
COLOR_GAMMA = 2.2


def _error(status: int, code: str, es: str, en: str) -> ApiError:
    return ApiError(status, code, es, en)


def not_in_real_mode() -> ApiError:
    return _error(
        503,
        "live_unavailable",
        "El análisis en vivo solo funciona con datos reales (DATA_MODE=real).",
        "Live analysis only works with real data (DATA_MODE=real).",
    )


def live_id(lat: float, lon: float) -> str:
    ns = "n" if lat >= 0 else "s"
    ew = "e" if lon >= 0 else "w"
    return f"live-{abs(lat):.4f}{ns}-{abs(lon):.4f}{ew}"


def is_live(parcel_id: str) -> bool:
    return parcel_id.startswith("live-")


def _cache_path(settings: Settings, parcel_id: str) -> Path:
    return settings.resolve(settings.live_cache_dir) / f"{parcel_id}.json"


def cdl_group(code: int | None) -> str:
    if code is None:
        return "unknown"
    for group, codes in CDL_GROUPS.items():
        if code in codes:
            return group
    return "other"


def to_hex(red: float | None, green: float | None, blue: float | None) -> str | None:
    if red is None or green is None or blue is None:
        return None
    channels = []
    for value in (red, green, blue):
        scaled = min(max(value / COLOR_WHITE_REFLECTANCE, 0.0), 1.0) ** (1 / COLOR_GAMMA)
        channels.append(round(scaled * 255))
    return "#{:02X}{:02X}{:02X}".format(*channels)


def polygon_wkb(ring: list[list[float]]) -> bytes:
    """Polígono WKB de un anillo, en el orden de bytes de Intel (el que lee el motor)."""
    body = struct.pack("<BII", 1, 3, 1) + struct.pack("<I", len(ring))
    return body + b"".join(struct.pack("<2d", x, y) for x, y in ring)


def power_monthly(
    lat: float, lon: float, elevation_m: float, settings: Settings
) -> dict[str, dict[str, Any]]:
    """Clima mensual de POWER: ET de referencia FAO-56, lluvia, temperaturas, heladas y calor."""
    client = PowerClient(settings.resolve(settings.power_cache_dir), timeout_s=60)
    daily = client.daily(lat, lon, date(YEARS[0], 1, 1), date(YEARS[-1], 12, 31))
    v = daily.values
    by_month: dict[str, dict[str, list[float | None]]] = {}
    for i, day in enumerate(daily.dates):
        inputs = [v[k][i] for k in ("T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "WS2M", "T2MDEW")]
        et0 = None
        if all(x is not None for x in inputs):
            tmax, tmin, rs, wind, tdew = inputs
            et0 = wb.et0_penman_monteith(
                tmax,
                tmin,
                rs,
                wind,
                wb.actual_vapor_pressure_from_dewpoint(tdew),
                elevation_m,
                lat,
                day.timetuple().tm_yday,
            )
        bucket = by_month.setdefault(
            f"{day.year:04d}-{day.month:02d}", {"et0": [], "rain": [], "tmax": [], "tmin": []}
        )
        bucket["et0"].append(et0)
        bucket["rain"].append(v["PRECTOTCORR"][i])
        bucket["tmax"].append(v["T2M_MAX"][i])
        bucket["tmin"].append(v["T2M_MIN"][i])

    def total(values: list[float | None]) -> float | None:
        # Un mes con huecos sale vacío, no subestimado (igual que build_table.py).
        return None if any(x is None for x in values) else float(sum(values))  # type: ignore[arg-type]

    def mean(values: list[float | None]) -> float | None:
        present = [x for x in values if x is not None]
        return float(sum(present) / len(present)) if present else None

    counts = {c.month: c for c in climate.count_by_month(daily.dates, v["T2M_MIN"], v["T2M_MAX"])}
    out: dict[str, dict[str, Any]] = {}
    for month, b in by_month.items():
        count = counts.get(month)
        out[month] = {
            "et0_mm": total(b["et0"]),
            "rain_mm": total(b["rain"]),
            "tmax_c": mean(b["tmax"]),
            "tmin_c": mean(b["tmin"]),
            "frost_days": count.frost_days if count else None,
            "heat_days": count.heat_days if count else None,
        }
    return out


def build_rows(
    parcel_id: str,
    ring: list[list[float]],
    monthly: list[dict[str, Any]],
    static: dict[str, Any],
    cdl: dict[int, int | None],
    weather: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Mismas columnas que la tabla de build_table.py, una fila por mes."""
    rgb = [m.get(k) for m in monthly for k in ("red", "green", "blue") if m.get(k) is not None]
    # HLS puede venir en reflectancia (0 a 1) o escalada por 10000.
    divisor = 10000.0 if rgb and median(rgb) > 1.5 else 1.0

    def pct(key: str) -> float | None:
        value = static.get(key)
        return None if value is None else float(value) / 10

    geometry = polygon_wkb(ring)
    rows = []
    for m in sorted(monthly, key=lambda item: item["month"]):
        month = m["month"]
        year, month_num = int(month[:4]), int(month[5:7])
        red, green, blue = (
            None if m.get(k) is None else float(m[k]) / divisor for k in ("red", "green", "blue")
        )
        code = cdl.get(year)
        row: dict[str, Any] = {
            "parcel_id": parcel_id,
            "valley": "live",
            "month": month,
            "hls_n_images": m.get("hls_n_images"),
            "red": red,
            "green": green,
            "blue": blue,
            "hls_color_hex": to_hex(red, green, blue),
            **{
                k: m.get(k)
                for k in (
                    "ndvi",
                    "ndmi",
                    "bsi",
                    "ndti",
                    "smap_sm_surface",
                    "smap_sm_rootzone",
                    "openet_et_mm",
                )
            },
            "year": year,
            "month_num": month_num,
            "elevation_m": static.get("elevation_m"),
            "slope_pct": static.get("slope_pct"),
            "clay_pct": pct("clay_gkg"),
            "sand_pct": pct("sand_gkg"),
            "silt_pct": pct("silt_gkg"),
            "soc_gkg": pct("soc_dgkg"),
            "cdl_code": None if code is None else float(code),
            "crop_group": cdl_group(code),
            "prev_crop_group": cdl_group(cdl.get(year - 1)),
            **weather.get(month, {}),
            "geometry": geometry,
        }
        rows.append(row)
    return rows


def _meta(lat: float, lon: float, drawn: bool = False) -> table_to_contract.ParcelMeta:
    if drawn:
        name = LocalizedText(
            es=f"Área definida en el mapa ({lat:.4f}, {lon:.4f})",
            en=f"Area defined on the map ({lat:.4f}, {lon:.4f})",
        )
    else:
        name = LocalizedText(
            es=f"Punto elegido en el mapa ({lat:.4f}, {lon:.4f})",
            en=f"Point picked on the map ({lat:.4f}, {lon:.4f})",
        )
    return table_to_contract.ParcelMeta(name=name)


def _save(
    path: Path, rows: list[dict[str, Any]], lat: float, lon: float, drawn: bool = False
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serial = [{**r, "geometry": r["geometry"].hex()} for r in rows]
    payload = {"lat": lat, "lon": lon, "drawn": drawn, "rows": serial}
    path.write_text(json.dumps(payload), encoding="utf-8")


def load(
    settings: Settings, parcel_id: str
) -> tuple[list[dict[str, Any]], table_to_contract.ParcelMeta] | None:
    path = _cache_path(settings, parcel_id)
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = [{**r, "geometry": bytes.fromhex(r["geometry"])} for r in data["rows"]]
    return rows, _meta(data["lat"], data["lon"], bool(data.get("drawn")))


MIN_AREA_HA, MAX_AREA_HA = 0.5, 1000.0
MAX_VERTICES = 200


def field_ring(
    lat: float, lon: float, polygon: list[list[float]] | None
) -> tuple[list[list[float]], float, float, str]:
    """Anillo del campo, su centro y el sufijo del id.

    Sin polígono: el círculo de 250 m de siempre (ids de antes, sin sufijo). Con
    polígono (dibujado o una figura predeterminada): se valida y el id lleva una
    huella corta de sus vértices, así cada figura distinta es una parcela distinta.
    """
    if polygon is None:
        return earth_engine.circle_ring(lon, lat, RADIUS_M), lat, lon, ""
    ring = [[round(float(x), 6), round(float(y), 6)] for x, y in polygon]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    if not 4 <= len(ring) <= MAX_VERTICES + 1:
        raise _error(
            422,
            "bad_polygon",
            "El área necesita al menos 3 esquinas (y no más de 200).",
            "The area needs at least 3 corners (and no more than 200).",
        )
    c_lat, c_lon, area = table_to_contract.polygon_center_and_area_ha(ring)
    if not MIN_AREA_HA <= area <= MAX_AREA_HA:
        raise _error(
            422,
            "bad_polygon",
            f"El área mide {area:.1f} ha; debe estar entre {MIN_AREA_HA} y {MAX_AREA_HA:.0f} ha.",
            f"The area is {area:.1f} ha; it must be between {MIN_AREA_HA} and "
            f"{MAX_AREA_HA:.0f} ha.",
        )
    digest = hashlib.sha1(json.dumps(ring).encode()).hexdigest()[:8]
    return ring, c_lat, c_lon, f"-a{digest}"


def _require_cropland(cdl: dict[int, int | None]) -> None:
    """422 si ningún año del historial de USDA es un cultivo del banco."""
    crops = [crop_bank.crop_code_for_cdl(code) for code in cdl.values() if code is not None]
    if not any(crops):
        classes = ", ".join(
            str(code) for code in sorted({c for c in cdl.values() if c is not None})
        )
        raise _error(
            422,
            "not_cropland",
            "Ese punto no parece un campo de cultivo: en 2021–2024 el Cropland Data Layer de "
            f"USDA no marca ningún cultivo del banco ahí (clases {classes or 'sin dato'}). "
            "Elige un campo de riego.",
            "That point does not look like a crop field: in 2021–2024 the USDA Cropland Data "
            f"Layer marks no crop from the bank there (classes {classes or 'no data'}). "
            "Pick an irrigated field.",
        )


def analyze(
    lat: float, lon: float, settings: Settings, polygon: list[list[float]] | None = None
) -> str:
    """Trae y procesa los datos del campo; devuelve el id de la parcela en vivo."""
    ring, lat, lon, suffix = field_ring(lat, lon, polygon)
    south, north, west, east = CONUS
    inside = all(south <= y <= north and west <= x <= east for x, y in ring)
    if not (south <= lat <= north and west <= lon <= east) or not inside:
        raise _error(
            422,
            "outside_coverage",
            "Por ahora el análisis en vivo solo funciona en los 48 estados contiguos de "
            "EE. UU., donde hay datos de agua (OpenET) e historial de cultivos (USDA).",
            "For now live analysis only works in the contiguous United States, where "
            "there is water use (OpenET) and crop history (USDA) data.",
        )
    if not settings.earth_engine_configured:
        raise _error(
            503,
            "live_unavailable",
            "El análisis en vivo no está configurado (falta Earth Engine). "
            "Las parcelas de la lista siguen funcionando.",
            "Live analysis is not configured (Earth Engine is missing). "
            "The fields in the list keep working.",
        )
    parcel_id = live_id(lat, lon) + suffix
    if _cache_path(settings, parcel_id).is_file():
        return parcel_id
    try:
        monthly, static, cdl = earth_engine.fetch_field(
            settings, ring, YEARS, check=_require_cropland
        )
    except earth_engine.EarthEngineError as exc:
        raise _error(
            503,
            "live_unavailable",
            f"Earth Engine no respondió ({str(exc)[:120]}). "
            "Las parcelas de la lista siguen funcionando.",
            f"Earth Engine did not answer ({str(exc)[:120]}). The fields in the list keep working.",
        ) from exc
    _require_cropland(cdl)  # por si la fuente no llamó la revisión
    weather = power_monthly(lat, lon, float(static.get("elevation_m") or 0.0), settings)
    rows = build_rows(parcel_id, ring, monthly, static, cdl, weather)
    if len(rows) != len(YEARS) * 12:
        raise _error(
            503,
            "live_incomplete",
            f"Earth Engine devolvió {len(rows)} meses de {len(YEARS) * 12}.",
            f"Earth Engine returned {len(rows)} months of {len(YEARS) * 12}.",
        )
    _save(_cache_path(settings, parcel_id), rows, lat, lon, drawn=bool(suffix))
    return parcel_id
