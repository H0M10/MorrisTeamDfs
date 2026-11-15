"""Rotaciones candidatas aprendidas de datos (Modelo 5) y elección con reglas + Modelo 1.

1. Modelo 5 (cadena de Markov de segundo orden sobre USDA CDL 2015–2024 de 5 valles):
   a partir de los dos últimos años del campo, calcula la probabilidad de cada secuencia
   de 3 años de grupos de cultivo (alfalfa, grano pequeño, maíz, barbecho) y se queda
   con las más comunes. Es observacional: "lo que hacen campos parecidos".
2. Reglas: al menos dos años con un cultivo que se vende, distinta de la rotación
   actual, y con comprador en la zona (has_market). Las restricciones del agricultor se
   revisan después, como siempre.
3. Se juntan con las opciones del catálogo y se ordenan con el Modelo 1 (agua) o por
   meses de cultivo vivo (más suelo).

El Modelo 5 no forma parte del contrato (sus cuatro modelos están congelados): su
métrica va en models/model_5_crop_sequence/CARD.md y en la fuente de cada rotación.
"""

from __future__ import annotations

import itertools
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.engine import crop_bank

GROUPS = ("alfalfa", "small_grain", "corn", "fallow")
SOLD = {"alfalfa", "small_grain", "corn"}
GROUP_LABEL = {
    "alfalfa": "alfalfa",
    "small_grain": "grano de primavera",
    "corn": "maíz",
    "fallow": "descanso",
}
MIN_PROBABILITY = 0.005
MAX_CANDIDATES = 12
# Grano de primavera: el primero de estos con comprador en la zona.
SMALL_GRAIN_CHOICES = ("trigo_primavera", "cebada_forrajera", "avena_forrajera")


@lru_cache(maxsize=4)
def _load(models_dir: str) -> dict[str, Any] | None:
    folder = Path(models_dir) / "model_5_crop_sequence"
    try:
        transitions = json.loads((folder / "transitions.json").read_text(encoding="utf-8"))
        metrics = json.loads((folder / "metrics.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if metrics.get("sample_run"):
        return None  # una corrida de prueba nunca llega al agricultor
    return {"transitions": transitions, "metrics": metrics}


def available(models_dir: Path) -> bool:
    return _load(str(models_dir)) is not None


def _dist(counts: dict[str, int], states: list[str], alpha: float) -> dict[str, float]:
    total = sum(counts.values()) + alpha * len(states)
    return {s: (counts.get(s, 0) + alpha) / total for s in states}


def next_year(model: dict[str, Any], a: str, b: str) -> dict[str, float]:
    t = model["transitions"]
    states, alpha, k = t["states"], float(t["alpha"]), float(t["min_pair_count"])
    first = _dist(t["first"].get(b, {}), states, alpha)
    pair = t["second"].get(f"{a}|{b}", {})
    n = sum(pair.values())
    if n == 0:
        return first
    weight = min(1.0, n / (n + k))
    second = _dist(pair, states, alpha)
    return {s: weight * second[s] + (1 - weight) * first[s] for s in states}


def year_group(codes: list[str]) -> str:
    """Grupo del año a partir de sus 12 códigos mensuales.

    Cuenta solo los meses con un cultivo sembrado (el rastrojo no es un cultivo): un año
    de grano con 4 meses de cebada y 8 de rastrojo es grano. Sin ningún cultivo, descanso.
    """
    counts: dict[str, int] = {}
    unknown = False
    for code in codes:
        spec = crop_bank.get_crop_spec(code)
        if spec is None:
            unknown = True
        elif spec.sown:
            counts[spec.crop_group] = counts.get(spec.crop_group, 0) + 1
    if counts:
        best = max(counts, key=lambda g: counts[g])
        return best if best in GROUPS else "other"
    return "other" if unknown else "fallow"


def _year_codes(group: str, previous: str, small_grain: str) -> list[str]:
    if group == "alfalfa":
        start = "alfalfa_dormant" if previous == "alfalfa" else "descanso_rastrojo"
        return [start] * 3 + ["alfalfa"] * 7 + ["alfalfa_dormant"] * 2
    if group == "small_grain":
        return ["descanso_rastrojo"] * 3 + [small_grain] * 4 + ["descanso_rastrojo"] * 5
    if group == "corn":
        return ["rastrojo_maiz"] * 4 + ["maiz"] * 6 + ["rastrojo_maiz"] * 2
    return ["barbecho"] * 12


def candidates(
    models_dir: Path,
    current: list[str],
    months: list[str],
    no_buyer: frozenset[str] | None,
) -> list[tuple[str, list[str], float]]:
    """(nombre, secuencia de 36 meses, probabilidad) de las rotaciones más comunes."""
    model = _load(str(models_dir))
    if model is None or len(current) < 24:
        return []
    by_year = [current[i : i + 12] for i in range(0, len(current), 12)]
    a, b = year_group(by_year[-2]), year_group(by_year[-1])
    current_groups = tuple(year_group(y) for y in by_year[-3:])
    blocked = no_buyer or frozenset()
    small_grain = next((c for c in SMALL_GRAIN_CHOICES if c not in blocked), SMALL_GRAIN_CHOICES[0])

    scored = []
    for seq in itertools.product(GROUPS, repeat=3):
        probability, p1, p2 = 1.0, a, b
        for group in seq:
            probability *= next_year(model, p1, p2).get(group, 0.0)
            p1, p2 = p2, group
        if probability < MIN_PROBABILITY:
            continue
        if sum(g in SOLD for g in seq) < 2 or seq == current_groups:
            continue  # regla: dos años con ingreso, y que sea un cambio real
        scored.append((seq, probability))
    scored.sort(key=lambda item: -item[1])

    out = []
    for seq, probability in scored[:MAX_CANDIDATES]:
        years, previous = [], b
        for group in seq:
            years.append(_year_codes(group, previous, small_grain))
            previous = group
        sequence = [years[i // 12][int(months[i][5:7]) - 1] for i in range(len(months))]
        name = (
            "rotación observada en campos parecidos: "
            + ", ".join(GROUP_LABEL[g] for g in seq)
            + f" ({probability:.0%} de probabilidad según el Modelo 5)"
        )
        out.append((name, sequence, probability))
    return out


def metric_note(models_dir: Path) -> str | None:
    model = _load(str(models_dir))
    if model is None:
        return None
    m = model["metrics"]
    extra = m.get("extra") or {}
    return (
        "Modelo 5 (secuencias de USDA CDL 2015–2024 en 5 valles; en Diamond Valley, sin verlo "
        f"al entrenar, log-verosimilitud {m['metric']['value']:.3f} contra "
        f"{m['baseline_metric']['value']:.3f} de repetir el año, exactitud "
        f"{extra.get('accuracy', 0):.1%} contra {extra.get('baseline_accuracy', 0):.1%})"
    )
