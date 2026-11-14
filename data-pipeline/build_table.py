"""Paso 3: junta las exportaciones de Earth Engine con NASA POWER y escribe GeoParquet.

Entrada: los CSV que dejó ee_export.py (descargados de Drive a una carpeta) y
el mismo GeoJSON de parcelas. Salida: una tabla mensual por parcela.

    python build_table.py --parcels parcels/diamond_valley.geojson \
        --exports exports/ --out exports/diamond_valley.parquet

POWER (sin llave) se pide en el centro de cada parcela con el cliente del
backend, que guarda caché en disco. La ET de referencia se calcula con las
mismas funciones FAO-56 del motor, para que datos y API usen una sola física.

Memoria: menos de 1 GB para decenas de parcelas. Para miles de parcelas usa
Colab o la máquina rentada.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from config import cdl_group

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "backend"))

from app.engine import climate  # noqa: E402
from app.engine import water_balance as wb  # noqa: E402
from app.sources.power import PowerClient  # noqa: E402

# Cómo se pinta el color de la tira: reflectancia 0.30 = blanco, gamma 2.2.
# Es una decisión de presentación, declarada aquí.
COLOR_WHITE_REFLECTANCE = 0.30
COLOR_GAMMA = 2.2


def to_hex(red: float, green: float, blue: float) -> str | None:
    values = np.array([red, green, blue], dtype=float)
    if np.isnan(values).any():
        return None
    scaled = np.clip(values / COLOR_WHITE_REFLECTANCE, 0, 1) ** (1 / COLOR_GAMMA)
    r, g, b = (int(round(v * 255)) for v in scaled)
    return f"#{r:02X}{g:02X}{b:02X}"


def power_monthly(lat: float, lon: float, elevation_m: float, start: date, end: date, client: PowerClient) -> pd.DataFrame:
    """Clima mensual de POWER para un punto: ET0, lluvia, temperaturas, heladas y calor."""
    daily = client.daily(lat, lon, start, end)
    v = daily.values
    rows = []
    for i, day in enumerate(daily.dates):
        inputs = [v[k][i] for k in ("T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "WS2M", "T2MDEW")]
        et0 = None
        if all(x is not None for x in inputs):
            tmax, tmin, rs, wind, tdew = inputs
            et0 = wb.et0_penman_monteith(
                tmax, tmin, rs, wind, wb.actual_vapor_pressure_from_dewpoint(tdew),
                elevation_m, lat, day.timetuple().tm_yday,
            )
        rows.append(
            {"month": f"{day.year:04d}-{day.month:02d}", "et0": et0, "rain": v["PRECTOTCORR"][i],
             "tmax": v["T2M_MAX"][i], "tmin": v["T2M_MIN"][i]}
        )
    frame = pd.DataFrame(rows)
    monthly = frame.groupby("month").agg(
        # min_count=días del mes: un mes con huecos sale vacío, no subestimado.
        et0_mm=("et0", lambda s: s.sum(min_count=len(s))),
        rain_mm=("rain", lambda s: s.sum(min_count=len(s))),
        tmax_c=("tmax", "mean"),
        tmin_c=("tmin", "mean"),
    )
    counts = climate.count_by_month(daily.dates, v["T2M_MIN"], v["T2M_MAX"])
    monthly["frost_days"] = pd.Series({c.month: c.frost_days for c in counts})
    monthly["heat_days"] = pd.Series({c.month: c.heat_days for c in counts})
    return monthly.reset_index()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--parcels", required=True)
    parser.add_argument("--exports", required=True, help="carpeta con los CSV de ee_export.py")
    parser.add_argument("--out", required=True, help="archivo .parquet de salida")
    parser.add_argument("--prefix", default=None)
    parser.add_argument("--power-cache", default=".cache/power")
    args = parser.parse_args()

    prefix = args.prefix or Path(args.parcels).stem
    exports = Path(args.exports)
    parcels = gpd.read_file(args.parcels)[["parcel_id", "valley", "geometry"]]

    monthly = pd.read_csv(exports / f"{prefix}_monthly.csv")
    static = pd.read_csv(exports / f"{prefix}_static.csv")
    cdl_path = exports / f"{prefix}_cdl.csv"

    # HLS puede venir en reflectancia (0 a 1) o en enteros escalados por 10000.
    if monthly[["red", "green", "blue"]].median().max() > 1.5:
        print("AVISO: la reflectancia parece escalada por 10000; se divide.")
        monthly[["red", "green", "blue"]] /= 10000
    monthly["hls_color_hex"] = [
        to_hex(r, g, b) for r, g, b in monthly[["red", "green", "blue"]].itertuples(index=False)
    ]
    monthly["year"] = monthly["month"].str[:4].astype(int)
    monthly["month_num"] = monthly["month"].str[5:7].astype(int)

    static["clay_pct"] = static.pop("clay_gkg") / 10
    static["sand_pct"] = static.pop("sand_gkg") / 10
    static["silt_pct"] = static.pop("silt_gkg") / 10
    static["soc_gkg"] = static.pop("soc_dgkg") / 10
    table = monthly.merge(static.drop(columns=["valley"]), on="parcel_id", how="left")

    if cdl_path.exists():
        cdl = pd.read_csv(cdl_path)
        cdl["crop_group"] = [cdl_group(None if pd.isna(c) else int(c)) for c in cdl["cdl_code"]]
        table = table.merge(cdl[["parcel_id", "year", "cdl_code", "crop_group"]], on=["parcel_id", "year"], how="left")
        previous = cdl.assign(year=cdl["year"] + 1).rename(columns={"crop_group": "prev_crop_group"})
        table = table.merge(previous[["parcel_id", "year", "prev_crop_group"]], on=["parcel_id", "year"], how="left")
    else:
        print("Sin CDL (región sin etiquetas): crop_group queda vacío.")
        table["cdl_code"] = pd.NA
        table["crop_group"] = pd.NA
        table["prev_crop_group"] = pd.NA
        table["openet_et_mm"] = np.nan

    client = PowerClient(Path(args.power_cache), timeout_s=60)
    start = date(int(table["year"].min()), 1, 1)
    end = min(date(int(table["year"].max()), 12, 31), date.today())
    centroids = parcels.to_crs(4326).geometry.representative_point()
    elevation = static.set_index("parcel_id")["elevation_m"]
    climate_frames = []
    for parcel_id, point in zip(parcels["parcel_id"], centroids, strict=True):
        print(f"POWER para {parcel_id} ({point.y:.3f}, {point.x:.3f})")
        frame = power_monthly(point.y, point.x, float(elevation.get(parcel_id, 0.0)), start, end, client)
        climate_frames.append(frame.assign(parcel_id=parcel_id))
    table = table.merge(pd.concat(climate_frames), on=["parcel_id", "month"], how="left")

    out = gpd.GeoDataFrame(table.merge(parcels[["parcel_id", "geometry"]], on="parcel_id"), crs=parcels.crs)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(args.out, index=False)

    print(f"\n{len(out)} filas, {out['parcel_id'].nunique()} parcelas, "
          f"{out['month'].min()} a {out['month'].max()} -> {args.out}")
    print("Porcentaje de valores vacíos por columna (revísalo antes de entrenar):")
    print((out.drop(columns='geometry').isna().mean() * 100).round(1).to_string())


if __name__ == "__main__":
    main()
