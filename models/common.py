"""Lo que comparten los cuatro guiones de entrenamiento.

Reglas de validación de AGENTS.md sección 5, puestas en código:
1. Se separa por valle, nunca por fila al azar (`split_by_valley`).
2. `split_last_year` separa un año; cada ficha aclara si se usa para selección o prueba.
3. Cada modelo se reporta contra su línea base aunque pierda (`write_metrics`).

`--sample` usa una tabla sintética pequeña solo para comprobar que el flujo
corre. Sus métricas se marcan con type "fixture", se guardan en models/_smoke/
y la API se niega a tratarlas como un modelo entrenado.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parent.parent
CROP_GROUPS = ["alfalfa", "small_grain", "corn", "fallow"]
CROP_CODE = {name: index for index, name in enumerate(CROP_GROUPS)}  # otros y vacío -> -1


def parse_args(description: str, model_name: str) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--table", help="tabla GeoParquet de /data-pipeline (varios valles)")
    parser.add_argument("--test-valley", help="valle que queda fuera para medir")
    parser.add_argument("--out", help="carpeta de salida del artefacto")
    parser.add_argument(
        "--sample", action="store_true", help="tabla sintética: solo prueba que el flujo corre"
    )
    args = parser.parse_args()
    if not args.sample and not (args.table and args.test_valley):
        parser.error("usa --table y --test-valley, o --sample para la prueba de flujo")
    default = REPO / ("models/_smoke" if args.sample else "backend/artifacts") / model_name
    args.out = Path(args.out) if args.out else default
    args.model_name = model_name
    return args


def load_table(args: argparse.Namespace) -> pd.DataFrame:
    if args.sample:
        args.test_valley = "valle_c"
        return sample_table()
    table = pd.read_parquet(args.table)
    return table.drop(columns=[c for c in ("geometry",) if c in table.columns])


def crop_code(series: pd.Series) -> pd.Series:
    return series.map(CROP_CODE).fillna(-1).astype(int)


def split_by_valley(table: pd.DataFrame, test_valley: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    valleys = sorted(table["valley"].dropna().unique())
    if test_valley not in valleys:
        raise SystemExit(f"El valle '{test_valley}' no está en la tabla. Hay: {valleys}")
    if len(valleys) < 2:
        raise SystemExit("Hace falta más de un valle: no se puede medir en un valle no visto.")
    test = table[table["valley"] == test_valley]
    train = table[table["valley"] != test_valley]
    print(f"Partición por valle: entrena en {[v for v in valleys if v != test_valley]} "
          f"({len(train)} filas), prueba en '{test_valley}' ({len(test)} filas)")
    return train, test


def split_last_year(table: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Deja fuera el último año de los valles de entrenamiento (segunda prueba)."""
    last = int(table["year"].max())
    return table[table["year"] < last], table[table["year"] == last]


def mae(truth: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs(np.asarray(truth) - np.asarray(predicted))))


def metric_card(value: float | None, unit: str, source: str, native_scale: str, sample: bool) -> dict:
    """Una cifra con su ficha, con la forma de MetricValue del contrato."""
    return {
        "value": None if value is None else round(float(value), 4),
        "unit": unit,
        "type": "fixture" if sample else "modeled",
        "source": source + (" (TABLA SINTÉTICA DE PRUEBA, no es una métrica real)" if sample else ""),
        "date": date.today().strftime("%Y-%m"),
        "native_scale": native_scale,
    }


def write_metrics(
    args: argparse.Namespace,
    metric: dict,
    baseline_metric: dict,
    partition: dict[str, str],
    extra: dict | None = None,
) -> None:
    args.out.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": args.model_name,
        "metric": metric,
        "baseline_metric": baseline_metric,
        "partition_method": partition,
        "test_valley": args.test_valley,
        "sample_run": bool(args.sample),
        "extra": extra or {},
    }
    path = args.out / "metrics.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nMétrica:    {metric['value']} {metric['unit']}")
    print(f"Línea base: {baseline_metric['value']} {baseline_metric['unit']}")
    print(f"Escrito {path}")
    if args.sample:
        print("PRUEBA DE FLUJO con datos sintéticos: estas cifras no significan nada.")
    else:
        print(f"Ahora llena models/{args.model_name}/CARD.md con estas cifras.")


def partition_text(test_valley: str) -> dict[str, str]:
    return {
        "es": f"Partición por valle: se mide en '{test_valley}', que no se usó para entrenar. "
        "La ficha documenta si el último año se usa para selección o prueba temporal.",
        "en": f"Split by valley: measured on '{test_valley}', never used for training. "
        "The model card documents whether the last year is used for selection or temporal testing.",
    }


def sample_table(seed: int = 7) -> pd.DataFrame:
    """Tabla sintética con las columnas de /data-pipeline. No describe ningún lugar real."""
    rng = np.random.default_rng(seed)
    rows = []
    for v, valley in enumerate(["valle_a", "valle_b", "valle_c"]):
        for p in range(6):
            previous = CROP_GROUPS[(p + v) % 4]
            for year in range(2021, 2025):
                crop = CROP_GROUPS[(p + v + year) % 4]
                peak = {"alfalfa": 0.8, "small_grain": 0.7, "corn": 0.85, "fallow": 0.2}[crop]
                peak += 0.05 if previous == "alfalfa" else 0.0
                center = {"alfalfa": 6.5, "small_grain": 5.5, "corn": 7.5, "fallow": 6.5}[crop]
                for month in range(1, 13):
                    season = np.exp(-((month - center) ** 2) / 8)
                    et0 = 30 + 170 * np.exp(-((month - 7) ** 2) / 10) + rng.normal(0, 5)
                    ndvi = 0.15 + (peak - 0.15) * season + rng.normal(0, 0.02)
                    rain = max(0.0, rng.normal(18, 8))
                    rows.append(
                        {
                            "parcel_id": f"{valley}-{p}", "valley": valley,
                            "month": f"{year}-{month:02d}", "year": year, "month_num": month,
                            "crop_group": crop, "prev_crop_group": previous,
                            "ndvi": ndvi, "ndmi": ndvi - 0.3 + rng.normal(0, 0.02),
                            "bsi": 0.3 - ndvi * 0.6 + rng.normal(0, 0.02),
                            "ndti": 0.2 - ndvi * 0.1 + rng.normal(0, 0.01),
                            "et0_mm": et0, "rain_mm": rain,
                            "tmax_c": 8 + 22 * np.exp(-((month - 7) ** 2) / 12),
                            "tmin_c": -8 + 20 * np.exp(-((month - 7) ** 2) / 12),
                            "openet_et_mm": max(0.0, et0 * (0.2 + 0.9 * ndvi) + rng.normal(0, 6)),
                            "smap_sm_rootzone": float(
                                np.clip(0.12 + 0.002 * rain - 0.0004 * et0 + 0.01 * v + rng.normal(0, 0.01), 0.03, 0.4)
                            ),
                            "elevation_m": 1500 + 150 * v, "clay_pct": 18 + 3 * v,
                        }
                    )
                previous = crop
    table = pd.DataFrame(rows)
    table["data_status"] = "fixture"
    return table
