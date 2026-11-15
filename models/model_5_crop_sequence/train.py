"""Modelo 5. Secuencias de cultivo: qué siembran los agricultores después de qué.

Etiqueta real: grupo de cultivo de USDA CDL de cada año, por campo (2015–2024).
Algoritmo: cadena de Markov de segundo orden (el año depende de los dos anteriores)
con respaldo a primer orden y a frecuencias generales cuando una pareja de años
casi no aparece (suavizado de Laplace). Es conteo: entrena en segundos, sin GPU.
Métrica: exactitud y log-verosimilitud al predecir el cultivo del año siguiente en
un valle no visto. Línea base: "repetir el cultivo del año pasado".

Uso en la herramienta: genera las rotaciones de 3 años que de verdad se hacen en
campos parecidos; las reglas filtran y el Modelo 1 las ordena por agua. Es
observacional ("lo que hacen campos parecidos"), no una receta óptima.

    python models/model_5_crop_sequence/train.py --table tabla.parquet --test-valley diamond_valley_nv
"""

from __future__ import annotations

import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import common  # noqa: E402

STATES = [*common.CROP_GROUPS, "other"]
MIN_PAIR_COUNT = 5  # menos casos que esto: se mezcla con el primer orden
ALPHA = 1.0  # suavizado de Laplace


def yearly_groups(table: pd.DataFrame) -> pd.DataFrame:
    """Un grupo por campo y año. El año anterior al primero sale de prev_crop_group."""
    years = table.groupby(["parcel_id", "valley", "year"], as_index=False)["crop_group"].first()
    first = table.sort_values("month").groupby(["parcel_id", "valley"], as_index=False).first()
    before = first.assign(year=first["year"] - 1, crop_group=first["prev_crop_group"])[
        ["parcel_id", "valley", "year", "crop_group"]
    ]
    out = pd.concat([before, years]).dropna(subset=["crop_group"])
    out["state"] = out["crop_group"].where(out["crop_group"].isin(common.CROP_GROUPS), "other")
    return out.sort_values(["parcel_id", "year"])


def triples(groups: pd.DataFrame) -> list[tuple[str, str, str]]:
    out = []
    for _, field in groups.groupby("parcel_id"):
        states = field.sort_values("year")["state"].tolist()
        out.extend(zip(states, states[1:], states[2:], strict=False))
    return out


class Markov:
    def __init__(self, data: list[tuple[str, str, str]]) -> None:
        self.second: dict[str, Counter] = defaultdict(Counter)
        self.first: dict[str, Counter] = defaultdict(Counter)
        self.base: Counter = Counter()
        for a, b, c in data:
            self.second[f"{a}|{b}"][c] += 1
            self.first[b][c] += 1
            self.base[c] += 1

    @staticmethod
    def _dist(counts: Counter) -> dict[str, float]:
        total = sum(counts.values()) + ALPHA * len(STATES)
        return {s: (counts.get(s, 0) + ALPHA) / total for s in STATES}

    def predict(self, a: str, b: str) -> dict[str, float]:
        """P(año siguiente | dos años anteriores), con respaldo si hay pocos casos."""
        pair = self.second.get(f"{a}|{b}", Counter())
        first = self._dist(self.first.get(b, Counter()))
        n = sum(pair.values())
        if n == 0:
            return first
        weight = min(1.0, n / (n + MIN_PAIR_COUNT))
        second = self._dist(pair)
        return {s: weight * second[s] + (1 - weight) * first[s] for s in STATES}

    def to_json(self) -> dict:
        return {
            "states": STATES,
            "alpha": ALPHA,
            "min_pair_count": MIN_PAIR_COUNT,
            "second": {k: dict(v) for k, v in self.second.items()},
            "first": {k: dict(v) for k, v in self.first.items()},
            "base": dict(self.base),
        }


def evaluate(model: Markov, data: list[tuple[str, str, str]]) -> dict[str, float]:
    hits = base_hits = 0
    loglik = base_loglik = 0.0
    eps = 0.05  # la línea base con 95 % a repetir y el resto repartido
    for a, b, c in data:
        dist = model.predict(a, b)
        hits += max(dist, key=dist.get) == c
        loglik += math.log(dist[c])
        base_hits += b == c
        base_loglik += math.log(1 - eps if b == c else eps / (len(STATES) - 1))
    n = len(data)
    return {
        "accuracy": hits / n,
        "baseline_accuracy": base_hits / n,
        "loglik_per_year": loglik / n,
        "baseline_loglik_per_year": base_loglik / n,
        "n": n,
    }


def main() -> None:
    args = common.parse_args(__doc__.splitlines()[0], "model_5_crop_sequence")
    groups = yearly_groups(common.load_table(args))
    train, test = common.split_by_valley(groups, args.test_valley)
    last = int(train["year"].max())
    model = Markov(triples(train))
    unseen = evaluate(model, triples(test))
    fit_rows = train[train["year"] < last]
    last_year = [
        (a, b, c)
        for _, field in train.groupby("parcel_id")
        for a, b, c in [tuple(field.sort_values("year")["state"].tolist()[-3:])]
        if len(field) >= 3
    ]
    last_year_eval = evaluate(Markov(triples(fit_rows)), last_year)

    print(f"Valle no visto ({unseen['n']} años-campo):")
    print(f"  Markov:          exactitud {unseen['accuracy']:.3f}, log-verosimilitud {unseen['loglik_per_year']:.3f}")
    print(f"  Repetir el año:  exactitud {unseen['baseline_accuracy']:.3f}, log-verosimilitud {unseen['baseline_loglik_per_year']:.3f}")
    print(f"Último año de entrenamiento: exactitud {last_year_eval['accuracy']:.3f} contra {last_year_eval['baseline_accuracy']:.3f}")

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "transitions.json").write_text(
        json.dumps(model.to_json(), indent=1), encoding="utf-8"
    )
    scale = "30 m (campo)"
    common.write_metrics(
        args,
        common.metric_card(
            round(unseen["loglik_per_year"], 4), "log-verosimilitud por año",
            f"Log-verosimilitud media del cultivo del año siguiente en '{args.test_valley}' "
            "(más alto es mejor)", scale, args.sample,
        ),
        common.metric_card(
            round(unseen["baseline_loglik_per_year"], 4), "log-verosimilitud por año",
            f"Repetir el cultivo del año anterior (95 %) en '{args.test_valley}'", scale, args.sample,
        ),
        common.partition_text(args.test_valley),
        {
            "states": STATES,
            "accuracy": round(unseen["accuracy"], 4),
            "baseline_accuracy": round(unseen["baseline_accuracy"], 4),
            "n_test_years": unseen["n"],
            "n_train_years": len(triples(train)),
            "train_valleys": sorted(train["valley"].unique()),
            "years": [int(groups["year"].min()), int(groups["year"].max())],
            "last_year_accuracy": round(last_year_eval["accuracy"], 4),
            "last_year_baseline_accuracy": round(last_year_eval["baseline_accuracy"], 4),
            "observational_only": True,
        },
    )


if __name__ == "__main__":
    main()
