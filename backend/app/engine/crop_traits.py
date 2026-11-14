"""Rasgos de cultivo que usa el evaluador de restricciones.

Se construyen desde el banco de cultivos (`crop_bank.py`): qué se siembra, qué
se vende y qué equipo pide cada cultivo.

TODO ES SUPUESTO (type "assumed"). Un agrónomo debe revisar la tabla antes de
que una cifra real llegue al agricultor (HUMANO.md H-03). No incluye maquinaria
de cosecha de grano: se supone contratada.

Para cambiar un rasgo edita `models/fao56_crop_bank.csv` y corre
`python contracts/sync.py`; el motor no tiene otros valores escondidos.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.engine.crop_bank import list_crops

TRAITS_TYPE = "assumed"
TRAITS_SOURCE = (
    "Tabla de rasgos de cultivo del equipo, models/fao56_crop_bank.csv "
    "(supuesto, pendiente de revisión agronómica)"
)

# Cada requisito se cumple con cualquiera de sus alternativas.
IRRIGATION = frozenset({"pivote_central", "riego_compuerta", "riego_aspersion", "riego_goteo"})
SEEDER = frozenset({"sembradora_grano", "sembradora_convencional", "sembradora_directa"})
BALER = frozenset({"empacadora"})

REQUIREMENTS: dict[str, frozenset[str]] = {
    "IRRIGATION": IRRIGATION,
    "SEEDER": SEEDER,
    "BALER": BALER,
}

REQUIREMENT_LABELS: dict[frozenset[str], dict[str, str]] = {
    IRRIGATION: {"es": "sistema de riego", "en": "irrigation system"},
    SEEDER: {"es": "sembradora", "en": "seeder"},
    BALER: {"es": "empacadora", "en": "baler"},
}

# Códigos que son el mismo cultivo en pie en otra etapa: pasar de uno a otro no
# es sembrar, y el comprador es el mismo.
STAND_SUFFIXES = ("_dormant",)


@dataclass(frozen=True)
class CropTraits:
    code: str
    group: str  # cultivo en pie: alfalfa y alfalfa_dormant comparten grupo
    sown: bool  # entra al campo por siembra
    sold: bool  # necesita comprador
    machinery: tuple[frozenset[str], ...] = ()
    bank_group: str = ""  # grupo agronómico del banco (small_grain, corn, ...)


def stand_of(code: str) -> str:
    for suffix in STAND_SUFFIXES:
        if code.endswith(suffix):
            return code.removesuffix(suffix)
    return code


CROP_TRAITS: dict[str, CropTraits] = {
    spec.crop_code: CropTraits(
        code=spec.crop_code,
        group=stand_of(spec.crop_code),
        sown=spec.sown,
        sold=spec.sold,
        machinery=tuple(REQUIREMENTS[name] for name in spec.machinery),
        bank_group=spec.crop_group,
    )
    for spec in list_crops()
}


def traits_for(code: str) -> CropTraits | None:
    return CROP_TRAITS.get(code)
