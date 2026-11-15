"""Modelo 4. Humedad con intervalo.

Etiqueta: humedad de SMAP (9 km, contexto regional). Se valida a escala de zona.
Algoritmo: balance FAO-56, residual con árboles (XGBoost por cuantiles) e
intervalo conformal (CQR) al 90 %.
Métrica: cobertura real del intervalo en un valle no visto.
Línea base: balance sin residual, con el rango histórico (percentiles 5 y 95
de cada mes del calendario) como intervalo.

    python models/model_4_moisture_cqr/train.py --table tabla.parquet --test-valley diamond_valley_nv
    python models/model_4_moisture_cqr/train.py --sample

Memoria: menos de 1 GB. Solo CPU.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import common  # noqa: E402

sys.path.insert(0, str(common.REPO / "backend"))
from app.engine import water_balance as wb  # noqa: E402

TARGET = "smap_sm_rootzone"
FEATURES = ["month_num", "et0_mm", "rain_mm", "tmax_c", "tmin_c", "ndvi", "root_zone_index"]
COVERAGE = 0.90
TAW_MM = 150.0  # supuesto declarado para el índice relativo; no es una medición


def zone_table(table: pd.DataFrame) -> pd.DataFrame:
    """Promedia por valle y mes (SMAP no distingue parcelas) y agrega el índice del balance."""
    zone = (
        table.groupby(["valley", "month", "year", "month_num"], as_index=False)[
            ["et0_mm", "rain_mm", "tmax_c", "tmin_c", "ndvi", TARGET]
        ]
        .mean()
        .sort_values(["valley", "month"])
        .dropna(subset=[TARGET, "et0_mm", "rain_mm"])
    )
    parts = []
    for _, group in zone.groupby("valley"):
        balance = wb.monthly_water_balance(
            group["et0_mm"].tolist(), group["rain_mm"].tolist(), [1.0] * len(group), taw_mm=TAW_MM
        )
        parts.append(group.assign(root_zone_index=[wb.root_zone_index(m.depletion_mm, TAW_MM) for m in balance]))
    return pd.concat(parts)


def coverage(truth: np.ndarray, lower: np.ndarray, upper: np.ndarray) -> float:
    return float(np.mean((truth >= lower) & (truth <= upper)) * 100)


def fit(rows: pd.DataFrame, alphas: np.ndarray):
    """Balance (recta índice -> SMAP) + residual por cuantiles. Devuelve (recta, árboles)."""
    slope, intercept = np.polyfit(rows["root_zone_index"], rows[TARGET], 1)
    residual = rows[TARGET] - (slope * rows["root_zone_index"] + intercept)
    booster = xgb.train(
        {"objective": "reg:quantileerror", "quantile_alpha": alphas, "max_depth": 3, "eta": 0.08,
         "subsample": 0.8, "nthread": 4, "seed": 7},
        xgb.QuantileDMatrix(rows[FEATURES], label=residual),
        num_boost_round=150,
    )
    return (float(slope), float(intercept)), booster


def interval(line: tuple[float, float], booster, frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    base = line[0] * frame["root_zone_index"].to_numpy() + line[1]
    quantiles = booster.predict(xgb.DMatrix(frame[FEATURES]))
    return base + quantiles[:, 0], base + quantiles[:, 1]


def main() -> None:
    args = common.parse_args(__doc__.splitlines()[0], "model_4_moisture_cqr")
    zone = zone_table(common.load_table(args))
    train, test = common.split_by_valley(zone, args.test_valley)
    alphas = np.array([(1 - COVERAGE) / 2, 1 - (1 - COVERAGE) / 2])

    # CQR con calibración dejando un valle fuera: cada valle de entrenamiento se
    # predice con un modelo que no lo vio. Así el margen conformal mide el error
    # al cambiar de valle, que es lo que pasa en el valle de prueba.
    scores = []
    for valley in sorted(train["valley"].unique()):
        held = train[train["valley"] == valley]
        line_v, booster_v = fit(train[train["valley"] != valley], alphas)
        low_v, high_v = interval(line_v, booster_v, held)
        truth_v = held[TARGET].to_numpy()
        scores.append(np.maximum(low_v - truth_v, truth_v - high_v))
    scores = np.concatenate(scores)
    level = min(1.0, math.ceil((len(scores) + 1) * COVERAGE) / len(scores))
    q_hat = float(np.quantile(scores, level, method="higher"))
    calibration = train  # todas sus filas sirvieron de calibración fuera de su valle

    # Modelo final con todos los valles de entrenamiento.
    (slope, intercept), booster = fit(train, alphas)

    def balance(frame: pd.DataFrame) -> np.ndarray:
        return slope * frame["root_zone_index"].to_numpy() + intercept

    def raw_interval(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        return interval((slope, intercept), booster, frame)

    low, high = raw_interval(test)
    model_coverage = coverage(test[TARGET].to_numpy(), low - q_hat, high + q_hat)
    width = float(np.mean((high + q_hat) - (low - q_hat)))

    # Línea base: balance sin residual y rango histórico por mes del calendario.
    spread = (train[TARGET] - balance(train)).groupby(train["month_num"]).quantile([0.05, 0.95]).unstack()
    offsets = spread.reindex(test["month_num"]).to_numpy()
    base = balance(test)
    baseline_coverage = coverage(test[TARGET].to_numpy(), base + offsets[:, 0], base + offsets[:, 1])
    baseline_width = float(np.mean(offsets[:, 1] - offsets[:, 0]))

    print(f"Valle no visto, a escala de zona ({len(test)} meses):")
    print(f"  CQR:            cobertura {model_coverage:.1f} % (objetivo {COVERAGE:.0%}), ancho medio {width:.4f} m3/m3")
    print(f"  Rango histórico: cobertura {baseline_coverage:.1f} %, ancho medio {baseline_width:.4f} m3/m3")
    if abs(model_coverage - COVERAGE * 100) > 10:
        print("  AVISO: la cobertura se aleja más de 10 puntos del objetivo. Dilo en la ficha.")

    args.out.mkdir(parents=True, exist_ok=True)
    booster.save_model(str(args.out / "model.ubj"))
    scale = "9 km (contexto regional, validado a escala de zona)"
    common.write_metrics(
        args,
        common.metric_card(model_coverage, "%", f"Cobertura real del intervalo CQR al 90 % en '{args.test_valley}'", scale, args.sample),
        common.metric_card(baseline_coverage, "%", f"Cobertura del rango histórico sobre el balance FAO-56 en '{args.test_valley}'", scale, args.sample),
        common.partition_text(args.test_valley),
        {"features": FEATURES, "target_coverage": COVERAGE, "conformal_q": q_hat,
         "balance_slope": float(slope), "balance_intercept": float(intercept), "taw_mm_assumed": TAW_MM,
         "mean_width_m3m3": round(width, 5), "baseline_mean_width_m3m3": round(baseline_width, 5),
         "n_calibration": len(calibration), "n_test": len(test)},
    )


if __name__ == "__main__":
    main()
