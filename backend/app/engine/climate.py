"""Frecuencia histórica de heladas y calor por mes. Funciones puras.

Entradas: series diarias de temperatura mínima y máxima (°C), por ejemplo
T2M_MIN y T2M_MAX de NASA POWER (rejilla de cerca de 50 km: es clima regional,
no de la parcela). Los días sin dato (None o NaN) no se cuentan como evento ni
como día válido.
"""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

FROST_THRESHOLD_C = 0.0  # helada: Tmin <= 0 °C
HEAT_THRESHOLD_C = 35.0  # calor: Tmax >= 35 °C


@dataclass(frozen=True)
class MonthCount:
    """Conteo de un mes concreto (YYYY-MM)."""

    month: str
    frost_days: int
    heat_days: int
    valid_frost_days: int
    valid_heat_days: int


@dataclass(frozen=True)
class MonthFrequency:
    """Frecuencia histórica de un mes del calendario (1 a 12)."""

    calendar_month: int
    years: int
    mean_frost_days: float
    mean_heat_days: float
    frost_fraction: float | None  # días con helada / días con dato
    heat_fraction: float | None


def _valid(value: float | None) -> bool:
    return value is not None and not math.isnan(value)


def count_by_month(
    dates: Sequence[date],
    tmin_c: Sequence[float | None],
    tmax_c: Sequence[float | None],
    frost_threshold_c: float = FROST_THRESHOLD_C,
    heat_threshold_c: float = HEAT_THRESHOLD_C,
) -> list[MonthCount]:
    """Días de helada y de calor por cada mes de la serie, en orden."""
    if not (len(dates) == len(tmin_c) == len(tmax_c)):
        raise ValueError("dates, tmin_c y tmax_c deben tener la misma longitud")
    acc: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0, 0])
    for day, tmin, tmax in zip(dates, tmin_c, tmax_c, strict=True):
        bucket = acc[f"{day.year:04d}-{day.month:02d}"]
        if _valid(tmin):
            bucket[2] += 1
            if tmin <= frost_threshold_c:
                bucket[0] += 1
        if _valid(tmax):
            bucket[3] += 1
            if tmax >= heat_threshold_c:
                bucket[1] += 1
    return [MonthCount(month, *acc[month]) for month in sorted(acc)]


def frequency_by_calendar_month(counts: Sequence[MonthCount]) -> list[MonthFrequency]:
    """Promedio entre años para cada mes del calendario presente en la serie."""
    grouped: dict[int, list[MonthCount]] = defaultdict(list)
    for item in counts:
        grouped[int(item.month[5:7])].append(item)
    out: list[MonthFrequency] = []
    for calendar_month in sorted(grouped):
        items = grouped[calendar_month]
        years = len(items)
        frost = sum(i.frost_days for i in items)
        heat = sum(i.heat_days for i in items)
        valid_frost = sum(i.valid_frost_days for i in items)
        valid_heat = sum(i.valid_heat_days for i in items)
        out.append(
            MonthFrequency(
                calendar_month=calendar_month,
                years=years,
                mean_frost_days=frost / years,
                mean_heat_days=heat / years,
                frost_fraction=frost / valid_frost if valid_frost else None,
                heat_fraction=heat / valid_heat if valid_heat else None,
            )
        )
    return out


def mean_days_per_year(counts: Sequence[MonthCount]) -> tuple[float, float]:
    """Promedio de días de helada y de calor por año, sobre los años de la serie."""
    years = {item.month[:4] for item in counts}
    if not years:
        raise ValueError("la serie está vacía")
    frost = sum(item.frost_days for item in counts)
    heat = sum(item.heat_days for item in counts)
    return frost / len(years), heat / len(years)
