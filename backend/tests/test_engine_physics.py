"""Balance de agua, índices y clima contra valores calculados a mano."""

from __future__ import annotations

import math
from datetime import date, timedelta

import numpy as np
import pytest

from app.engine import climate, indices
from app.engine import water_balance as wb

# ---------- índices ----------


def test_ndvi() -> None:
    # (0.5 - 0.1) / (0.5 + 0.1) = 0.4 / 0.6
    assert indices.ndvi(0.5, 0.1) == pytest.approx(0.666667, abs=1e-6)


def test_ndmi() -> None:
    # (0.5 - 0.3) / (0.5 + 0.3) = 0.2 / 0.8
    assert indices.ndmi(0.5, 0.3) == pytest.approx(0.25)


def test_bsi() -> None:
    # ((0.3 + 0.1) - (0.5 + 0.05)) / ((0.3 + 0.1) + (0.5 + 0.05)) = -0.15 / 0.95
    assert indices.bsi(swir1=0.3, red=0.1, nir=0.5, blue=0.05) == pytest.approx(-0.157895, abs=1e-6)


def test_ndti() -> None:
    # (0.3 - 0.2) / (0.3 + 0.2) = 0.1 / 0.5
    assert indices.ndti(0.3, 0.2) == pytest.approx(0.2)


def test_bare_soil_has_positive_bsi_and_low_ndvi() -> None:
    assert indices.bsi(swir1=0.35, red=0.25, nir=0.30, blue=0.15) > 0
    assert indices.ndvi(0.30, 0.25) < 0.1


def test_indices_work_on_arrays() -> None:
    out = indices.ndvi(np.array([0.5, 0.4]), np.array([0.1, 0.4]))
    assert out == pytest.approx([0.666667, 0.0], abs=1e-6)


def test_zero_denominator_is_nan_not_a_made_up_value() -> None:
    assert math.isnan(indices.ndvi(0.0, 0.0))
    out = indices.ndti(np.array([0.0, 0.3]), np.array([0.0, 0.2]))
    assert math.isnan(out[0])
    assert out[1] == pytest.approx(0.2)


def test_no_ndre_and_no_cai() -> None:
    """Decidido en AGENTS.md sección 4: no se calculan con Landsat."""
    assert not hasattr(indices, "ndre")
    assert not hasattr(indices, "cai")


# ---------- ET de referencia ----------


def test_extraterrestrial_radiation_fao56_example_8() -> None:
    # FAO-56 ejemplo 8: 20° S, 3 de septiembre (día 246) -> Ra = 32.2 MJ/m²/día
    assert wb.extraterrestrial_radiation(-20.0, 246) == pytest.approx(32.2, abs=0.1)


def test_saturation_vapor_pressure_fao56_example_3() -> None:
    # FAO-56 ejemplo 3: e°(24.5 °C) = 3.075 kPa, e°(15 °C) = 1.705 kPa
    assert wb.saturation_vapor_pressure(24.5) == pytest.approx(3.075, abs=0.002)
    assert wb.saturation_vapor_pressure(15.0) == pytest.approx(1.705, abs=0.002)


def test_actual_vapor_pressure_fao56_example_18() -> None:
    # Tmax 21.5, Tmin 12.3, HRmax 84 %, HRmin 63 % -> ea = 1.409 kPa
    assert wb.actual_vapor_pressure_from_rh(21.5, 12.3, 84, 63) == pytest.approx(1.409, abs=0.002)


def test_et0_penman_monteith_fao56_example_18() -> None:
    # FAO-56 ejemplo 18: Uccle (50.80° N, 100 m), 6 de julio (día 187),
    # Rs = 22.07 MJ/m²/día, u2 = 2.078 m/s -> ET0 = 3.9 mm/día (3.88)
    et0 = wb.et0_penman_monteith(
        tmax_c=21.5,
        tmin_c=12.3,
        solar_radiation=22.07,
        wind_2m=2.078,
        actual_vapor_pressure=1.409,
        elevation_m=100,
        latitude_deg=50.80,
        day_of_year=187,
    )
    assert et0 == pytest.approx(3.88, abs=0.05)


# ---------- demanda y lluvia efectiva ----------


def test_crop_et() -> None:
    assert wb.crop_et(150.0, 0.95) == pytest.approx(142.5)
    with pytest.raises(ValueError):
        wb.crop_et(-1.0, 1.0)


def test_effective_rain_usda() -> None:
    # 100 × (125 - 0.2 × 100) / 125 = 84
    assert wb.effective_rain_usda(100.0) == pytest.approx(84.0)
    # 125 + 0.1 × 300 = 155
    assert wb.effective_rain_usda(300.0) == pytest.approx(155.0)
    # Las dos ramas coinciden en 250 mm: 150
    assert wb.effective_rain_usda(250.0) == pytest.approx(150.0)
    assert wb.effective_rain_usda(0.0) == 0.0


def test_irrigation_requirements() -> None:
    assert wb.net_irrigation_requirement(142.5, 84.0) == pytest.approx(58.5)
    assert wb.net_irrigation_requirement(50.0, 84.0) == 0.0
    assert wb.gross_irrigation_requirement(58.5, 0.75) == pytest.approx(78.0)
    with pytest.raises(ValueError):
        wb.gross_irrigation_requirement(10.0, 0.0)


def test_annual_net_irrigation_by_year() -> None:
    months = ["2023-06", "2023-07", "2024-06"]
    # 2023-06: ETc 150×1.0 = 150; Pe(100) = 84   -> 66
    # 2023-07: ETc 200×0.5 = 100; Pe(0) = 0      -> 100
    # 2024-06: ETc 100×0.4 = 40;  Pe(100) = 84   -> 0
    totals = wb.annual_net_irrigation(months, [150, 200, 100], [100, 0, 100], [1.0, 0.5, 0.4])
    assert totals == pytest.approx({"2023": 166.0, "2024": 0.0})


# ---------- balance en la zona de raíces ----------


def test_total_available_water() -> None:
    # 142 mm/m × 1.2 m = 170.4 mm
    assert wb.total_available_water(142.0, 1.2) == pytest.approx(170.4)


def test_monthly_water_balance_by_hand() -> None:
    # TAW = 150, p = 0.5 -> RAW = 75
    result = wb.monthly_water_balance(
        et0_mm=[100, 120, 100],
        rain_mm=[20, 10, 200],
        kc=[1.0, 1.0, 1.0],
        taw_mm=150,
        depletion_fraction=0.5,
    )
    m1, m2, m3 = result
    # Mes 1: D0 = 0 -> Ks = 1; ETa = 100; D = 0 - 20 + 100 = 80
    assert (m1.ks, m1.eta_mm, m1.depletion_mm, m1.deep_percolation_mm) == pytest.approx(
        (1.0, 100.0, 80.0, 0.0)
    )
    # Mes 2: D0 = 80 > 75 -> Ks = (150 - 80) / 75 = 0.9333; ETa = 112
    #        D = 80 - 10 + 112 = 182 > TAW -> ETa = 112 - 32 = 80; D = 150
    assert m2.ks == pytest.approx(0.933333, abs=1e-6)
    assert (m2.eta_mm, m2.depletion_mm, m2.deficit_mm) == pytest.approx((80.0, 150.0, 40.0))
    # Mes 3: D0 = 150 -> Ks = 0; ETa = 0; D = 150 - 200 = -50 -> percola 50; D = 0
    assert (m3.ks, m3.eta_mm, m3.depletion_mm, m3.deep_percolation_mm) == pytest.approx(
        (0.0, 0.0, 0.0, 50.0)
    )


def test_irrigation_refills_the_root_zone() -> None:
    dry = wb.monthly_water_balance([100, 100], [0, 0], [1.0, 1.0], taw_mm=150)
    wet = wb.monthly_water_balance(
        [100, 100], [0, 0], [1.0, 1.0], taw_mm=150, irrigation_mm=[100, 100]
    )
    # Sin riego: mes 1 D = 100; mes 2 Ks = 50/75, ETa = 66.67, D = 150 (tope)
    assert dry[1].ks == pytest.approx(0.666667, abs=1e-6)
    assert dry[1].depletion_mm == pytest.approx(150.0)
    # Con riego igual a la demanda el agotamiento se queda en 0
    assert [m.depletion_mm for m in wet] == pytest.approx([0.0, 0.0])
    assert [m.ks for m in wet] == pytest.approx([1.0, 1.0])


def test_root_zone_index() -> None:
    assert wb.root_zone_index(0.0, 150.0) == 1.0
    assert wb.root_zone_index(60.0, 150.0) == pytest.approx(0.6)
    assert wb.root_zone_index(200.0, 150.0) == 0.0


def test_exponential_filter_by_hand() -> None:
    # T = 10 días, pasos de 10 días.
    # K1 = 1 / (1 + e^-1) = 0.731059; SWI1 = 0.2 + 0.731059 × 0.2 = 0.346212
    # K2 = 0.731059 / (0.731059 + 0.367879) = 0.665241
    # SWI2 = 0.346212 + 0.665241 × (0.6 - 0.346212) = 0.515042
    out = wb.exponential_filter([0.2, 0.4, 0.6], [0, 10, 20], characteristic_time_days=10)
    assert out == pytest.approx([0.2, 0.346212, 0.515042], abs=1e-5)


def test_exponential_filter_rejects_bad_input() -> None:
    assert wb.exponential_filter([], [], 10) == []
    with pytest.raises(ValueError):
        wb.exponential_filter([0.1, 0.2], [0, 0], 10)
    with pytest.raises(ValueError):
        wb.exponential_filter([0.1], [0], 0)


# ---------- heladas y calor ----------


def daily(start: date, tmin: list[float | None], tmax: list[float | None]) -> tuple:
    return [start + timedelta(days=i) for i in range(len(tmin))], tmin, tmax


def test_count_by_month_by_hand() -> None:
    # 29-31 de enero y 1-2 de febrero de 2023
    dates, tmin, tmax = daily(
        date(2023, 1, 29), [-2.0, 0.0, 1.0, -0.5, 5.0], [10.0, 12.0, 35.0, 36.0, 34.9]
    )
    jan, feb = climate.count_by_month(dates, tmin, tmax)
    # Enero: heladas el 29 (-2) y el 30 (0 cuenta: Tmin <= 0); calor el 31 (35 cuenta)
    assert (jan.month, jan.frost_days, jan.heat_days) == ("2023-01", 2, 1)
    # Febrero: helada el 1 (-0.5); calor el 1 (36); 34.9 no llega
    assert (feb.month, feb.frost_days, feb.heat_days) == ("2023-02", 1, 1)
    assert (jan.valid_frost_days, feb.valid_frost_days) == (3, 2)


def test_missing_days_are_not_counted() -> None:
    dates, tmin, tmax = daily(date(2023, 7, 1), [None, -1.0, float("nan")], [40.0, None, 40.0])
    (july,) = climate.count_by_month(dates, tmin, tmax)
    assert (july.frost_days, july.valid_frost_days) == (1, 1)
    assert (july.heat_days, july.valid_heat_days) == (2, 2)


def test_frequency_by_calendar_month_averages_across_years() -> None:
    counts = [
        climate.MonthCount("2023-01", 20, 0, 31, 31),
        climate.MonthCount("2024-01", 10, 0, 31, 31),
        climate.MonthCount("2023-07", 0, 9, 31, 31),
    ]
    january, july = climate.frequency_by_calendar_month(counts)
    # Enero: (20 + 10) / 2 años = 15 días; 30 / 62 días con dato
    assert (january.calendar_month, january.years, january.mean_frost_days) == (1, 2, 15.0)
    assert january.frost_fraction == pytest.approx(30 / 62)
    assert (july.calendar_month, july.mean_heat_days) == (7, 9.0)
    assert july.heat_fraction == pytest.approx(9 / 31)


def test_mean_days_per_year() -> None:
    counts = [
        climate.MonthCount("2023-01", 20, 0, 31, 31),
        climate.MonthCount("2023-07", 0, 9, 31, 31),
        climate.MonthCount("2024-01", 10, 0, 31, 31),
        climate.MonthCount("2024-07", 0, 5, 31, 31),
    ]
    # Heladas: 30 en 2 años = 15; calor: 14 en 2 años = 7
    assert climate.mean_days_per_year(counts) == (15.0, 7.0)


def test_series_must_have_same_length() -> None:
    with pytest.raises(ValueError):
        climate.count_by_month([date(2023, 1, 1)], [], [])
