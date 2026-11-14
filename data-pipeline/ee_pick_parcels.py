"""Propone el polígono de una parcela a partir de los datos, para que una persona lo confirme.

Dos modos:

  pivot   EE. UU.: busca campos donde USDA CDL dio la misma clase todos los años
          pedidos, se queda con el más compacto y cercano al centro y devuelve un
          círculo (centro y radio equivalente del campo, con un margen hacia
          adentro para no tomar píxeles de orilla).

  scout   Sin etiquetas: busca manchas verdes en temporada seca que además se
          cosechan (mismo criterio de ee_irrigated_scout.py), se queda con la
          más compacta y devuelve su envolvente encogida.

El resultado es una PROPUESTA DERIVADA DE DATOS, no un lindero oficial. Lleva
en `note` cómo se obtuvo. Confírmalo a ojo (parcels/ver_parcelas.html).

    python ee_pick_parcels.py pivot --center -116.03 39.68 --cdl-class 36 \
        --years 2022 2023 2024 --parcel-id dv-nv-01 --valley diamond_valley_nv \
        --out parcels/diamond_valley.geojson
    python ee_pick_parcels.py scout --bbox -100.25 20.30 -99.90 20.62 --year 2025 \
        --parcel-id qro-sjr-01 --valley qro_sjr_pedro_escobedo --out parcels/queretaro.geojson
"""

from __future__ import annotations

import argparse
import json
import math

import ee

from ee_common import init_ee
from ee_irrigated_scout import BARE_THRESHOLD, hls_ndvi

EDGE_MARGIN_M = 20


def ranked(vectors: ee.FeatureCollection, min_ha: float, max_ha: float) -> list[dict]:
    """Manchas dentro del rango de tamaño, con su compacidad (área / envolvente convexa)."""
    described = (
        vectors.map(
            lambda f: f.set(
                {
                    "ha": f.geometry().area(1).divide(1e4),
                    "hull_ha": f.geometry().convexHull(1).area(1).divide(1e4),
                    "center": f.geometry().centroid(1).coordinates(),
                }
            )
        )
        .filter(ee.Filter.gte("ha", min_ha))
        .filter(ee.Filter.lte("ha", max_ha))
    )
    items = described.getInfo()["features"]
    for item in items:
        item["properties"]["compact"] = item["properties"]["ha"] / item["properties"]["hull_ha"]
    return items


def km_between(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    x = math.radians(lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
    return 6371.0 * math.hypot(x, math.radians(lat2 - lat1))


def circle(lon: float, lat: float, radius_m: float, points: int = 48) -> list[list[float]]:
    ring = []
    for i in range(points):
        angle = 2 * math.pi * i / points
        dlat = radius_m * math.sin(angle) / 111_195
        dlon = radius_m * math.cos(angle) / (111_195 * math.cos(math.radians(lat)))
        ring.append([round(lon + dlon, 6), round(lat + dlat, 6)])
    return [*ring, ring[0]]


def pick_pivot(args: argparse.Namespace) -> tuple[dict, str]:
    lon, lat = args.center
    area = ee.Geometry.Point([lon, lat]).buffer(args.radius_km * 1000)
    cdl = ee.ImageCollection("USDA/NASS/CDL").select("cropland")
    stable = ee.Image(1)
    for year in args.years:
        image = cdl.filterDate(f"{year}-01-01", f"{year}-12-31").first()
        stable = stable.And(image.eq(args.cdl_class))
    vectors = stable.selfMask().toInt().reduceToVectors(
        geometry=area, scale=30, geometryType="polygon", eightConnected=False, maxPixels=1e9
    )
    fields = [f for f in ranked(vectors, args.min_ha, args.max_ha) if f["properties"]["compact"] >= 0.9]
    if not fields:
        raise SystemExit("No hay campos compactos con esa clase en todos los años pedidos.")
    best = min(fields, key=lambda f: km_between(lon, lat, *f["properties"]["center"]))
    p = best["properties"]
    c_lon, c_lat = p["center"]
    radius = math.sqrt(p["ha"] * 1e4 / math.pi) - EDGE_MARGIN_M
    years = f"{args.years[0]}-{args.years[-1]}"
    note = (
        f"Propuesta derivada de datos: campo donde USDA CDL dio la clase {args.cdl_class} en "
        f"{years}; {p['ha']:.1f} ha, compacidad {p['compact']:.2f}. Círculo con centro en el "
        f"centroide y radio equivalente menos {EDGE_MARGIN_M} m ({radius:.0f} m). "
        "Pendiente de confirmación visual por una persona."
    )
    print(f"Pivote elegido: {p['ha']:.1f} ha en {c_lat:.5f}, {c_lon:.5f} "
          f"({km_between(lon, lat, c_lon, c_lat):.1f} km del centro), radio {radius:.0f} m")
    return {"type": "Polygon", "coordinates": [circle(c_lon, c_lat, radius)]}, note


def pick_scout(args: argparse.Namespace) -> tuple[dict, str]:
    region = ee.Geometry.Rectangle(args.bbox)
    dry = hls_ndvi(
        region,
        ee.Date.fromYMD(args.year, args.dry_start, 1),
        ee.Date.fromYMD(args.year, args.dry_end, 1).advance(1, "month"),
    ).median()
    low = hls_ndvi(
        region, ee.Date.fromYMD(args.year, 1, 1), ee.Date.fromYMD(args.year + 1, 1, 1)
    ).reduce(ee.Reducer.percentile([10]))
    green = dry.gt(args.threshold).And(low.lt(BARE_THRESHOLD)).selfMask()
    vectors = green.toInt().reduceToVectors(
        geometry=region, scale=30, geometryType="polygon", eightConnected=False,
        maxPixels=1e10, tileScale=8,
    )
    fields = ranked(vectors, args.min_ha, args.max_ha)
    if not fields:
        raise SystemExit("No hay manchas en ese rango de tamaño.")
    fields.sort(key=lambda f: -f["properties"]["compact"])
    print("Manchas más compactas (compacidad, ha, lat, lon):")
    for f in fields[:6]:
        q = f["properties"]
        print(f"  {q['compact']:.2f}  {q['ha']:>6.1f}  {q['center'][1]:.5f}, {q['center'][0]:.5f}")
    best = fields[args.rank - 1]
    p = best["properties"]
    shape = (
        ee.Geometry(best["geometry"]).convexHull(1).buffer(-EDGE_MARGIN_M, 1).simplify(10)
    )
    geometry = shape.getInfo()
    ring = [[round(x, 6), round(y, 6)] for x, y in geometry["coordinates"][0]]
    note = (
        f"Propuesta derivada de datos: mancha de {p['ha']:.1f} ha (compacidad {p['compact']:.2f}) "
        f"con NDVI mediano de HLS > {args.threshold} en los meses {args.dry_start}-{args.dry_end} "
        f"de {args.year} y percentil 10 anual < {BARE_THRESHOLD} (probable riego; no dice qué "
        f"cultivo). Envolvente convexa encogida {EDGE_MARGIN_M} m. Puede abarcar más de un "
        "campo. Pendiente de confirmación visual por una persona."
    )
    print(f"Mancha elegida (#{args.rank}): {p['ha']:.1f} ha en {p['center'][1]:.5f}, {p['center'][0]:.5f}")
    return {"type": "Polygon", "coordinates": [ring]}, note


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="mode", required=True)
    for name in ("pivot", "scout"):
        p = sub.add_parser(name)
        p.add_argument("--parcel-id", required=True)
        p.add_argument("--valley", required=True)
        p.add_argument("--out", required=True)
        p.add_argument("--project", default=None)
        p.add_argument("--min-ha", type=float, default=35 if name == "pivot" else 15)
        p.add_argument("--max-ha", type=float, default=70 if name == "pivot" else 60)
    pivot = sub.choices["pivot"]
    pivot.add_argument("--center", nargs=2, type=float, required=True, metavar=("LON", "LAT"))
    pivot.add_argument("--radius-km", type=float, default=9)
    pivot.add_argument("--cdl-class", type=int, required=True)
    pivot.add_argument("--years", nargs="+", type=int, required=True)
    scout = sub.choices["scout"]
    scout.add_argument("--bbox", nargs=4, type=float, required=True, metavar=("W", "S", "E", "N"))
    scout.add_argument("--year", type=int, required=True)
    scout.add_argument("--dry-start", type=int, default=3)
    scout.add_argument("--dry-end", type=int, default=5)
    scout.add_argument("--threshold", type=float, default=0.5)
    scout.add_argument("--rank", type=int, default=1, help="1 = la más compacta")
    args = parser.parse_args()

    init_ee(args.project)
    geometry, note = pick_pivot(args) if args.mode == "pivot" else pick_scout(args)
    feature = {
        "type": "Feature",
        "properties": {
            "parcel_id": args.parcel_id,
            "valley": args.valley,
            "region_mode": "labeled" if args.mode == "pivot" else "unlabeled",
            "note": note,
        },
        "geometry": geometry,
    }
    with open(args.out, "w", encoding="utf-8", newline="\n") as handle:
        json.dump({"type": "FeatureCollection", "features": [feature]}, handle, ensure_ascii=False, indent=1)
    print(f"-> {args.out}")


if __name__ == "__main__":
    main()
