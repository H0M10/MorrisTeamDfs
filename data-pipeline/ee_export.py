"""Paso 2: exporta la tabla mensual por parcela desde Earth Engine a Google Drive.

Para un GeoJSON de parcelas y un rango de años lanza tres tareas de exportación:
    <prefijo>_monthly.csv  una fila por parcela y mes: color medio (rojo, verde,
                           azul), NDVI, NDMI, BSI, NDTI, SMAP y OpenET
    <prefijo>_cdl.csv      una fila por parcela y año: clase de CDL (solo EE. UU.)
    <prefijo>_static.csv   una fila por parcela: elevación, pendiente y suelo

Todo el cruce corre en los servidores de Earth Engine. Aquí solo se arma la
petición: menos de 1 GB de memoria. Después corre build_table.py.

    python ee_export.py --parcels parcels/diamond_valley.geojson \
        --start-year 2022 --end-year 2024 --project <proyecto-ee> --wait

Corre antes ee_coverage.py para elegir los años.
"""

from __future__ import annotations

import argparse
import csv
import math
import time
from pathlib import Path

import ee

from config import COMMON_BANDS, HLS_FMASK_REJECT, HLS_L30_BANDS, HLS_S30_BANDS
from ee_common import init_ee, load_parcels, resolve_all, year_range

SCALE_M = 30


def _empty(names: list[str]) -> ee.Image:
    """Imagen totalmente enmascarada: un mes sin datos sale vacío, no inventado."""
    return ee.Image.constant([0] * len(names)).rename(names).toFloat().updateMask(0)


def hls_collection(resolved: dict[str, str], region: ee.Geometry) -> ee.ImageCollection:
    def prepare(bands: dict[str, str]):
        def apply(image: ee.Image) -> ee.Image:
            clear = image.select("Fmask").bitwiseAnd(HLS_FMASK_REJECT).eq(0)
            return (
                image.select(list(bands), list(bands.values()))
                .toFloat()
                .updateMask(clear)
                .copyProperties(image, ["system:time_start"])
            )

        return apply

    collection = (
        ee.ImageCollection(resolved["hls_l30"]).filterBounds(region).map(prepare(HLS_L30_BANDS))
    )
    if "hls_s30" in resolved:
        collection = collection.merge(
            ee.ImageCollection(resolved["hls_s30"]).filterBounds(region).map(prepare(HLS_S30_BANDS))
        )
    return collection


def monthly_table(
    parcels: ee.FeatureCollection,
    resolved: dict[str, str],
    start_year: int,
    end_year: int,
    labeled: bool,
) -> ee.FeatureCollection:
    region = parcels.geometry().bounds()
    hls = hls_collection(resolved, region)
    smap = ee.ImageCollection(resolved["smap"]).select(["sm_surface", "sm_rootzone"])
    openet = ee.ImageCollection(resolved["openet"]).select(["et_ensemble_mad"]) if labeled else None
    origin = ee.Date.fromYMD(start_year, 1, 1)

    def one_month(offset: ee.Number) -> ee.FeatureCollection:
        start = origin.advance(ee.Number(offset), "month")
        end = start.advance(1, "month")

        scenes = hls.filterDate(start, end)
        refl = ee.Image(
            ee.Algorithms.If(scenes.size().gt(0), scenes.median(), _empty(COMMON_BANDS))
        )
        ndvi = refl.normalizedDifference(["nir", "red"]).rename("ndvi")
        ndmi = refl.normalizedDifference(["nir", "swir1"]).rename("ndmi")
        ndti = refl.normalizedDifference(["swir1", "swir2"]).rename("ndti")
        bsi = refl.expression(
            "((s + r) - (n + b)) / ((s + r) + (n + b))",
            {
                "s": refl.select("swir1"),
                "r": refl.select("red"),
                "n": refl.select("nir"),
                "b": refl.select("blue"),
            },
        ).rename("bsi")
        image = refl.select(["red", "green", "blue"]).addBands([ndvi, ndmi, bsi, ndti])

        moisture = smap.filterDate(start, end)
        image = image.addBands(
            ee.Image(
                ee.Algorithms.If(
                    moisture.size().gt(0),
                    moisture.mean(),
                    _empty(["sm_surface", "sm_rootzone"]),
                )
            ).rename(["smap_sm_surface", "smap_sm_rootzone"])
        )
        if openet is not None:
            et = openet.filterDate(start, end)
            image = image.addBands(
                ee.Image(
                    ee.Algorithms.If(et.size().gt(0), et.sum(), _empty(["et_ensemble_mad"]))
                ).rename(["openet_et_mm"])
            )

        stats = image.reduceRegions(
            collection=parcels, reducer=ee.Reducer.mean(), scale=SCALE_M, tileScale=4
        )
        return stats.map(
            lambda feature: feature.set(
                {"month": start.format("YYYY-MM"), "hls_n_images": scenes.size()}
            ).setGeometry(None)
        )

    n_months = (end_year - start_year + 1) * 12
    return ee.FeatureCollection(ee.List.sequence(0, n_months - 1).map(one_month)).flatten()


def cdl_table(
    parcels: ee.FeatureCollection, resolved: dict[str, str], start_year: int, end_year: int
) -> ee.FeatureCollection:
    cdl = ee.ImageCollection(resolved["cdl"]).select("cropland")

    def one_year(year: ee.Number) -> ee.FeatureCollection:
        year = ee.Number(year).toInt()
        images = cdl.filterDate(ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year, 12, 31))
        image = ee.Image(ee.Algorithms.If(images.size().gt(0), images.first(), _empty(["cropland"])))
        stats = image.rename("cdl_code").reduceRegions(
            collection=parcels, reducer=ee.Reducer.mode(), scale=SCALE_M, tileScale=4
        )
        # Con una sola banda el reductor nombra la salida "mode".
        return stats.map(
            lambda feature: feature.set({"year": year, "cdl_code": feature.get("mode")}).setGeometry(None)
        )

    return ee.FeatureCollection(ee.List.sequence(start_year, end_year).map(one_year)).flatten()


def static_table(parcels: ee.FeatureCollection, resolved: dict[str, str]) -> ee.FeatureCollection:
    elevation = ee.Image(resolved["srtm"]).select([0], ["elevation_m"]).toFloat()
    slope_deg = ee.Terrain.slope(elevation)
    slope_pct = slope_deg.multiply(math.pi / 180).tan().multiply(100).rename("slope_pct")
    # SoilGrids: primera banda de cada producto (capa de 0 a 5 cm).
    soil = [
        ee.Image(resolved[key]).select([0], [name]).toFloat()
        for key, name in [
            ("soil_clay", "clay_gkg"),
            ("soil_sand", "sand_gkg"),
            ("soil_silt", "silt_gkg"),
            ("soil_soc", "soc_dgkg"),
        ]
    ]
    image = elevation.addBands([slope_pct, *soil])
    stats = image.reduceRegions(
        collection=parcels, reducer=ee.Reducer.mean(), scale=SCALE_M, tileScale=4
    )
    return stats.map(lambda feature: feature.setGeometry(None))


def export(collection: ee.FeatureCollection, name: str, folder: str, columns: list[str]):
    task = ee.batch.Export.table.toDrive(
        collection=collection,
        description=name,
        folder=folder,
        fileNamePrefix=name,
        fileFormat="CSV",
        selectors=columns,
    )
    task.start()
    print(f"  tarea lanzada: {name} (id {task.id}) -> Drive/{folder}/{name}.csv")
    return task


def export_local(
    collection: ee.FeatureCollection, out_dir: Path, name: str, columns: list[str]
) -> Path:
    """Descarga filas ya reducidas por Earth Engine directo a CSV local sin pasar por Drive."""
    out_dir.mkdir(parents=True, exist_ok=True)
    data = collection.select(columns, retainGeometry=False).getInfo()
    features = data.get("features", []) if isinstance(data, dict) else []
    dest = out_dir / f"{name}.csv"
    with dest.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for feature in features:
            props = feature.get("properties") or {}
            writer.writerow(
                {col: ("" if props.get(col) is None else props.get(col)) for col in columns}
            )
    print(f"  descargado local: {dest} ({len(features)} filas)")
    return dest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--parcels", required=True)
    parser.add_argument("--start-year", type=int, required=True)
    parser.add_argument("--end-year", type=int, required=True)
    parser.add_argument("--project", default=None)
    parser.add_argument("--unlabeled", action="store_true", help="región sin CDL ni OpenET")
    parser.add_argument("--drive-folder", default="fieldshift_exports")
    parser.add_argument(
        "--local-dir",
        default=None,
        help="descarga directa de CSV a esta carpeta sin hacer cola en Google Drive",
    )
    parser.add_argument("--prefix", default=None, help="por omisión, el nombre del GeoJSON")
    parser.add_argument("--wait", action="store_true", help="esperar a que terminen las tareas")
    args = parser.parse_args()
    if args.end_year < args.start_year:
        raise SystemExit("--end-year no puede ser menor que --start-year")

    init_ee(args.project)
    labeled = not args.unlabeled
    parcels, features = load_parcels(args.parcels)
    prefix = args.prefix or Path(args.parcels).stem
    resolved = resolve_all(labeled)

    print("Colecciones en uso y años que cubren sobre estas parcelas:")
    region = parcels.geometry().bounds()
    for key in ["hls_l30", "hls_s30", "smap", "cdl", "openet"]:
        if key not in resolved:
            continue
        years = year_range(resolved[key], region)
        span = f"{years[0]}-{years[1]}" if years else "sin imágenes"
        print(f"  {key:<8} {span:<12} {resolved[key]}")
        if years and (args.start_year < years[0] or args.end_year > years[1]):
            print(f"  AVISO: {key} no cubre todo {args.start_year}-{args.end_year}; esos meses saldrán vacíos.")

    print(f"\n{len(features)} parcelas, {args.start_year} a {args.end_year}. Lanzando exportaciones:")
    monthly_columns = [
        "parcel_id", "valley", "month", "hls_n_images", "red", "green", "blue",
        "ndvi", "ndmi", "bsi", "ndti", "smap_sm_surface", "smap_sm_rootzone",
    ] + (["openet_et_mm"] if labeled else [])
    jobs = [
        (
            monthly_table(parcels, resolved, args.start_year, args.end_year, labeled),
            f"{prefix}_monthly",
            monthly_columns,
        ),
        (
            static_table(parcels, resolved),
            f"{prefix}_static",
            ["parcel_id", "valley", "elevation_m", "slope_pct", "clay_gkg", "sand_gkg", "silt_gkg", "soc_dgkg"],
        ),
    ]
    if labeled:
        jobs.append(
            (
                cdl_table(parcels, resolved, args.start_year - 1, args.end_year),
                f"{prefix}_cdl",
                ["parcel_id", "valley", "year", "cdl_code"],
            )
        )

    if args.local_dir:
        out_dir = Path(args.local_dir)
        for collection, name, columns in jobs:
            export_local(collection, out_dir, name, columns)
        print("Descarga local terminada.")
        return

    tasks = [
        export(collection, name, args.drive_folder, columns)
        for collection, name, columns in jobs
    ]

    if not args.wait:
        print("\nSigue las tareas en https://code.earthengine.google.com/tasks")
        return
    while True:
        states = [task.status()["state"] for task in tasks]
        print("  estados:", states)
        if all(state in {"COMPLETED", "FAILED", "CANCELLED"} for state in states):
            break
        time.sleep(30)
    for task in tasks:
        status = task.status()
        if status["state"] != "COMPLETED":
            print(f"FALLÓ {status['description']}: {status.get('error_message')}")
    if any(task.status()["state"] != "COMPLETED" for task in tasks):
        raise SystemExit(1)
    print("Exportaciones terminadas.")


if __name__ == "__main__":
    main()
