"""Restricciones primero (AGENTS.md regla 3). Funciones puras.

Antes de calcular nada más, cada rotación se revisa contra lo que el agricultor
declaró: agua máxima por año, maquinaria, cultivos sin comprador y ventana de
siembra. Cada rotación sale con `viable` y, si no pasa, con `rejection_reason`.
Si ninguna pasa, `has_viable_options` es False y no se rellena con
recomendaciones.

Reglas:
- Agua: el agua anual de la rotación no puede pasar del máximo. Sin estimación
  de agua la rotación no se da por buena.
- Comprador: ningún cultivo que se vende puede estar en la lista sin comprador.
- Maquinaria: cada requisito del cultivo se cumple con cualquiera de sus
  alternativas (ver crop_traits.py).
- Calendario: toda siembra dentro del horizonte cae en la ventana. Una siembra
  es un cambio de cultivo hacia uno que se siembra. El primer mes no cuenta:
  ese cultivo ya estaba en el campo.
- Un cultivo que no está en la tabla de rasgos no se puede verificar: la
  rotación se descarta y se dice cuál falta.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field

from app.engine.crop_traits import REQUIREMENT_LABELS, CropTraits, traits_for

MONTH_NAMES = {
    "es": [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ],
    "en": [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ],
}


@dataclass(frozen=True)
class FarmerConstraints:
    max_water_mm_year: float
    available_machinery: frozenset[str]
    crops_without_buyer: frozenset[str]
    planting_start_month: int  # 1 a 12
    planting_end_month: int  # 1 a 12; si es menor que el inicio, la ventana cruza el año

    def __post_init__(self) -> None:
        if self.max_water_mm_year < 0:
            raise ValueError("el agua máxima no puede ser negativa")
        for month in (self.planting_start_month, self.planting_end_month):
            if not 1 <= month <= 12:
                raise ValueError("los meses de la ventana van de 1 a 12")


@dataclass(frozen=True)
class RotationPlan:
    rotation_id: str
    annual_water_mm: float | None
    months: Sequence[tuple[str, str]]  # (YYYY-MM, crop_code), en orden


@dataclass(frozen=True)
class RotationVerdict:
    rotation_id: str
    viable: bool
    water_ok: bool
    buyer_ok: bool
    machinery_ok: bool
    calendar_ok: bool
    rejection_reason: dict[str, str] | None
    unknown_crops: tuple[str, ...] = ()
    crops_without_buyer: tuple[str, ...] = ()
    missing_machinery: tuple[frozenset[str], ...] = ()
    plantings_outside_window: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True)
class ConstraintsResult:
    verdicts: tuple[RotationVerdict, ...]
    has_viable_options: bool = field(init=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "has_viable_options", any(v.viable for v in self.verdicts))


Labels = Mapping[str, Mapping[str, str]]
TraitsLookup = Callable[[str], CropTraits | None]


def month_in_window(month: int, start: int, end: int) -> bool:
    """¿El mes (1 a 12) cae en la ventana? Admite ventanas que cruzan diciembre."""
    if start <= end:
        return start <= month <= end
    return month >= start or month <= end


def planting_events(
    months: Sequence[tuple[str, str]], lookup: TraitsLookup = traits_for
) -> list[tuple[str, str]]:
    """Siembras dentro del horizonte: (YYYY-MM, crop_code)."""
    events: list[tuple[str, str]] = []
    previous_group: str | None = None
    for index, (month, code) in enumerate(months):
        traits = lookup(code)
        group = traits.group if traits else code
        if index > 0 and group != previous_group and traits is not None and traits.sown:
            events.append((month, code))
        previous_group = group
    return events


def _name(code: str, lang: str, labels: Labels | None) -> str:
    if labels and code in labels and lang in labels[code]:
        return labels[code][lang]
    return code.replace("_", " ")


def _join(items: Sequence[str], lang: str) -> str:
    if len(items) <= 1:
        return "".join(items)
    last = " y " if lang == "es" else " and "
    return ", ".join(items[:-1]) + last + items[-1]


def _fmt(value: float) -> str:
    return f"{value:.0f}"


def evaluate_rotation(
    plan: RotationPlan,
    constraints: FarmerConstraints,
    labels: Labels | None = None,
    lookup: TraitsLookup = traits_for,
) -> RotationVerdict:
    codes = list(dict.fromkeys(code for _, code in plan.months))
    known = {code: lookup(code) for code in codes}
    unknown = tuple(code for code, traits in known.items() if traits is None)
    traits_list = [traits for traits in known.values() if traits is not None]

    water_ok = (
        plan.annual_water_mm is not None and plan.annual_water_mm <= constraints.max_water_mm_year
    )

    blocked = constraints.crops_without_buyer
    no_buyer = tuple(
        t.code for t in traits_list if t.sold and (t.code in blocked or t.group in blocked)
    )
    buyer_ok = not no_buyer and not unknown

    missing: list[frozenset[str]] = []
    for traits in traits_list:
        for requirement in traits.machinery:
            if not (requirement & constraints.available_machinery) and requirement not in missing:
                missing.append(requirement)
    machinery_ok = not missing and not unknown

    outside = tuple(
        (month, code)
        for month, code in planting_events(plan.months, lookup)
        if not month_in_window(
            int(month[5:7]), constraints.planting_start_month, constraints.planting_end_month
        )
    )
    calendar_ok = not outside and not unknown

    viable = water_ok and buyer_ok and machinery_ok and calendar_ok
    reason = None
    if not viable:
        reason = {
            lang: _reason(
                lang, plan, constraints, water_ok, unknown, no_buyer, missing, outside, labels
            )
            for lang in ("es", "en")
        }
    return RotationVerdict(
        rotation_id=plan.rotation_id,
        viable=viable,
        water_ok=water_ok,
        buyer_ok=buyer_ok,
        machinery_ok=machinery_ok,
        calendar_ok=calendar_ok,
        rejection_reason=reason,
        unknown_crops=unknown,
        crops_without_buyer=no_buyer,
        missing_machinery=tuple(missing),
        plantings_outside_window=outside,
    )


def _reason(
    lang: str,
    plan: RotationPlan,
    constraints: FarmerConstraints,
    water_ok: bool,
    unknown: Sequence[str],
    no_buyer: Sequence[str],
    missing: Sequence[frozenset[str]],
    outside: Sequence[tuple[str, str]],
    labels: Labels | None,
) -> str:
    es = lang == "es"
    parts: list[str] = []
    if not water_ok:
        limit = _fmt(constraints.max_water_mm_year)
        if plan.annual_water_mm is None:
            parts.append(
                "no hay estimación de agua para compararla con el límite"
                if es
                else "there is no water estimate to compare against the limit"
            )
        elif es:
            parts.append(
                f"pide {_fmt(plan.annual_water_mm)} mm de agua por año y el límite es {limit} mm"
            )
        else:
            parts.append(
                f"it needs {_fmt(plan.annual_water_mm)} mm of water per year "
                f"and the limit is {limit} mm"
            )
    if no_buyer:
        names = _join([_name(code, lang, labels) for code in no_buyer], lang)
        parts.append(f"no hay comprador para {names}" if es else f"there is no buyer for {names}")
    if missing:
        names = _join([_requirement_label(req, lang) for req in missing], lang)
        parts.append(f"falta maquinaria: {names}" if es else f"missing machinery: {names}")
    if outside:
        start = MONTH_NAMES[lang][constraints.planting_start_month - 1]
        end = MONTH_NAMES[lang][constraints.planting_end_month - 1]
        items = [
            f"{_name(code, lang, labels)} ({MONTH_NAMES[lang][int(month[5:7]) - 1]} {month[:4]})"
            for month, code in outside
        ]
        if es:
            parts.append(f"siembra fuera de la ventana de {start} a {end}: {_join(items, lang)}")
        else:
            parts.append(f"planting outside the {start} to {end} window: {_join(items, lang)}")
    if unknown:
        names = _join(list(unknown), lang)
        parts.append(
            f"no se pueden verificar cultivos sin rasgos registrados: {names}"
            if es
            else f"crops with no registered traits cannot be checked: {names}"
        )
    head = "Descartada: " if es else "Ruled out: "
    return head + "; ".join(parts) + "."


def _requirement_label(requirement: frozenset[str], lang: str) -> str:
    label = REQUIREMENT_LABELS.get(requirement)
    if label:
        return label[lang]
    return " / ".join(sorted(requirement)).replace("_", " ")


def evaluate_rotations(
    plans: Sequence[RotationPlan],
    constraints: FarmerConstraints,
    labels: Labels | None = None,
    lookup: TraitsLookup = traits_for,
) -> ConstraintsResult:
    """Evalúa todas las rotaciones. `has_viable_options` es False si ninguna pasa."""
    return ConstraintsResult(
        tuple(evaluate_rotation(plan, constraints, labels, lookup) for plan in plans)
    )
