"""¿Dónde hay riego en una región sin etiquetas? Vegetación verde en temporada seca.

En regiones sin CDL (México) no hay un mapa de cultivos de la lista del reto.
Este guion ubica zonas probablemente regadas con un criterio declarado:

    En temporada seca (por omisión marzo a mayo) casi no llueve. Un píxel de
    30 m con NDVI mediano de HLS mayor que el umbral está verde sin lluvia.
    Además, en algún momento del año queda casi sin vegetación (percentil 10
    del NDVI anual menor que 0.3): se cosecha o se barbecha. Así se descartan
    bosques y vegetación siempre verde, que también están verdes en la seca.

Es una CONJETURA DE UBICACIÓN, no una etiqueta de cultivo. Sirve para que una
persona elija dónde trazar parcelas, no para afirmar qué se siembra. El umbral
(0.5) y los meses son supuestos y deben declararse.

Como contexto se da también la superficie de "tierras de cultivo" del mapa de
cobertura de MODIS (MCD12Q1, 500 m, esquema IGBP).

    python ee_irrigated_scout.py --areas parcels/mx_areas_busqueda.geojson --year 2025
    python ee_irrigated_scout.py --areas ... --year 2025 --patches 10 --out candidatos.geojson

Todo el cómputo corre en Earth Engine: menos de 1 GB de memoria local.
"""

from __future__ import annotations

import argparse
import json

import ee

from config import HLS_FMASK_REJECT, HLS_L30_BANDS, HLS_S30_BANDS
from ee_common import init_ee, load_parcels

MODIS_LANDCOVER = "MODIS/061/MCD12Q1"
CROPLAND_CLASSES = (12, 14)  # IGBP: 12 tierras de cultivo, 14 mosaico cultivo/vegetación natural


def hls_ndvi(region: ee.Geometry, start: ee.Date, end: ee.Date) -> ee.ImageCollection:
    def prepare(bands: dict[str, str]):
        def apply(image: ee.Image) -> ee.Image:
            clear = image.select("Fmask").bitwiseAnd(HLS_FMASK_REJECT).eq(0)
            named = image.select(list(bands), list(bands.values())).updateMask(clear)
            return named.normalizedDifference(["nir", "red"]).rename("ndvi")

        return apply

    l30 = ee.ImageCollection("NASA/HLS/HLSL30/v002").filterBounds(region).filterDate(start, end)
    s30 = ee.ImageCollection("NASA/HLS/HLSS30/v002").filterBounds(region).filterDate(start, end)
    return l30.map(prepare(HLS_L30_BANDS)).merge(s30.map(prepare(HLS_S30_BANDS)))


BARE_THRESHOLD = 0.3  # percentil 10 anual por debajo: el campo se queda sin vegetación


def scout(
    feature: dict,
    year: int,
    start_month: int,
    end_month: int,
    threshold: float,
    patches: int,
    landcover_year: int,
) -> dict:
    region = ee.Geometry(feature["geometry"])
    dry_start = ee.Date.fromYMD(year, start_month, 1)
    dry_end = ee.Date.fromYMD(year, end_month, 1).advance(1, "month")
    ndvi = hls_ndvi(region, dry_start, dry_end).median()
    yearly_low = (
        hls_ndvi(region, ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year + 1, 1, 1))
        .reduce(ee.Reducer.percentile([10]))
    )
    dry_green = ndvi.gt(threshold)
    green = dry_green.And(yearly_low.lt(BARE_THRESHOLD)).selfMask()
    pixel_ha = ee.Image.pixelArea().divide(10_000)

    def area(mask: ee.Image) -> ee.ComputedObject:
        return (
            pixel_ha.updateMask(mask)
            .reduceRegion(ee.Reducer.sum(), region, scale=30, maxPixels=1e10, tileScale=4)
            .get("area")
        )

    green_ha = area(green)
    dry_green_ha = area(dry_green.selfMask())
    observed_ha = (
        pixel_ha.updateMask(ndvi.mask())
        .reduceRegion(ee.Reducer.sum(), region, scale=30, maxPixels=1e10, tileScale=4)
        .get("area")
    )
    total_ha = region.area(1).divide(10_000)

    landcover = (
        ee.ImageCollection(MODIS_LANDCOVER)
        .filterDate(f"{landcover_year}-01-01", f"{landcover_year}-12-31")
        .first()
        .select("LC_Type1")
    )
    cropland = landcover.eq(CROPLAND_CLASSES[0]).Or(landcover.eq(CROPLAND_CLASSES[1])).selfMask()
    cropland_ha = (
        pixel_ha.updateMask(cropland)
        .reduceRegion(ee.Reducer.sum(), region, scale=500, maxPixels=1e10)
        .get("area")
    )
    landcover_year = ee.Date(landcover.get("system:time_start")).get("year")

    info = ee.Dictionary(
        {
            "green_ha": green_ha,
            "dry_green_ha": dry_green_ha,
            "observed_ha": observed_ha,
            "total_ha": total_ha,
            "cropland_ha": cropland_ha,
            "landcover_year": landcover_year,
        }
    ).getInfo()

    result = {
        "area_id": feature["properties"]["parcel_id"],
        "valley": feature["properties"]["valley"],
        "year": year,
        "dry_months": f"{start_month}-{end_month}",
        "ndvi_threshold": threshold,
        **{k: (round(v, 1) if isinstance(v, float) else v) for k, v in info.items()},
        "patches": [],
    }
    if patches:
        # Manchas verdes contiguas, a 60 m para no saturar; las más grandes primero.
        vectors = (
            green.toInt()
            .reduceToVectors(
                geometry=region,
                scale=60,
                geometryType="polygon",
                eightConnected=True,
                maxPixels=1e10,
                tileScale=4,
            )
            .map(lambda f: f.set("area_ha", f.geometry().area(1).divide(10_000)))
            .filter(ee.Filter.gte("area_ha", 20))
            .sort("area_ha", False)
            .limit(patches)
        )
        for item in vectors.getInfo()["features"]:
            centroid = ee.Geometry(item["geometry"]).centroid(1).coordinates().getInfo()
            result["patches"].append(
                {
                    "area_ha": round(item["properties"]["area_ha"], 1),
                    "lon": round(centroid[0], 4),
                    "lat": round(centroid[1], 4),
                    "geometry": item["geometry"],
                }
            )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--areas", required=True, help="GeoJSON con parcel_id y valley")
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--dry-start", type=int, default=3)
    parser.add_argument("--dry-end", type=int, default=5)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--patches", type=int, default=0, help="manchas más grandes a listar")
    parser.add_argument(
        "--landcover-year",
        type=int,
        default=None,
        help="año de MODIS MCD12Q1 (por omisión, el anterior: el más reciente puede venir vacío)",
    )
    parser.add_argument("--project", default=None)
    parser.add_argument("--out", help="GeoJSON con las manchas candidatas")
    args = parser.parse_args()

    init_ee(args.project)
    _, features = load_parcels(args.areas)
    landcover_year = args.landcover_year or args.year - 1
    results = [
        scout(
            f, args.year, args.dry_start, args.dry_end, args.threshold, args.patches, landcover_year
        )
        for f in features
    ]

    print(
        f"\nVerde en temporada seca ({args.dry_start}-{args.dry_end}/{args.year}), "
        f"NDVI mediano de HLS > {args.threshold}, y percentil 10 anual < {BARE_THRESHOLD} "
        "(supuestos)"
    )
    for r in results:
        print(f"\n{r['area_id']} ({r['valley']})")
        print(f"  superficie del área:            {r['total_ha']:>10,.0f} ha")
        print(f"  con dato de HLS sin nubes:      {r['observed_ha']:>10,.0f} ha")
        print(f"  verde en seca, cualquier cosa:  {r['dry_green_ha']:>10,.0f} ha")
        print(f"  verde en seca y se cosecha:     {r['green_ha']:>10,.0f} ha  <- prob. regado")
        print(f"  cultivo según MODIS {r['landcover_year']} (500 m): {r['cropland_ha']:>10,.0f} ha")
        for p in r["patches"]:
            print(f"    mancha {p['area_ha']:>7.1f} ha en {p['lat']}, {p['lon']}")

    if args.out:
        features_out = [
            {
                "type": "Feature",
                "properties": {
                    "area_id": r["area_id"],
                    "valley": r["valley"],
                    "area_ha": p["area_ha"],
                    "criterio": f"NDVI mediano HLS > {args.threshold} en meses "
                    f"{args.dry_start}-{args.dry_end} de {args.year} y percentil 10 anual "
                    f"< {BARE_THRESHOLD} (conjetura de riego, no etiqueta de cultivo)",
                },
                "geometry": p["geometry"],
            }
            for r in results
            for p in r["patches"]
        ]
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump({"type": "FeatureCollection", "features": features_out}, handle)
        print(f"\n{len(features_out)} manchas -> {args.out}")


if __name__ == "__main__":
    main()
