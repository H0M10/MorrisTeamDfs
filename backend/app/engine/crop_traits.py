"""Rasgos de cultivo que usa el evaluador de restricciones.

TODO ES SUPUESTO (type "assumed"). Esta tabla la escribió un agente para que el
flujo funcione; un agrónomo debe revisarla antes de que una cifra real llegue
al agricultor (ver HUMANO.md). No incluye maquinaria de cosecha de grano: se
supone contratada.

Para cambiar un rasgo basta editar este archivo; el motor no tiene otros
valores escondidos.
"""

from __future__ import annotations

from dataclasses import dataclass

TRAITS_SOURCE = "Tabla de rasgos de cultivo del equipo (supuesto, pendiente de revisión agronómica)"

# Cada requisito se cumple con cualquiera de sus alternativas.
IRRIGATION = frozenset({"pivote_central", "riego_compuerta", "riego_aspersion", "riego_goteo"})
SEEDER = frozenset({"sembradora_grano", "sembradora_convencional", "sembradora_directa"})
BALER = frozenset({"empacadora"})

REQUIREMENT_LABELS: dict[frozenset[str], dict[str, str]] = {
    IRRIGATION: {"es": "sistema de riego", "en": "irrigation system"},
    SEEDER: {"es": "sembradora", "en": "seeder"},
    BALER: {"es": "empacadora", "en": "baler"},
}


@dataclass(frozen=True)
class CropTraits:
    code: str
    group: str  # códigos del mismo cultivo en pie comparten grupo
    sown: bool  # entra al campo por siembra
    sold: bool  # necesita comprador
    machinery: tuple[frozenset[str], ...] = ()


def _crop(
    code: str,
    *,
    group: str | None = None,
    sown: bool = True,
    sold: bool = True,
    machinery: tuple[frozenset[str], ...] = (IRRIGATION, SEEDER),
) -> CropTraits:
    return CropTraits(code, group or code, sown, sold, machinery)


def _residue(code: str) -> CropTraits:
    """Rastrojo, descanso o barbecho: no se siembra, no se vende, no pide equipo."""
    return CropTraits(code, code, sown=False, sold=False)


_HAY = (IRRIGATION, SEEDER, BALER)

CROP_TRAITS: dict[str, CropTraits] = {
    t.code: t
    for t in [
        _crop("alfalfa", machinery=_HAY),
        _crop("alfalfa_dormant", group="alfalfa", machinery=_HAY),
        _crop("cebada_forrajera", machinery=_HAY),
        _crop("avena_forrajera"),
        _crop("trigo_invierno"),
        _crop("maiz"),
        _crop("maiz_frijol"),
        _crop("sorgo_grano"),
        # Cultivos de cobertura: se siembran pero no se venden.
        _crop("avena_cubierta", sold=False),
        _crop("avena_veza", sold=False),
        _crop("cubierta_mixta", sold=False),
        _crop("triticale_cobertura", sold=False),
        _residue("descanso_rastrojo"),
        _residue("rastrojo_directo"),
        _residue("rastrojo_maiz"),
        _residue("rastrojo_sorgo"),
        _residue("barbecho"),
    ]
}


def traits_for(code: str) -> CropTraits | None:
    return CROP_TRAITS.get(code)
