"""Muestra muchas parcelas de entrenamiento por valle, estratificadas por cultivo.

Para entrenar hacen falta cientos de campos, no 15. Este script no dibuja
linderos: toma puntos del INTERIOR de campos (el grupo de cultivo de USDA CDL es
el mismo en un cuadro de 5 x 5 píxeles alrededor, 150 m) en un año de
referencia, con el mismo número de puntos por grupo (alfalfa, grano pequeño,
maíz, barbecho) para que las clases raras no desaparezcan. Cada punto se vuelve
un círculo de 45 m de radio (unos 7 píxeles de 30 m), lejos de la orilla.

Los puntos quedan separados al menos `--min-spacing-m` para no tomar dos veces
el mismo campo. Lo que cada campo sembró cada año lo dice después CDL en
ee_export.py; el año de referencia solo sirve para equilibrar la muestra.

Todo el cálculo corre en Earth Engine; aquí solo llegan las coordenadas.

    python ee_sample_fields.py --valleys diamond_valley_nv millard_ut snake_river_id \
        --per-group 40 --ref-years 2022 --out parcels/train_fields_us.geojson
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import ee

from config import CDL_GROUPS
from ee_common import init_ee

# Zonas de riego elegidas por parecido con Diamond Valley (pivote, alfalfa y
# granos en clima frío y seco). Cajas en WGS84: oeste, sur, este, norte.
VALLEYS: dict[str, tuple[float, float, float, float]] = {
    "diamond_valley_nv": (-116.15, 39.45, -115.90, 39.85),
    "millard_ut": (-112.90, 39.15, -112.45, 39.55),
    "snake_river_id": (-114.95, 42.40, -114.30, 42.75),
    "lovelock_nv": (-118.65, 39.95, -118.30, 40.30),
    "mason_valley_nv": (-119.30, 38.80, -119.00, 39.15),
    "sevier_ut": (-112.25, 38.60, -111.90, 39.00),
}

GROUP_ORDER = ["alfalfa", "small_grain", "corn", "fallow"]
RADIUS_M = 45


def group_image(year: int) -> ee.Image:
    """CDL del año como grupo 1..4 (orden de GROUP_ORDER); lo demás queda enmascarado."""
    cdl = (
        ee.ImageCollection("USDA/NASS/CDL")
        .filterDate(f"{year}-01-01", f"{year}-12-31")
        .first()
        .select("cropland")
    )
    source: list[int] = []
    target: list[int] = []
    for index, name in enumerate(GROUP_ORDER, start=1):
        for code in CDL_GROUPS[name]:
            source.append(code)
            target.append(index)
    grouped = cdl.remap(source, target, 0).rename("group")
    # Interior: el grupo es el mismo en todo el cuadro de 5 x 5 píxeles.
    extremes = grouped.reduceNeighborhood(ee.Reducer.minMax(), ee.Kernel.square(2))
    interior = extremes.select("group_min").eq(extremes.select("group_max"))
    return grouped.updateMask(grouped.gt(0).And(interior)).toInt()


def sample_valley(
    valley: str, year: int, per_group: int, seed: int
) -> list[tuple[float, float, str]]:
    west, south, east, north = VALLEYS[valley]
    region = ee.Geometry.Rectangle([west, south, east, north])
    image = group_image(year)
    # Se piden de más: la separación mínima descarta puntos del mismo campo.
    points = image.stratifiedSample(
        numPoints=per_group * 4,
        classBand="group",
        region=region,
        scale=30,
        seed=seed,
        geometries=True,
        tileScale=4,
    ).getInfo()["features"]
    return [
        (
            f["geometry"]["coordinates"][0],
            f["geometry"]["coordinates"][1],
            GROUP_ORDER[int(f["properties"]["group"]) - 1],
        )
        for f in points
    ]


def meters_between(a: tuple[float, float], b: tuple[float, float]) -> float:
    x = math.radians(b[0] - a[0]) * math.cos(math.radians((a[1] + b[1]) / 2))
    y = math.radians(b[1] - a[1])
    return 6_371_000 * math.hypot(x, y)


def spaced(
    points: list[tuple[float, float, str]], per_group: int, min_spacing_m: float
) -> list[tuple[float, float, str]]:
    kept: list[tuple[float, float, str]] = []
    counts = dict.fromkeys(GROUP_ORDER, 0)
    for lon, lat, group in points:
        if counts[group] >= per_group:
            continue
        if any(meters_between((lon, lat), (k[0], k[1])) < min_spacing_m for k in kept):
            continue
        kept.append((lon, lat, group))
        counts[group] += 1
    return kept


def circle(lon: float, lat: float, radius_m: float, sides: int = 16) -> list[list[float]]:
    dlat = radius_m / 111_320
    dlon = radius_m / (111_320 * math.cos(math.radians(lat)))
    ring = [
        [
            round(lon + dlon * math.cos(2 * math.pi * i / sides), 6),
            round(lat + dlat * math.sin(2 * math.pi * i / sides), 6),
        ]
        for i in range(sides)
    ]
    return [*ring, ring[0]]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--valleys", nargs="+", default=list(VALLEYS), choices=list(VALLEYS))
    parser.add_argument("--per-group", type=int, default=40)
    parser.add_argument(
        "--ref-years", type=int, nargs="+", default=[2022],
        help="años de CDL para equilibrar; varios suman campos que rotan",
    )
    parser.add_argument("--min-spacing-m", type=float, default=500)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--project", default=None)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    init_ee(args.project)
    features = []
    for valley in args.valleys:
        raw = [
            point
            for year in args.ref_years
            for point in sample_valley(valley, year, args.per_group, args.seed + year)
        ]
        kept = spaced(raw, args.per_group, args.min_spacing_m)
        counts = {g: sum(1 for k in kept if k[2] == g) for g in GROUP_ORDER}
        print(f"{valley}: {len(kept)} parcelas {counts} (de {len(raw)} puntos)")
        for i, (lon, lat, group) in enumerate(kept, start=1):
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "parcel_id": f"{valley}-s{i:03d}",
                        "valley": valley,
                        "region_mode": "labeled",
                        "note": (
                            f"Muestra de entrenamiento: interior de campo con grupo {group} "
                            f"en USDA CDL {'/'.join(map(str, args.ref_years))} "
                            f"(5 x 5 píxeles iguales); círculo de "
                            f"{RADIUS_M} m. No es un lindero."
                        ),
                    },
                    "geometry": {"type": "Polygon", "coordinates": [circle(lon, lat, RADIUS_M)]},
                }
            )
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\n{len(features)} parcelas -> {args.out}")


if __name__ == "__main__":
    main()
