"""Convierte la tabla mensual de /data-pipeline en una evaluación del contrato.

Entrada: el .parquet que escribe `data-pipeline/build_table.py` (una fila por
parcela y mes) y, si existe, `<parcel_id>.meta.json` con lo que solo sabe una
persona: nombre de la parcela, restricciones del agricultor e historial
declarado. Salida: un diccionario que cumple `contracts/schema.json` con
`data_status: "real"`.

Reglas que se respetan aquí:
- Nada se rellena. Un mes sin imagen sale con índices nulos y un color gris
  declarado como "sin dato"; sin clima no hay cifra de agua.
- Cada cifra lleva su ficha. SMAP (9 km) y POWER (cerca de 50 km) se marcan
  como contexto regional, nunca como dato de la parcela.
- Los productos de reanálisis, asimilación o predicción (POWER, SMAP L4,
  SoilGrids, OpenET) se marcan "modeled"; lo medido por el sensor (HLS, SRTM),
  "observed"; lo que viene de tablas o plantillas del equipo, "assumed".
- Las rotaciones alternativas son plantillas supuestas (ver TEMPLATES). Su agua
  sale del respaldo declarado del modelo 1: balance FAO-56 con el banco de
  cultivos. Las restricciones se evalúan después, en `evaluation.py`.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.engine import crop_bank
from app.engine import water_balance as wb
from app.models.loader import ModelRegistry
from app.schemas.api import ConstraintsIn
from app.schemas.contract import LocalizedText

Row = dict[str, Any]
Card = dict[str, Any]

MONTHS_REQUIRED = 36
REQUIRED_COLUMNS = (
    "parcel_id",
    "month",
    "hls_color_hex",
    "ndvi",
    "ndmi",
    "bsi",
    "ndti",
    "rain_mm",
    "et0_mm",
    "frost_days",
    "heat_days",
    "clay_pct",
    "sand_pct",
    "silt_pct",
    "soc_gkg",
    "elevation_m",
    "slope_pct",
    "geometry",
)
# build_table.py escribe smap_sm_*; se aceptan también los nombres cortos.
ROOTZONE_COLUMNS = ("smap_sm_rootzone", "smap_rootzone")
SURFACE_COLUMNS = ("smap_sm_surface", "smap_surface")

NO_DATA_HEX = "#BDBDBD"  # gris: mes sin imagen HLS sin nubes. No es un color medido.
VAN_BEMMELEN = 1.724  # materia orgánica = carbono orgánico × 1.724
FILTER_T_DAYS = 30.0  # tiempo característico del filtro exponencial (supuesto)
DAYS_PER_MONTH = 30.4375
ALFALFA_DORMANT_MONTHS = {11, 12, 1, 2}  # reposo invernal, hemisferio norte (supuesto)

SCALE_HLS = "30 m"
SCALE_POWER = "cerca de 50 km (contexto regional)"
SCALE_SMAP = "9 km (contexto regional)"
SCALE_SOILGRIDS = "250 m"
SRC_HLS = "HLS L30/S30 (NASA), mediana mensual sin nubes"
SRC_POWER = "NASA POWER (reanálisis), agregado mensual"
SRC_ET0 = "ET de referencia Penman-Monteith FAO-56 con clima de NASA POWER"
SRC_SMAP = "SMAP L4 (SPL4SMGP), media mensual"
SRC_SOILGRIDS = "SoilGrids 2.0 (ISRIC), capa de 0 a 5 cm"
SRC_SRTM = "SRTM (USGS/SRTMGL1_003)"
SRC_FAO_WATER = (
    "Balance FAO-56 (respaldo del modelo 1): Kc del banco de cultivos × ET de referencia "
    "de NASA POWER, menos lluvia efectiva USDA SCS"
)

PIXEL_FOOTPRINTS_M = {
    "hls_landsat": 30,
    "srtm": 30,
    "soilgrids": 250,
    "smap": 9000,
    "nasa_power": 50000,
}
LABELED_FOOTPRINTS_M = {"openet": 30, "usda_cdl": 30}

UNDECLARED_CODES = {
    "sin_registro": {"es": "Sin registro de cultivo", "en": "No crop record"},
    "no_declarado": {"es": "Historial no declarado", "en": "History not declared"},
}

# Rotaciones alternativas: PLANTILLAS SUPUESTAS, un patrón de 12 meses por año.
# Las debe revisar un agrónomo (HUMANO.md H-03). Clave: sistema actual.
_R, _RD = "descanso_rastrojo", "rastrojo_directo"


def _year(default: str, **blocks: str) -> list[str]:
    """_year("x", m4_7="cebada") -> 12 códigos: abril a julio cebada, el resto x."""
    out = [default] * 12
    for span, code in blocks.items():
        start, end = (int(v) for v in span[1:].split("_"))
        for month in range(start, end + 1):
            out[month - 1] = code
    return out


TEMPLATES: dict[str, dict[str, list[list[str]]]] = {
    "alfalfa": {
        "less_water": [
            _year(_R, m4_7="cebada_forrajera"),
            _year(_R, m4_7="avena_forrajera"),
            _year(_R, m4_10="alfalfa", m11_12="alfalfa_dormant"),
        ],
        "more_soil": [
            _year(_RD, m1_7="trigo_invierno", m8_10="avena_veza"),
            _year(_RD, m4_7="cebada_forrajera", m8_10="cubierta_mixta"),
            _year(_RD, m4_10="alfalfa", m11_12="alfalfa_dormant"),
        ],
    },
    "summer_grain": {
        "less_water": [_year("rastrojo_sorgo", m5_10="sorgo_grano")] * 3,
        "more_soil": [
            _year(
                _RD, m5_10="maiz_frijol", m11_12="triticale_cobertura", m1_2="triticale_cobertura"
            )
        ]
        * 3,
    },
}

PALETTE_BY_GROUP = {
    "alfalfa": ("leaf", "solid"),
    "corn": ("leaf", "solid"),
    "cover_crop": ("leaf", "solid"),
    "beans_legumes": ("leaf", "dots"),
    "vegetables": ("leaf", "dots"),
    "root_tuber": ("leaf", "dots"),
    "small_grain": ("straw", "stripe"),
    "sorghum": ("straw", "stripe"),
    "oilseeds": ("straw", "stripe"),
    "cotton": ("straw", "stripe"),
}


class TableError(Exception):
    """La tabla existe pero no alcanza para armar una evaluación honesta."""


class ParcelMeta(BaseModel):
    """`<parcel_id>.meta.json`: lo que declara una persona. Todo es opcional."""

    model_config = ConfigDict(extra="forbid")

    name: LocalizedText | None = None
    constraints: ConstraintsIn | None = None
    # crop_code por mes concreto ("2023-05") o por mes del calendario ("5").
    declared_history: dict[str, str] | None = None
    aquifer_name: LocalizedText | None = None
    aquifer_status_note: LocalizedText | None = None
    # De dónde salen las restricciones si no las dijo el agricultor (supuesto con dato).
    constraints_source: str | None = None
    # Contexto con fuente (mercado, censo, precios): se agrega a la evidencia de cada rotación.
    context_notes: list[LocalizedText] | None = None


# ---------- lectura ----------


def find_tables(data_dir: Path) -> dict[str, Path]:
    """parcel_id -> archivo .parquet que lo contiene."""
    if not data_dir.is_dir():
        return {}
    import pyarrow.parquet as pq  # noqa: PLC0415  (carga diferida)

    found: dict[str, Path] = {}
    for path in sorted(data_dir.glob("*.parquet")):
        try:
            ids = pq.read_table(path, columns=["parcel_id"]).column("parcel_id").unique()
        except Exception:  # archivo ilegible o sin parcel_id: no es una tabla
            continue
        for parcel_id in ids.to_pylist():
            found.setdefault(str(parcel_id), path)
    return found


def read_rows(path: Path, parcel_id: str) -> list[Row]:
    """Los últimos 36 meses de una parcela, en orden, con None donde no hay dato."""
    import pandas as pd  # noqa: PLC0415  (carga diferida)

    table = pd.read_parquet(path)
    missing = [column for column in REQUIRED_COLUMNS if column not in table.columns]
    if missing:
        raise TableError(f"a la tabla le faltan columnas: {', '.join(missing)}")
    table = table[table["parcel_id"] == parcel_id].sort_values("month")
    table = table.drop_duplicates("month").tail(MONTHS_REQUIRED)
    if len(table) < MONTHS_REQUIRED:
        raise TableError(f"la tabla tiene {len(table)} meses de {MONTHS_REQUIRED} para {parcel_id}")
    rows: list[Row] = []
    for record in table.to_dict(orient="records"):
        rows.append(
            {
                key: None
                if value is None or (isinstance(value, float) and math.isnan(value))
                else value
                for key, value in record.items()
            }
        )
    months = [row["month"] for row in rows]
    expected = _consecutive_months(months[0], MONTHS_REQUIRED)
    if months != expected:
        raise TableError("los 36 meses no son consecutivos")
    return rows


def load_meta(data_dir: Path, parcel_id: str) -> ParcelMeta:
    path = data_dir / f"{parcel_id}.meta.json"
    if not path.is_file():
        return ParcelMeta()
    try:
        return ParcelMeta.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except ValueError as exc:
        raise TableError(f"{path.name} no es válido: {exc}") from exc


def _consecutive_months(first: str, count: int) -> list[str]:
    year, month = int(first[:4]), int(first[5:7])
    out = []
    for _ in range(count):
        out.append(f"{year:04d}-{month:02d}")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return out


# ---------- piezas puras ----------


def card(
    value: float | None, unit: str, kind: str, source: str, date: str, scale: str, digits: int = 3
) -> Card:
    """Una cifra con su ficha (MetricValue del contrato)."""
    return {
        "value": None if value is None else round(float(value), digits),
        "unit": unit,
        "type": kind,
        "source": source,
        "date": date,
        "native_scale": scale,
    }


def organic_matter_pct(soc_gkg: float) -> float:
    """Materia orgánica (%) desde carbono orgánico (g/kg), factor de Van Bemmelen 1.724."""
    return soc_gkg / 10 * VAN_BEMMELEN


def saxton_rawls_awc_mm_m(sand_pct: float, clay_pct: float, om_pct: float) -> float:
    """Agua disponible (mm por metro de suelo) por pedotransferencia.

    Saxton y Rawls (2006), Soil Sci. Soc. Am. J. 70:1569-1578, ecuaciones de
    humedad a 33 kPa (capacidad de campo) y 1500 kPa (marchitez). Sin corrección
    por grava, densidad ni salinidad.
    """
    s, c, om = sand_pct / 100, clay_pct / 100, om_pct
    t1500 = (
        -0.024 * s
        + 0.487 * c
        + 0.006 * om
        + 0.005 * s * om
        - 0.013 * c * om
        + 0.068 * s * c
        + 0.031
    )
    wilting = t1500 + (0.14 * t1500 - 0.02)
    t33 = (
        -0.251 * s
        + 0.195 * c
        + 0.011 * om
        + 0.006 * s * om
        - 0.027 * c * om
        + 0.452 * s * c
        + 0.299
    )
    field_capacity = t33 + (1.283 * t33**2 - 0.374 * t33 - 0.015)
    return max(0.0, field_capacity - wilting) * 1000


def parse_wkb_polygon(data: bytes) -> list[list[float]]:
    """Anillo exterior [lon, lat] de un polígono WKB (o del primero de un multipolígono)."""

    def read(offset: int) -> list[list[float]]:
        order = "<" if data[offset] == 1 else ">"
        (kind,) = struct.unpack_from(f"{order}I", data, offset + 1)
        code = kind & 0x1FFFFFFF
        iso, base = code // 1000, code % 1000
        dims = (
            2 + bool(kind & 0x80000000 or iso in (1, 3)) + bool(kind & 0x40000000 or iso in (2, 3))
        )
        body = offset + 5 + (4 if kind & 0x20000000 else 0)  # EWKB puede traer SRID
        if base == 6:  # multipolígono: cuenta (4 bytes) y luego el primer polígono
            return read(body + 4)
        if base != 3:
            raise TableError("la geometría de la parcela no es un polígono")
        # polígono: número de anillos, y por anillo número de puntos y coordenadas
        (n_points,) = struct.unpack_from(f"{order}I", data, body + 4)
        ring = []
        for i in range(n_points):
            x, y = struct.unpack_from(f"{order}2d", data, body + 8 + i * 8 * dims)
            ring.append([round(x, 6), round(y, 6)])
        return ring

    try:
        ring = read(0)
    except (struct.error, IndexError) as exc:
        raise TableError("no se pudo leer la geometría de la parcela") from exc
    if len(ring) < 4:
        raise TableError("el polígono de la parcela tiene menos de 4 vértices")
    return ring


def polygon_center_and_area_ha(ring: list[list[float]]) -> tuple[float, float, float]:
    """Centro (lat, lon) y área en hectáreas con una proyección local plana."""
    points = ring[:-1] if ring[0] == ring[-1] else ring
    lat0 = sum(p[1] for p in points) / len(points)
    lon0 = sum(p[0] for p in points) / len(points)
    radius = 6371008.8
    xy = [
        (
            math.radians(lon - lon0) * math.cos(math.radians(lat0)) * radius,
            math.radians(lat - lat0) * radius,
        )
        for lon, lat in points
    ]
    area = 0.0
    for (x1, y1), (x2, y2) in zip(xy, xy[1:] + xy[:1], strict=True):
        area += x1 * y2 - x2 * y1
    return lat0, lon0, abs(area) / 2 / 10000


def normalize_weights(weights: list[float]) -> list[float] | None:
    """Pesos no negativos escalados para sumar 1.0. None si no hay nada que repartir."""
    clean = [max(0.0, float(w)) for w in weights]
    total = sum(clean)
    if total <= 0 or any(math.isnan(w) for w in clean):
        return None
    return [w / total for w in clean]


def min_max(values: list[float]) -> list[float] | None:
    low, high = min(values), max(values)
    if high - low < 1e-9:
        return None
    return [(v - low) / (high - low) for v in values]


def crop_label(code: str) -> dict[str, str]:
    spec = crop_bank.get_crop_spec(code)
    if spec:
        return spec.name
    if code in UNDECLARED_CODES:
        return UNDECLARED_CODES[code]
    if code.startswith("cdl_"):
        number = code[4:]
        return {
            "es": f"Clase {number} de USDA CDL (fuera del banco de cultivos)",
            "en": f"USDA CDL class {number} (outside the crop bank)",
        }
    return {"es": code.replace("_", " "), "en": code.replace("_", " ")}


def palette(code: str) -> tuple[str, str]:
    spec = crop_bank.get_crop_spec(code)
    if spec is None:
        return "earth", "dots"
    if code.endswith("_dormant") or code == "barbecho":
        return "straw", "dots"
    if spec.crop_group == "fallow":
        return "earth", "hatch"
    return PALETTE_BY_GROUP.get(spec.crop_group, ("leaf", "solid"))


def is_cover(code: str) -> bool:
    """¿El suelo queda cubierto ese mes? Cultivo en pie o rastrojo retenido."""
    spec = crop_bank.get_crop_spec(code)
    return spec is not None and (spec.sown or "rastrojo" in code)


SRC_OPENET_WATER = (
    "Riego neto observado: OpenET (ET real del campo) menos lluvia efectiva USDA SCS "
    "de NASA POWER, promedio por año"
)
SRC_FAO_CALIBRATED = (
    "Balance FAO-56 con el banco de cultivos, calibrado con el riego observado de esta "
    "parcela por OpenET (factor {factor:.2f})"
)


def water_scale(source: str) -> str:
    return "30 m (campo)" if "OpenET" in source else SCALE_POWER


def observed_net_irrigation(rows: list[Row]) -> float | None:
    """Riego neto medio por año con ET real de OpenET. None si falta algún mes."""
    totals: dict[str, float] = {}
    for row in rows:
        et, rain = row.get("openet_et_mm"), row.get("rain_mm")
        if et is None or rain is None:
            return None
        year = row["month"][:4]
        need = wb.net_irrigation_requirement(float(et), wb.effective_rain_usda(float(rain)))
        totals[year] = totals.get(year, 0.0) + need
    return sum(totals.values()) / len(totals) if totals else None


def annual_water_mm(
    months: list[str], crops: list[str], et0: list[float | None], rain: list[float | None]
) -> float | None:
    """Riego neto medio por año (mm) con FAO-56. None si falta clima o un Kc."""
    kc = [
        crop_bank.kc_for_month(code, int(month[5:7]))
        for code, month in zip(crops, months, strict=True)
    ]
    if any(v is None for v in [*kc, *et0, *rain]):
        return None
    per_year = wb.annual_net_irrigation(months, et0, rain, kc)  # type: ignore[arg-type]
    return sum(per_year.values()) / len(per_year)


# ---------- armado ----------


def _first(row: Row, names: tuple[str, ...]) -> float | None:
    for name in names:
        if row.get(name) is not None:
            return float(row[name])
    return None


def current_sequence(rows: list[Row], meta: ParcelMeta, labeled: bool) -> list[str]:
    codes: list[str] = []
    for row in rows:
        month_num = int(row["month"][5:7])
        if labeled:
            cdl = row.get("cdl_code")
            code = "sin_registro"
            if cdl is not None:
                code = crop_bank.crop_code_for_cdl(int(cdl)) or f"cdl_{int(cdl)}"
            if code == "alfalfa" and month_num in ALFALFA_DORMANT_MONTHS:
                code = "alfalfa_dormant"
        else:
            history = meta.declared_history or {}
            code = history.get(row["month"]) or history.get(str(month_num), "no_declarado")
        codes.append(code)
    return codes


def root_zone_index(
    rows: list[Row], awc_mm_m: float | None, crops: list[str]
) -> tuple[list[float | None], str, str]:
    """Índice relativo de agua en raíces (0 a 1) con su fuente y escala."""
    rootzone = [_first(row, ROOTZONE_COLUMNS) for row in rows]
    surface = [_first(row, SURFACE_COLUMNS) for row in rows]
    note = " Índice relativo al rango de estos 36 meses, no una humedad medida."
    if all(v is not None for v in rootzone):
        scaled = min_max(rootzone)  # type: ignore[arg-type]
        if scaled:
            return list(scaled), "SMAP L4, humedad en zona de raíces." + note, SCALE_SMAP
    if all(v is not None for v in surface):
        days = [i * DAYS_PER_MONTH for i in range(len(rows))]
        filtered = wb.exponential_filter(surface, days, FILTER_T_DAYS)  # type: ignore[arg-type]
        scaled = min_max(filtered)
        if scaled:
            source = (
                f"Filtro exponencial recursivo (T = {FILTER_T_DAYS:.0f} días, supuesto) sobre "
                "SMAP superficial." + note
            )
            return list(scaled), source, SCALE_SMAP
    et0 = [row["et0_mm"] for row in rows]
    rain = [row["rain_mm"] for row in rows]
    kc = [
        crop_bank.kc_for_month(code, int(row["month"][5:7]))
        for code, row in zip(crops, rows, strict=True)
    ]
    if awc_mm_m and all(v is not None for v in [*et0, *rain, *kc]):
        taw = wb.total_available_water(awc_mm_m, 1.0)
        balance = wb.monthly_water_balance(et0, rain, kc, taw)  # type: ignore[arg-type]
        values: list[float | None] = [wb.root_zone_index(m.depletion_mm, taw) for m in balance]
        source = "Balance FAO-56 mensual sin riego, 1 m de raíces (supuesto). Índice relativo."
        return values, source, "parcela (modelo con clima de cerca de 50 km)"
    return [None] * len(rows), "Sin SMAP ni clima completo: no se calcula.", SCALE_SMAP


def attention_weights(rows: list[Row], registry: ModelRegistry) -> list[float] | None:
    """Pesos de atención del modelo 3, normalizados a suma 1. None si está en respaldo."""
    model = registry.get("model_3_crop_history_gru")
    if model.status != "trained":
        return None
    try:
        import numpy as np  # noqa: PLC0415

        weights: list[float] = []
        for start in range(0, MONTHS_REQUIRED, 12):
            block = rows[start : start + 12]
            values = [[row.get(k) for k in ("ndvi", "ndmi", "bsi", "ndti")] for row in block]
            sequence = [
                [0.0 if v is None else float(v) for v in month] + [float(None in month)]
                for month in values
            ]
            _, attention = model.predict(np.asarray([sequence], dtype=np.float32))
            weights.extend(float(w) for w in np.asarray(attention)[0])
        return normalize_weights(weights)
    except Exception:
        return None  # un fallo de inferencia no tumba la evaluación: queda sin pesos


def moisture_intervals(
    rows: list[Row], registry: ModelRegistry, labeled: bool
) -> list[dict[str, float]] | None:
    """Intervalos CQR al 90 % del modelo 4 en regiones etiquetadas. None si no aplica."""
    model = registry.get("model_4_moisture_cqr")
    if not labeled or model.status != "trained":
        return None
    try:
        import numpy as np  # noqa: PLC0415

        extra = (model.metrics or {}).get("extra") or {}
        has_keys = all(k in extra for k in ("balance_slope", "balance_intercept", "conformal_q"))
        has_weather = not any(
            row.get(col) is None
            for row in rows
            for col in ("et0_mm", "rain_mm", "tmax_c", "tmin_c")
        )
        if not (has_keys and has_weather):
            return None
        taw = float(extra.get("taw_mm_assumed", 150.0))
        balance = wb.monthly_water_balance(
            [float(r["et0_mm"]) for r in rows],
            [float(r["rain_mm"]) for r in rows],
            [1.0] * len(rows),
            taw_mm=taw,
        )
        rzi = [wb.root_zone_index(m.depletion_mm, taw) for m in balance]
        features = np.asarray(
            [
                [
                    int(r["month"][5:7]),
                    float(r["et0_mm"]),
                    float(r["rain_mm"]),
                    float(r["tmax_c"]),
                    float(r["tmin_c"]),
                    0.0 if r.get("ndvi") is None else float(r["ndvi"]),
                    rzi[i],
                ]
                for i, r in enumerate(rows)
            ],
            dtype=np.float32,
        )
        quantiles = np.asarray(model.predict(features), dtype=np.float64)
        if quantiles.shape != (len(rows), 2):
            return None
        slope = float(extra["balance_slope"])
        intercept = float(extra["balance_intercept"])
        q_hat = float(extra["conformal_q"])
        confidence = round(float(extra.get("target_coverage", 0.9)), 2)
        intervals: list[dict[str, float]] = []
        for i in range(len(rows)):
            base = slope * rzi[i] + intercept
            low = max(0.0, round(base + float(quantiles[i, 0]) - q_hat, 3))
            high = min(1.0, round(max(low, base + float(quantiles[i, 1]) + q_hat), 3))
            intervals.append({"lower": low, "upper": high, "confidence": confidence})
        return intervals
    except Exception:
        return None


def build_evaluation(
    rows: list[Row], meta: ParcelMeta, registry: ModelRegistry, contract_version: str
) -> dict[str, Any]:
    """Evaluación real sin restricciones aplicadas (todas las rotaciones abiertas)."""
    first = rows[0]
    parcel_id = str(first["parcel_id"])
    months = [row["month"] for row in rows]
    period = f"{months[0][:4]}-{months[-1][:4]}"
    labeled = any(row.get("cdl_code") is not None for row in rows)
    region_mode = "labeled" if labeled else "unlabeled"
    n_years = MONTHS_REQUIRED / 12

    # --- parcela y suelo ---
    geometry = first["geometry"]
    ring = parse_wkb_polygon(bytes(geometry))
    lat, lon, area = polygon_center_and_area_ha(ring)
    om = organic_matter_pct(first["soc_gkg"]) if first["soc_gkg"] is not None else None
    if first.get("awc_mm_m") is not None:
        awc = float(first["awc_mm_m"])
        awc_card = card(
            awc,
            "mm/m",
            "observed",
            "USDA SSURGO, capacidad de agua disponible",
            "2024",
            "polígono de suelo",
        )
    elif None not in (first["sand_pct"], first["clay_pct"], om):
        awc = saxton_rawls_awc_mm_m(first["sand_pct"], first["clay_pct"], om)
        awc_card = card(
            awc,
            "mm/m",
            "modeled",
            "Pedotransferencia de Saxton y Rawls (2006) sobre textura y materia orgánica "
            "de SoilGrids",
            "2020",
            SCALE_SOILGRIDS,
            1,
        )
    else:
        awc = None
        awc_card = card(
            None, "mm/m", "modeled", "Sin textura de suelo: no se calcula", "2020", SCALE_SOILGRIDS
        )

    def soil(key: str) -> Card:
        return card(first[key], "%", "modeled", SRC_SOILGRIDS, "2020", SCALE_SOILGRIDS, 1)

    et0 = [row["et0_mm"] for row in rows]
    rain = [row["rain_mm"] for row in rows]
    frost = [row["frost_days"] for row in rows]
    heat = [row["heat_days"] for row in rows]

    def per_year(values: list[float | None]) -> float | None:
        return None if any(v is None for v in values) else sum(values) / n_years  # type: ignore[arg-type]

    frost_year, heat_year = per_year(frost), per_year(heat)
    frost_src = "NASA POWER, días con temperatura mínima de 0 °C o menos"
    heat_src = "NASA POWER, días con temperatura máxima de 35 °C o más"

    current = current_sequence(rows, meta, labeled)
    index_values, index_source, index_scale = root_zone_index(rows, awc, current)
    attention = attention_weights(rows, registry)
    intervals = moisture_intervals(rows, registry, labeled)
    last_moisture = next(
        (
            (row["month"], value)
            for row in reversed(rows)
            if (value := _first(row, ROOTZONE_COLUMNS) or _first(row, SURFACE_COLUMNS)) is not None
        ),
        (months[-1], None),
    )

    # --- línea de tiempo ---
    timeline = []
    for i, row in enumerate(rows):
        month = row["month"]
        color = row["hls_color_hex"]
        has_image = isinstance(color, str) and len(color) == 7
        color = color.upper() if has_image else NO_DATA_HEX
        hls_source = SRC_HLS if has_image else "Sin imagen HLS sin nubes este mes: no hay dato"
        openet = row.get("openet_et_mm")
        kc = crop_bank.kc_for_month(current[i], int(month[5:7]))
        if openet is not None:
            et_card = card(
                openet, "mm", "modeled", "OpenET, conjunto mensual de modelos", month, "30 m", 1
            )
        elif kc is not None and row["et0_mm"] is not None:
            et_card = card(
                wb.crop_et(row["et0_mm"], kc),
                "mm",
                "modeled",
                "FAO-56: Kc del banco de cultivos × ET de referencia de NASA POWER",
                month,
                SCALE_POWER,
                1,
            )
        else:
            et_card = card(
                row["et0_mm"],
                "mm",
                "modeled",
                SRC_ET0 + " (ET de referencia, no del cultivo: no hay cultivo conocido)",
                month,
                SCALE_POWER,
                1,
            )
        moisture = _first(row, ROOTZONE_COLUMNS) or _first(row, SURFACE_COLUMNS)
        soil_moisture_card = card(moisture, "m3/m3", "modeled", SRC_SMAP, month, SCALE_SMAP)
        if moisture is not None and intervals is not None:
            soil_moisture_card["interval"] = intervals[i]
            soil_moisture_card["source"] = SRC_SMAP + "; intervalo CQR al 90 % (Modelo 4)"
        timeline.append(
            {
                "month": month,
                "hls_color_hex": color,
                "hls_rgb": [int(color[j : j + 2], 16) for j in (1, 3, 5)],
                "crop_code": current[i],
                "crop_label": crop_label(current[i]),
                "indices": {
                    key: card(
                        row[key] if has_image else None,
                        "index",
                        "observed",
                        hls_source,
                        month,
                        SCALE_HLS,
                    )
                    for key in ("ndvi", "ndmi", "bsi", "ndti")
                },
                "rain_mm": card(row["rain_mm"], "mm", "modeled", SRC_POWER, month, SCALE_POWER, 1),
                "et_mm": et_card,
                "root_zone_water_index": card(
                    index_values[i],
                    "relative_index_0_1",
                    "modeled",
                    index_source,
                    month,
                    index_scale,
                ),
                "soil_moisture": soil_moisture_card,
                "frost_days": card(
                    row["frost_days"], "days", "modeled", frost_src, month, SCALE_POWER, 0
                ),
                "heat_days": card(
                    row["heat_days"], "days", "modeled", heat_src, month, SCALE_POWER, 0
                ),
                "attention_weight": None
                if attention is None
                else card(
                    attention[i],
                    "attention_weight",
                    "modeled",
                    "Modelo 3: meses que más pesaron en la lectura (no es explicación causal)",
                    month,
                    "30 m (parcela)",
                    6,
                ),
            }
        )

    # --- rotaciones ---
    system = "alfalfa" if any(code.startswith("alfalfa") for code in current) else "summer_grain"
    sequences = {"current": current}
    for strategy_id, years in TEMPLATES[system].items():
        sequences[strategy_id] = [
            years[i // 12][int(months[i][5:7]) - 1] for i in range(MONTHS_REQUIRED)
        ]
    water = {key: annual_water_mm(months, crops, et0, rain) for key, crops in sequences.items()}
    water_source = dict.fromkeys(water, SRC_FAO_WATER)
    observed = observed_net_irrigation(rows)
    if observed is not None and water["current"]:
        # La rotación actual usa el agua medida; las alternativas, FAO-56 calibrado con la
        # misma parcela para que la comparación sea justa.
        factor = observed / water["current"]
        for key, value in water.items():
            if key != "current" and value is not None:
                water[key] = value * factor
                water_source[key] = SRC_FAO_CALIBRATED.format(factor=factor)
        water["current"] = observed
        water_source["current"] = SRC_OPENET_WATER
    model_2_trained = labeled and registry.get("model_2_prior_crop_effect").status == "trained"
    strategies = [
        _strategy(
            key,
            sequences[key],
            months,
            water,
            water_source,
            frost_year,
            heat_year,
            period,
            labeled,
            model_2_trained=model_2_trained,
        )
        for key in ("current", "less_water", "more_soil")
    ]
    for strategy in strategies:
        strategy["evidence_card"]["supporting_evidence"].extend(
            note.model_dump() for note in meta.context_notes or []
        )

    footprints = dict(PIXEL_FOOTPRINTS_M) | (LABELED_FOOTPRINTS_M if labeled else {})
    name = (
        meta.name.model_dump()
        if meta.name
        else {"es": f"Parcela {parcel_id}", "en": f"Field {parcel_id}"}
    )
    unknown_aquifer = {
        "es": "Sin información de acuífero verificada por una persona.",
        "en": "No aquifer information verified by a person.",
    }
    return {
        "contract_version": contract_version,
        "data_status": "real",
        "parcel": {
            "id": parcel_id,
            "name": name,
            "center": {"lat": round(lat, 5), "lon": round(lon, 5)},
            "polygon_wgs84": ring,
            "area_ha": card(
                area,
                "ha",
                "modeled",
                "Área del polígono de la parcela (proyección local plana)",
                months[-1],
                "polígono de la parcela",
                2,
            ),
            "region_mode": region_mode,
            "native_pixel_footprints_m": footprints,
            "soil_profile": {
                "clay_pct": soil("clay_pct"),
                "sand_pct": soil("sand_pct"),
                "silt_pct": soil("silt_pct"),
                "organic_matter_pct": card(
                    om,
                    "%",
                    "modeled",
                    SRC_SOILGRIDS + "; carbono orgánico × 1.724 (factor de Van Bemmelen, supuesto)",
                    "2020",
                    SCALE_SOILGRIDS,
                    2,
                ),
                "awc_mm_m": awc_card,
                "elevation_m": card(
                    first["elevation_m"], "m", "observed", SRC_SRTM, "2000", "30 m", 1
                ),
                "slope_pct": card(first["slope_pct"], "%", "observed", SRC_SRTM, "2000", "30 m", 2),
            },
            "climate_summary": {
                "annual_et0_mm": card(
                    per_year(et0), "mm/yr", "modeled", SRC_ET0, period, SCALE_POWER, 0
                ),
                "annual_precip_mm": card(
                    per_year(rain), "mm/yr", "modeled", SRC_POWER, period, SCALE_POWER, 0
                ),
                "frost_days_year": card(
                    frost_year, "days/yr", "modeled", frost_src, period, SCALE_POWER, 1
                ),
                "heat_days_year": card(
                    heat_year, "days/yr", "modeled", heat_src, period, SCALE_POWER, 1
                ),
            },
            "basin_context": {
                "aquifer_name": (
                    meta.aquifer_name.model_dump() if meta.aquifer_name else unknown_aquifer
                ),
                "scale_note": {
                    "es": "SMAP (9 km) y el clima de NASA POWER (cerca de 50 km) describen "
                    "la región, "
                    "no las condiciones de esta parcela.",
                    "en": "SMAP (9 km) and NASA POWER climate (about 50 km) describe the region, "
                    "not the conditions of this field.",
                },
                "smap_regional_moisture": card(
                    last_moisture[1], "m3/m3", "modeled", SRC_SMAP, last_moisture[0], SCALE_SMAP
                ),
                "aquifer_status_note": (
                    meta.aquifer_status_note.model_dump()
                    if meta.aquifer_status_note
                    else unknown_aquifer
                ),
            },
        },
        "timeline": timeline,
        "constraints": {
            "evaluated_before_models": True,
            "max_water_mm_year": card(
                None,
                "mm/yr",
                "assumed",
                "Sin declarar: el agricultor aún no indicó su límite de agua",
                months[-1],
                "parcela",
            ),
            "available_machinery": [],
            "crops_without_buyer": [],
            "planting_window": {
                "start_month": 1,
                "end_month": 12,
                "label": {"es": "Sin declarar (todo el año)", "en": "Not declared (all year)"},
            },
        },
        "has_viable_options": True,
        "strategies": strategies,
        "models": registry.report(region_mode),  # type: ignore[arg-type]
    }


TITLES = {
    "current": {"es": "Rotación actual", "en": "Current rotation"},
    "less_water": {"es": "Alternativa con menos agua", "en": "Lower-water alternative"},
    "more_soil": {"es": "Alternativa con más suelo cubierto", "en": "More-soil-cover alternative"},
}
TEMPLATE_SOURCE = "Plantilla de rotación del equipo (supuesto, pendiente de revisión agronómica)"


def _strategy(
    key: str,
    crops: list[str],
    months: list[str],
    water: dict[str, float | None],
    water_source: dict[str, str],
    frost_year: float | None,
    heat_year: float | None,
    period: str,
    labeled: bool,
    *,
    model_2_trained: bool = False,
) -> dict[str, Any]:
    is_current = key == "current"
    distinct = [
        c
        for c in dict.fromkeys(crops)
        if (s := crop_bank.get_crop_spec(c)) and s.sown and not c.endswith("_dormant")
    ]
    names = {lang: ", ".join(crop_label(c)[lang] for c in distinct) for lang in ("es", "en")}
    title = {
        lang: TITLES[key][lang] + (f": {names[lang]}" if names[lang] else "")
        for lang in ("es", "en")
    }
    mine, base = water[key], water["current"]
    delta = None if mine is None or base is None else mine - base
    known = all(crop_bank.get_crop_spec(c) is not None for c in crops)
    # Sin cultivo conocido no se sabe si el suelo estuvo cubierto: queda sin dato, no en cero.
    cover = sum(is_cover(c) for c in crops) if known else None
    sequence_type = ("modeled" if labeled else "assumed") if is_current else "assumed"
    sequence_source = (
        ("USDA CDL, clase anual de cultivo" if labeled else "Historial declarado por el agricultor")
        if is_current
        else TEMPLATE_SOURCE
    )
    water_text = "sin dato" if mine is None else f"{mine:.0f} mm"
    water_text_en = "no data" if mine is None else f"{mine:.0f} mm"

    if is_current:
        why = {
            "es": "Es lo que la parcela tuvo en estos 36 meses; sirve de base para comparar.",
            "en": "It is what the field had over these 36 months; it is the baseline "
            "for comparison.",
        }
    elif key == "less_water":
        gain = "" if delta is None else f" ({delta:+.0f} mm por año frente a la actual)"
        gain_en = "" if delta is None else f" ({delta:+.0f} mm per year versus the current one)"
        why = {
            "es": f"Usa cultivos con menor demanda de agua según FAO-56{gain}.",
            "en": f"It uses crops with lower water demand according to FAO-56{gain_en}.",
        }
    else:
        why = {
            "es": f"Mantiene el suelo cubierto {cover} de 36 meses con cultivos de cobertura "
            "y rastrojo.",
            "en": f"It keeps the soil covered {cover} of 36 months with cover crops and residue.",
        }
    evidence = [
        {
            "es": f"Riego neto estimado: {water_text} por año. "
            + crop_bank.fao56_reference_note()["es"],
            "en": f"Estimated net irrigation: {water_text_en} per year. "
            + crop_bank.fao56_reference_note()["en"],
        }
    ]
    benefits = [
        {
            "es": f"Suelo cubierto {cover} de 36 meses según la secuencia.",
            "en": f"Soil covered {cover} of 36 months according to the sequence.",
        }
        if known
        else {
            "es": "Sin historial de cultivos no se puede decir cuántos meses estuvo "
            "cubierto el suelo.",
            "en": "Without a crop history the months of soil cover cannot be stated.",
        }
    ]
    if model_2_trained:
        prior_source = (
            "Sin evidencia local: en la validación por valle (Modelo 2, -6.3 %) el cultivo "
            "anterior no mejoró la predicción de vigor"
        )
        prior_gap = {
            "es": "Sin evidencia local del efecto del cultivo anterior: en la validación por "
            "valle (Modelo 2, -6.3 % frente a la línea base) agregar el cultivo previo no "
            "mejoró la predicción de vigor.",
            "en": "No local evidence on the prior-crop effect: in unseen-valley validation "
            "(Model 2, -6.3% vs baseline) adding the prior crop did not improve vigor "
            "prediction.",
        }
    else:
        prior_source = "Sin evidencia local (modelo 2 en respaldo)"
        prior_gap = {
            "es": "No hay evidencia local del efecto del cultivo anterior (modelo 2 en respaldo).",
            "en": "There is no local evidence on the prior-crop effect (model 2 in fallback).",
        }
    if water_source[key] == SRC_OPENET_WATER:
        water_gap = {
            "es": "La ET real viene de OpenET (30 m en parcela), pero la lluvia efectiva viene "
            "del clima regional de NASA POWER (cerca de 50 km).",
            "en": "Actual ET comes from OpenET (30 m on field), while effective rainfall comes "
            "from NASA POWER regional climate (about 50 km).",
        }
    elif "calibrado" in water_source[key]:
        water_gap = {
            "es": "El agua de la alternativa usa la tabla FAO-56 calibrada con el OpenET de la "
            "parcela (30 m) y el clima regional de cerca de 50 km.",
            "en": "Alternative water use comes from the FAO-56 table calibrated with the "
            "field's OpenET (30 m) and regional climate at about 50 km.",
        }
    else:
        water_gap = {
            "es": "El agua sale de una tabla de referencia y del clima regional de cerca de "
            "50 km, no de mediciones en la parcela.",
            "en": "Water comes from a reference table and regional climate at about 50 km, "
            "not from measurements in the field.",
        }
    gaps = [prior_gap, water_gap]
    if not is_current:
        gaps.append(
            {
                "es": "La secuencia es una plantilla del equipo: no considera precios, plagas "
                "ni tu suelo.",
                "en": "The sequence is a team template: it ignores prices, pests and your soil.",
            }
        )
    if any(crop_bank.get_crop_spec(c) is None for c in crops):
        gaps.append(
            {
                "es": "Hay meses sin cultivo conocido: no se puede estimar el agua de esta "
                "rotación.",
                "en": "Some months have no known crop: water for this rotation cannot be "
                "estimated.",
            }
        )
    risks = [
        {
            "es": "Un técnico local debe confirmar fechas de siembra, variedades y comprador "
            "antes de decidir.",
            "en": "A local advisor should confirm planting dates, varieties and buyer before "
            "deciding.",
        }
    ]

    palette_items = []
    for month, code in zip(months, crops, strict=True):
        token, pattern = palette(code)
        palette_items.append(
            {
                "month": month,
                "crop_code": code,
                "crop_label": crop_label(code),
                "palette_token": token,
                "pattern": pattern,
            }
        )
    return {
        "id": key,
        "title": title,
        "viable": True,
        "constraint_evaluation": {
            "water_ok": True,
            "buyer_ok": True,
            "machinery_ok": True,
            "calendar_ok": True,
        },
        "rejection_reason": None,
        "sequence_36m": palette_items,
        "metrics": {
            "annual_water_mm": card(
                mine,
                "mm/yr",
                "modeled",
                water_source[key],
                period,
                water_scale(water_source[key]),
                0,
            ),
            "water_delta_vs_current_mm": card(
                delta,
                "mm/yr",
                "modeled",
                water_source[key],
                period,
                water_scale(water_source[key]),
                0,
            ),
            "soil_cover_months_36m": card(
                cover, "months", sequence_type, sequence_source, period, "parcela", 0
            ),
            "prior_crop_vigor_delta_pct": card(None, "%", "assumed", prior_source, period, "30 m"),
            "frost_risk_days_year": card(
                frost_year,
                "days/yr",
                "modeled",
                "NASA POWER, días con mínima de 0 °C o menos",
                period,
                SCALE_POWER,
                1,
            ),
            "heat_risk_days_year": card(
                heat_year,
                "days/yr",
                "modeled",
                "NASA POWER, días con máxima de 35 °C o más",
                period,
                SCALE_POWER,
                1,
            ),
        },
        "evidence_card": {
            "why_suggested": why,
            "supporting_evidence": evidence,
            "benefits": benefits,
            "information_gaps": gaps,
            "local_review_risks": risks,
        },
    }


UNDECLARED_GAP = {
    "es": "El agricultor aún no declaró sus restricciones: la viabilidad no se ha evaluado.",
    "en": "The grower has not declared constraints yet: viability has not been evaluated.",
}
