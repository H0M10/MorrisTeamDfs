"""Balance de agua FAO-56 mensual. Funciones puras, sin lectura de datos.

Referencia: Allen, Pereira, Raes y Smith (1998), FAO Irrigation and Drainage
Paper 56. Unidades: mm de lámina, °C, MJ/m²/día, m/s, kPa.

Supuestos que la ficha de cada cifra debe declarar:
- Paso mensual: el estrés (Ks) se calcula con el agotamiento al inicio del mes.
- No se modela escurrimiento: toda la lluvia entra al suelo o percola.
- La lluvia efectiva usa el método USDA SCS (el de CROPWAT).
- El índice de agua en raíces es relativo (0 a 1), no una humedad medida.
"""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass

SOLAR_CONSTANT = 0.0820  # MJ/m²/min
STEFAN_BOLTZMANN = 4.903e-9  # MJ/K⁴/m²/día
ALBEDO = 0.23


# ---------- ET de referencia (Penman-Monteith, FAO-56 ec. 6) ----------


def saturation_vapor_pressure(temp_c: float) -> float:
    """e°(T) en kPa (ec. 11)."""
    return 0.6108 * math.exp(17.27 * temp_c / (temp_c + 237.3))


def actual_vapor_pressure_from_rh(
    tmax_c: float, tmin_c: float, rh_max: float, rh_min: float
) -> float:
    """ea en kPa a partir de humedad relativa máxima y mínima en % (ec. 17)."""
    return (
        saturation_vapor_pressure(tmin_c) * rh_max / 100
        + saturation_vapor_pressure(tmax_c) * rh_min / 100
    ) / 2


def actual_vapor_pressure_from_dewpoint(tdew_c: float) -> float:
    """ea en kPa a partir del punto de rocío (ec. 14). POWER lo da como T2MDEW."""
    return saturation_vapor_pressure(tdew_c)


def extraterrestrial_radiation(latitude_deg: float, day_of_year: int) -> float:
    """Ra en MJ/m²/día (ec. 21)."""
    phi = math.radians(latitude_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * day_of_year / 365)
    delta = 0.409 * math.sin(2 * math.pi * day_of_year / 365 - 1.39)
    ws = math.acos(max(-1.0, min(1.0, -math.tan(phi) * math.tan(delta))))
    return (
        24
        * 60
        / math.pi
        * SOLAR_CONSTANT
        * dr
        * (ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws))
    )


def et0_penman_monteith(
    tmax_c: float,
    tmin_c: float,
    solar_radiation: float,
    wind_2m: float,
    actual_vapor_pressure: float,
    elevation_m: float,
    latitude_deg: float,
    day_of_year: int,
) -> float:
    """ET de referencia diaria en mm/día (ec. 6), con flujo de calor del suelo G = 0."""
    tmean = (tmax_c + tmin_c) / 2
    pressure = 101.3 * ((293 - 0.0065 * elevation_m) / 293) ** 5.26
    gamma = 0.000665 * pressure
    delta = 4098 * saturation_vapor_pressure(tmean) / (tmean + 237.3) ** 2
    es = (saturation_vapor_pressure(tmax_c) + saturation_vapor_pressure(tmin_c)) / 2

    ra = extraterrestrial_radiation(latitude_deg, day_of_year)
    rso = (0.75 + 2e-5 * elevation_m) * ra
    rns = (1 - ALBEDO) * solar_radiation
    cloud_ratio = min(solar_radiation / rso, 1.0) if rso > 0 else 0.0
    rnl = (
        STEFAN_BOLTZMANN
        * ((tmax_c + 273.16) ** 4 + (tmin_c + 273.16) ** 4)
        / 2
        * (0.34 - 0.14 * math.sqrt(actual_vapor_pressure))
        * (1.35 * cloud_ratio - 0.35)
    )
    rn = rns - rnl

    numerator = 0.408 * delta * rn + gamma * 900 / (tmean + 273) * wind_2m * (
        es - actual_vapor_pressure
    )
    return max(0.0, numerator / (delta + gamma * (1 + 0.34 * wind_2m)))


# ---------- Demanda del cultivo ----------


def crop_et(et0_mm: float, kc: float) -> float:
    """ETc = Kc × ET0 (ec. 58)."""
    if et0_mm < 0 or kc < 0:
        raise ValueError("ET0 y Kc no pueden ser negativos")
    return kc * et0_mm


def effective_rain_usda(rain_mm: float) -> float:
    """Lluvia efectiva mensual, método USDA SCS (el de CROPWAT)."""
    if rain_mm < 0:
        raise ValueError("la lluvia no puede ser negativa")
    if rain_mm <= 250:
        return rain_mm * (125 - 0.2 * rain_mm) / 125
    return 125 + 0.1 * rain_mm


def net_irrigation_requirement(etc_mm: float, effective_rain_mm: float) -> float:
    """Riego neto del mes: lo que la lluvia efectiva no cubre."""
    return max(0.0, etc_mm - effective_rain_mm)


def gross_irrigation_requirement(net_mm: float, efficiency: float) -> float:
    """Riego bruto: el neto entre la eficiencia de aplicación (0 a 1]."""
    if not 0 < efficiency <= 1:
        raise ValueError("la eficiencia debe estar entre 0 y 1")
    return net_mm / efficiency


def annual_net_irrigation(
    months: Sequence[str],
    et0_mm: Sequence[float],
    rain_mm: Sequence[float],
    kc: Sequence[float],
) -> dict[str, float]:
    """Riego neto por año (mm) para una secuencia de meses 'YYYY-MM'."""
    if not (len(months) == len(et0_mm) == len(rain_mm) == len(kc)):
        raise ValueError("las series deben tener la misma longitud")
    totals: dict[str, float] = defaultdict(float)
    for month, et0, rain, coefficient in zip(months, et0_mm, rain_mm, kc, strict=True):
        totals[month[:4]] += net_irrigation_requirement(
            crop_et(et0, coefficient), effective_rain_usda(rain)
        )
    return dict(totals)


# ---------- Balance en la zona de raíces ----------


def total_available_water(awc_mm_per_m: float, root_depth_m: float) -> float:
    """TAW en mm: capacidad de agua disponible por la profundidad de raíces."""
    if awc_mm_per_m < 0 or root_depth_m < 0:
        raise ValueError("la capacidad de agua y la profundidad no pueden ser negativas")
    return awc_mm_per_m * root_depth_m


@dataclass(frozen=True)
class MonthBalance:
    etc_mm: float  # demanda potencial del cultivo
    ks: float  # coeficiente de estrés (1 = sin estrés)
    eta_mm: float  # evapotranspiración real
    deep_percolation_mm: float
    depletion_mm: float  # agotamiento al final del mes
    deficit_mm: float  # ETc que el suelo no pudo dar


def monthly_water_balance(
    et0_mm: Sequence[float],
    rain_mm: Sequence[float],
    kc: Sequence[float],
    taw_mm: float,
    depletion_fraction: float = 0.5,
    initial_depletion_mm: float = 0.0,
    irrigation_mm: Sequence[float] | None = None,
) -> list[MonthBalance]:
    """Balance mensual de agotamiento en la zona de raíces (FAO-56 cap. 8).

    Ks = 1 mientras el agotamiento inicial no pase de RAW = p × TAW; después
    baja linealmente hasta 0 en TAW (ec. 84).
    """
    n = len(et0_mm)
    irrigation = irrigation_mm if irrigation_mm is not None else [0.0] * n
    if not (len(rain_mm) == len(kc) == len(irrigation) == n):
        raise ValueError("las series deben tener la misma longitud")
    if taw_mm <= 0:
        raise ValueError("TAW debe ser mayor que cero")
    if not 0 < depletion_fraction < 1:
        raise ValueError("la fracción de agotamiento debe estar entre 0 y 1")

    raw = depletion_fraction * taw_mm
    depletion = min(max(initial_depletion_mm, 0.0), taw_mm)
    out: list[MonthBalance] = []
    for et0, rain, coefficient, irrigated in zip(et0_mm, rain_mm, kc, irrigation, strict=True):
        etc = crop_et(et0, coefficient)
        ks = 1.0 if depletion <= raw else max(0.0, (taw_mm - depletion) / (taw_mm - raw))
        eta = ks * etc
        depletion = depletion - rain - irrigated + eta
        percolation = 0.0
        if depletion < 0:
            percolation = -depletion
            depletion = 0.0
        elif depletion > taw_mm:
            eta -= depletion - taw_mm
            depletion = taw_mm
        out.append(MonthBalance(etc, ks, eta, percolation, depletion, etc - eta))
    return out


def root_zone_index(depletion_mm: float, taw_mm: float) -> float:
    """Índice relativo de agua en raíces: 1 = a capacidad de campo, 0 = agotado."""
    if taw_mm <= 0:
        raise ValueError("TAW debe ser mayor que cero")
    return min(1.0, max(0.0, 1 - depletion_mm / taw_mm))


def exponential_filter(
    surface_values: Sequence[float],
    time_days: Sequence[float],
    characteristic_time_days: float,
) -> list[float]:
    """Filtro exponencial recursivo (Wagner 1999; Albergel 2008).

    Propaga una serie de humedad superficial hacia la zona de raíces. El
    resultado es un índice relativo en la misma escala que la entrada.
    """
    if len(surface_values) != len(time_days):
        raise ValueError("las series deben tener la misma longitud")
    if characteristic_time_days <= 0:
        raise ValueError("el tiempo característico debe ser mayor que cero")
    if not surface_values:
        return []
    out = [surface_values[0]]
    gain = 1.0
    for i in range(1, len(surface_values)):
        dt = time_days[i] - time_days[i - 1]
        if dt <= 0:
            raise ValueError("time_days debe ser estrictamente creciente")
        gain = gain / (gain + math.exp(-dt / characteristic_time_days))
        out.append(out[-1] + gain * (surface_values[i] - out[-1]))
    return out
