"""Lindero de UN campo a partir de su historia de verdor (Sentinel-2, 10 m).

Los píxeles de un mismo campo se siembran, riegan y cosechan juntos, así que su
NDVI sube y baja igual. Se arma una pila de NDVI mediano cada dos meses
(Sentinel-2 SR armonizado, nubes enmascaradas con SCL) y se crece desde el
punto dado hacia los píxeles conectados cuya historia difiere poco de la del
punto. Eso es el campo; se encoge 10 m para no tomar la orilla.

    python ee_field_boundary.py --point -100.1802 20.58452 --start 2024-01-01 --end 2026-01-01 \
        --parcel-id qro-sjr-01 --valley qro_sjr_pedro_escobedo --out parcels/queretaro.geojson

Es una propuesta derivada de datos: una persona la confirma en parcels/ver_parcelas.html.
"""

from __future__ import annotations

import argparse
import json

import ee

from ee_common import init_ee

S2 = "COPERNICUS/S2_SR_HARMONIZED"
KEEP_SCL = (4, 5)  # vegetación y suelo desnudo; fuera nubes, sombras, agua y nieve


def ndvi_stack(region: ee.Geometry, start: str, end: str) -> ee.Image:
    def clean(image: ee.Image) -> ee.Image:
        scl = image.select("SCL")
        ok = scl.eq(KEEP_SCL[0]).Or(scl.eq(KEEP_SCL[1]))
        ndvi = image.normalizedDifference(["B8", "B4"]).rename("ndvi").updateMask(ok)
        return ndvi.copyProperties(image, ["system:time_start"])

    collection = ee.ImageCollection(S2).filterBounds(region).filterDate(start, end).map(clean)
    months = ee.List.sequence(0, ee.Date(end).difference(ee.Date(start), "month").subtract(1), 2)

    def window(offset: ee.Number) -> ee.Image:
        s = ee.Date(start).advance(offset, "month")
        scenes = collection.filterDate(s, s.advance(2, "month"))
        empty = ee.Image.constant(0).rename("ndvi").toFloat().updateMask(0)
        return ee.Image(ee.Algorithms.If(scenes.size().gt(0), scenes.median(), empty)).rename("ndvi")

    stack = ee.ImageCollection(months.map(window)).toBands()
    return stack.unmask(0).clip(region)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--point", nargs=2, type=float, required=True, metavar=("LON", "LAT"))
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--parcel-id", required=True)
    parser.add_argument("--valley", required=True)
    parser.add_argument("--region-mode", default="unlabeled", choices=["labeled", "unlabeled"])
    parser.add_argument(
        "--max-diff", type=float, default=0.06,
        help="diferencia media de NDVI máxima contra la historia del punto (supuesto)",
    )
    parser.add_argument("--out", required=True)
    parser.add_argument("--project", default=None)
    args = parser.parse_args()

    init_ee(args.project)
    point = ee.Geometry.Point(args.point)
    region = point.buffer(800).bounds()
    stack = ndvi_stack(region, args.start, args.end)
    at_point = ee.Dictionary(stack.reduceRegion(ee.Reducer.first(), point, 10))
    names = stack.bandNames()
    seed = ee.Image.constant(names.map(lambda b: at_point.get(b))).rename(names)
    # Diferencia media de NDVI contra la historia del punto, periodo por periodo.
    distance = stack.subtract(seed).abs().reduce(ee.Reducer.mean())
    similar = distance.lt(args.max_diff).selfMask()
    components = similar.toInt().connectedComponents(ee.Kernel.plus(1), 1024).select("labels")
    label = components.reduceRegion(ee.Reducer.first(), point, 10).get("labels")
    field = components.eq(ee.Number(label)).selfMask()
    vectors = field.reduceToVectors(
        geometry=region, scale=10, geometryType="polygon", eightConnected=False, maxPixels=1e8
    )
    shape = vectors.filterBounds(point).first().geometry().buffer(-10, 1).simplify(5)
    info = ee.Dictionary(
        {"geometry": shape, "ha": shape.area(1).divide(1e4), "bands": stack.bandNames().size()}
    ).getInfo()
    ring = [[round(x, 6), round(y, 6)] for x, y in info["geometry"]["coordinates"][0]]
    note = (
        f"Propuesta derivada de datos: píxeles de Sentinel-2 (10 m) conectados al punto "
        f"{args.point[1]:.5f}, {args.point[0]:.5f} cuya historia de NDVI (mediana cada dos meses, "
        f"{args.start} a {args.end}, {info['bands']} periodos) difiere en promedio menos de "
        f"{args.max_diff} de la del punto; encogido 10 m. "
        f"{info['ha']:.1f} ha. Pendiente de confirmación visual por una persona."
    )
    feature = {
        "type": "Feature",
        "properties": {
            "parcel_id": args.parcel_id,
            "valley": args.valley,
            "region_mode": args.region_mode,
            "note": note,
        },
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }
    with open(args.out, "w", encoding="utf-8", newline="\n") as handle:
        json.dump({"type": "FeatureCollection", "features": [feature]}, handle, ensure_ascii=False, indent=1)
    print(f"{args.parcel_id}: {info['ha']:.1f} ha, {len(ring)} vértices -> {args.out}")


if __name__ == "__main__":
    main()
