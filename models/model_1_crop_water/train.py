"""Modelo 1. Agua que usa cada cultivo.

Etiqueta: OpenET mensual por parcela, con el cultivo de CDL.
Algoritmo: XGBoost. Métrica: error medio absoluto en mm en un valle no visto.
Línea base: FAO-56, ETc = Kc × ET0, con la tabla models/kc_monthly.csv.

    python models/model_1_crop_water/train.py --table tabla.parquet --test-valley diamond_valley_nv
    python models/model_1_crop_water/train.py --sample      (prueba de flujo, segundos)

Memoria: menos de 2 GB con cientos de miles de filas. Solo CPU.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import common  # noqa: E402

FEATURES = ["crop_code", "month_num", "et0_mm", "rain_mm", "tmax_c", "tmin_c", "ndvi", "ndmi", "elevation_m"]
TARGET = "openet_et_mm"


def fao56_baseline(table: pd.DataFrame, sample: bool) -> np.ndarray:
    """ETc = Kc × ET0 con la tabla de Kc por cultivo y mes."""
    path = common.REPO / "models" / "kc_monthly.csv"
    kc = pd.read_csv(path)
    if kc.empty:
        if not sample:
            raise SystemExit(
                f"{path} está vacío. Una persona debe llenarlo con los Kc de FAO-56 "
                "(HUMANO.md H-04). Sin línea base no se reporta el modelo."
            )
        # Solo en la prueba de flujo: una curva cualquiera, no es FAO-56.
        return (table["et0_mm"] * (0.3 + 0.7 * np.exp(-((table["month_num"] - 7) ** 2) / 8))).to_numpy()
    merged = table.merge(kc[["crop_group", "month_num", "kc"]], on=["crop_group", "month_num"], how="left")
    if merged["kc"].isna().any():
        missing = merged.loc[merged["kc"].isna(), ["crop_group", "month_num"]].drop_duplicates()
        raise SystemExit(f"Faltan Kc en kc_monthly.csv para:\n{missing.to_string(index=False)}")
    return (merged["kc"] * merged["et0_mm"]).to_numpy()


def main() -> None:
    args = common.parse_args(__doc__.splitlines()[0], "model_1_crop_water")
    table = common.load_table(args)
    table = table[table["crop_group"].isin(common.CROP_GROUPS)].dropna(subset=[TARGET, "et0_mm"]).copy()
    table["crop_code"] = common.crop_code(table["crop_group"])

    train, test = common.split_by_valley(table, args.test_valley)
    fit, last_year = common.split_last_year(train)

    booster = xgb.train(
        {"objective": "reg:absoluteerror", "max_depth": 5, "eta": 0.08, "subsample": 0.8,
         "colsample_bytree": 0.8, "nthread": 4, "seed": 7},
        xgb.DMatrix(fit[FEATURES], label=fit[TARGET]),
        num_boost_round=300,
        evals=[(xgb.DMatrix(last_year[FEATURES], label=last_year[TARGET]), "ultimo_anio")],
        early_stopping_rounds=30,
        verbose_eval=False,
    )

    def predict(frame: pd.DataFrame) -> np.ndarray:
        return booster.predict(xgb.DMatrix(frame[FEATURES]), iteration_range=(0, booster.best_iteration + 1))

    model_mae = common.mae(test[TARGET], predict(test))
    baseline_mae = common.mae(test[TARGET], fao56_baseline(test, args.sample))
    last_year_mae = common.mae(last_year[TARGET], predict(last_year))
    print(f"Valle no visto:  modelo {model_mae:.1f} mm | FAO-56 {baseline_mae:.1f} mm")
    print(f"Último año:      modelo {last_year_mae:.1f} mm")
    print("El modelo", "GANA" if model_mae < baseline_mae else "PIERDE", "contra la línea base. Se reporta igual.")

    args.out.mkdir(parents=True, exist_ok=True)
    booster.save_model(str(args.out / "model.ubj"))
    common.write_metrics(
        args,
        common.metric_card(model_mae, "mm", f"MAE mensual contra OpenET en '{args.test_valley}'", "30 m", args.sample),
        common.metric_card(baseline_mae, "mm", f"MAE de FAO-56 (Kc × ET0) en '{args.test_valley}'", "30 m", args.sample),
        common.partition_text(args.test_valley),
        {"features": FEATURES, "mae_last_year_mm": round(last_year_mae, 3), "n_test": len(test),
         "best_iteration": int(booster.best_iteration)},
    )


if __name__ == "__main__":
    main()
