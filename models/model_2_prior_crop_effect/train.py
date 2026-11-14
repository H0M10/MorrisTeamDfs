"""Modelo 2. Efecto del cultivo anterior (observacional).

Etiqueta: vigor máximo del año (NDVI máximo mensual) por parcela, con la
secuencia de cultivos de CDL. Algoritmo: XGBoost.
Métrica: mejora frente al mismo modelo sin el cultivo anterior, en un valle no visto.

Es observacional: describe "lo que pasó en campos parecidos". Nunca se
presenta como causa y no produce cifras de ahorro de agua.

    python models/model_2_prior_crop_effect/train.py --table tabla.parquet --test-valley diamond_valley_nv
    python models/model_2_prior_crop_effect/train.py --sample

Memoria: menos de 1 GB. Solo CPU.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import common  # noqa: E402

BASE_FEATURES = ["crop_code", "et0_season_mm", "rain_year_mm", "elevation_m", "clay_pct"]
PRIOR_FEATURES = [*BASE_FEATURES, "prev_crop_code"]
TARGET = "peak_ndvi"


def yearly(table: pd.DataFrame) -> pd.DataFrame:
    """Una fila por parcela y año."""
    season = table[table["month_num"].between(4, 9)]
    out = table.groupby(["parcel_id", "valley", "year"], as_index=False).agg(
        crop_group=("crop_group", "first"),
        prev_crop_group=("prev_crop_group", "first"),
        peak_ndvi=("ndvi", "max"),
        rain_year_mm=("rain_mm", "sum"),
        elevation_m=("elevation_m", "first"),
        clay_pct=("clay_pct", "first"),
    )
    et0 = season.groupby(["parcel_id", "year"], as_index=False).agg(et0_season_mm=("et0_mm", "sum"))
    out = out.merge(et0, on=["parcel_id", "year"], how="left")
    out = out[out["crop_group"].isin(common.CROP_GROUPS) & out["prev_crop_group"].isin(common.CROP_GROUPS)]
    out = out.dropna(subset=[TARGET]).copy()
    out["crop_code"] = common.crop_code(out["crop_group"])
    out["prev_crop_code"] = common.crop_code(out["prev_crop_group"])
    return out


def fit(train: pd.DataFrame, features: list[str]) -> xgb.Booster:
    return xgb.train(
        {"objective": "reg:squarederror", "max_depth": 4, "eta": 0.08, "subsample": 0.8, "nthread": 4, "seed": 7},
        xgb.DMatrix(train[features], label=train[TARGET]),
        num_boost_round=150,
    )


def main() -> None:
    args = common.parse_args(__doc__.splitlines()[0], "model_2_prior_crop_effect")
    table = yearly(common.load_table(args))
    train, test = common.split_by_valley(table, args.test_valley)
    fit_rows, last_year = common.split_last_year(train)

    with_prior = fit(fit_rows, PRIOR_FEATURES)
    without_prior = fit(fit_rows, BASE_FEATURES)

    def errors(frame: pd.DataFrame) -> tuple[float, float]:
        return (
            common.mae(frame[TARGET], with_prior.predict(xgb.DMatrix(frame[PRIOR_FEATURES]))),
            common.mae(frame[TARGET], without_prior.predict(xgb.DMatrix(frame[BASE_FEATURES]))),
        )

    mae_with, mae_without = errors(test)
    improvement = (mae_without - mae_with) / mae_without * 100 if mae_without > 0 else 0.0
    last_with, last_without = errors(last_year)
    print(f"Valle no visto: con cultivo anterior {mae_with:.4f} | sin él {mae_without:.4f} | mejora {improvement:+.1f} %")
    print(f"Último año:     con cultivo anterior {last_with:.4f} | sin él {last_without:.4f}")
    if improvement <= 0:
        print("El cultivo anterior NO mejora la predicción. Se reporta igual; la ficha dirá 'sin evidencia local'.")

    # Lo que se muestra al agricultor: diferencia media observada de vigor según el cultivo anterior.
    observed = (
        train.groupby(["crop_group", "prev_crop_group"])[TARGET].agg(["mean", "count"]).round(4).reset_index()
    )

    args.out.mkdir(parents=True, exist_ok=True)
    with_prior.save_model(str(args.out / "model.ubj"))
    common.write_metrics(
        args,
        common.metric_card(improvement, "%", f"Reducción del MAE de vigor máximo al agregar el cultivo anterior, en '{args.test_valley}'", "30 m", args.sample),
        common.metric_card(mae_without, "NDVI", f"MAE del mismo modelo sin el cultivo anterior, en '{args.test_valley}'", "30 m", args.sample),
        common.partition_text(args.test_valley),
        {"features": PRIOR_FEATURES, "mae_with_prior": round(mae_with, 5), "n_test": len(test),
         "observational_only": True,
         "observed_peak_ndvi_by_sequence": observed.to_dict(orient="records")},
    )


if __name__ == "__main__":
    main()
