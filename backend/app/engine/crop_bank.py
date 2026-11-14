"""Banco de cultivos FAO-56. Helpers puros sobre dos tablas CSV.

Las tablas viven en /models (`fao56_crop_bank.csv`, `kc_monthly.csv`); aquí hay
una copia que mantiene `python contracts/sync.py`, porque Railway despliega
solo /backend.

TODO ES SUPUESTO (type "assumed"):
- Los Kc inicial, medio y final y las raíces vienen de FAO-56 (tablas 12 y 22),
  transcritos por un agente y aún sin revisión de una persona contra la
  publicación (HUMANO.md H-04). Donde FAO-56 da un rango se tomó un punto.
- Las mezclas y coberturas no están en la tabla 12: son aproximaciones.
- La curva mensual de Kc por grupo sigue el calendario del hemisferio norte y
  no la fecha real de siembra de la parcela.
"""

from __future__ import annotations

import csv
from collections.abc import Sequence
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"

BANK_TYPE = "assumed"
BANK_SOURCE = (
    "Banco de cultivos del equipo sobre FAO-56 (Allen et al., 1998), tablas 12 y 22; "
    "transcripción sin revisión humana"
)
BANK_DATE = "1998"
BANK_SCALE = "tabla de referencia (no espacial)"


@dataclass(frozen=True)
class CropSpec:
    crop_code: str
    crop_group: str
    cdl_codes: tuple[int, ...]
    name_es: str
    name_en: str
    kc_ini: float
    kc_mid: float
    kc_end: float
    root_depth_m: float
    depletion_fraction_p: float
    sown: bool
    sold: bool
    machinery: tuple[str, ...]  # IRRIGATION, SEEDER, BALER
    source: str

    @property
    def name(self) -> dict[str, str]:
        return {"es": self.name_es, "en": self.name_en}


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(";") if item.strip()]


@lru_cache
def _bank() -> dict[str, CropSpec]:
    with (DATA_DIR / "fao56_crop_bank.csv").open(encoding="utf-8", newline="") as handle:
        return {
            row["crop_code"]: CropSpec(
                crop_code=row["crop_code"],
                crop_group=row["crop_group"],
                cdl_codes=tuple(int(code) for code in _split(row["cdl_codes"])),
                name_es=row["name_es"],
                name_en=row["name_en"],
                kc_ini=float(row["kc_ini"]),
                kc_mid=float(row["kc_mid"]),
                kc_end=float(row["kc_end"]),
                root_depth_m=float(row["root_depth_m"]),
                depletion_fraction_p=float(row["depletion_fraction_p"]),
                sown=row["sown"].strip().lower() == "true",
                sold=row["sold"].strip().lower() == "true",
                machinery=tuple(_split(row["machinery"])),
                source=row["source"],
            )
            for row in csv.DictReader(handle)
        }


@lru_cache
def _monthly_kc() -> dict[tuple[str, int], float]:
    with (DATA_DIR / "kc_monthly.csv").open(encoding="utf-8", newline="") as handle:
        return {
            (row["crop_group"], int(row["month_num"])): float(row["kc"])
            for row in csv.DictReader(handle)
        }


def list_crops() -> list[CropSpec]:
    """Todos los cultivos del banco, en el orden del archivo."""
    return list(_bank().values())


def get_crop_spec(crop_code: str) -> CropSpec | None:
    return _bank().get(crop_code)


def kc_for_month(crop_code: str, month_num: int) -> float | None:
    """Kc del grupo del cultivo en un mes del calendario (1 a 12). None si no está."""
    spec = get_crop_spec(crop_code)
    if spec is None:
        return None
    return _monthly_kc().get((spec.crop_group, month_num))


def monthly_kc_series(crop_code: str, months: Sequence[str]) -> list[float]:
    """Kc para una lista de meses 'YYYY-MM'. Falla si el cultivo no está en el banco."""
    series: list[float] = []
    for month in months:
        kc = kc_for_month(crop_code, int(month[5:7]))
        if kc is None:
            raise KeyError(f"'{crop_code}' no tiene Kc mensual en el banco")
        series.append(kc)
    return series


def crop_code_for_cdl(cdl_code: int) -> str | None:
    """Primer cultivo del banco que declara esa clase de USDA CDL."""
    for spec in _bank().values():
        if cdl_code in spec.cdl_codes:
            return spec.crop_code
    return None


def fao56_reference_note() -> dict[str, str]:
    return {
        "es": "Coeficientes de cultivo de FAO Riego y Drenaje 56 (Allen, Pereira, Raes y "
        "Smith, 1998), tablas 12 y 22. Son valores de referencia transcritos por el equipo "
        "y pendientes de revisión contra la publicación: se tratan como supuesto, no como "
        "medición de la parcela. La curva mensual sigue el calendario del hemisferio norte.",
        "en": "Crop coefficients from FAO Irrigation and Drainage Paper 56 (Allen, Pereira, "
        "Raes and Smith, 1998), Tables 12 and 22. Reference values transcribed by the team, "
        "pending review against the publication: treated as an assumption, not a field "
        "measurement. The monthly curve follows the northern-hemisphere calendar.",
    }
