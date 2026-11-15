"""Encuentra TODOS los campos de pivote de un valle, como parcelas completas.

A diferencia de ee_sample_fields.py (puntos de entrenamiento), aquí cada
parcela es un campo entero: una mancha de USDA CDL con el mismo grupo de
cultivo en el año de referencia, de tamaño de pivote y compacta (área / su
envolvente convexa >= 0.9, un círculo da casi 1). Se devuelve como círculo con
centro en el centroide y radio equivalente menos 20 m de orilla, igual que
ee_pick_parcels.py. Es una PROPUESTA DERIVADA DE DATOS, no un lindero oficial.

    python ee_valley_fields.py --valley diamond_valley_nv --year 2023 \
        --out parcels/diamond_valley_fields.geojson
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import ee

from config import CDL_GROUPS
from ee_common import init_ee
from ee_irrigated_scout import hls_ndvi
from ee_pick_parcels import EDGE_MARGIN_M, circle, ranked
from ee_sample_fields import GROUP_ORDER, VALLEYS, group_image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--valley", required=True, choices=list(VALLEYS))
    parser.add_argument("--year", type=int, default=2023)
    parser.add_argument("--min-ha", type=float, default=15)
    parser.add_argument("--max-ha", type=float, default=80)
    parser.add_argument("--min-compact", type=float, default=0.85)
    parser.add_argument("--min-ndvi", type=float, default=0.4)
    parser.add_argument("--id-prefix", default="dv-f")
    parser.add_argument("--project", default=None)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    init_ee(args.project)
    region = ee.Geometry.Rectangle(list(VALLEYS[args.valley]))
    cdl = (
        ee.ImageCollection("USDA/NASS/CDL")
        .filterDate(f"{args.year}-01-01", f"{args.year}-12-31")
        .first()
        .select("cropland")
    )
    # Mancha = píxeles vecinos con la misma clase de CDL dentro de los grupos del modelo.
    grouped = group_image(args.year).unmask(0)
    # El riego del pivote es verde en verano y las esquinas secas no: con el
    # vigor mediano de HLS de junio a agosto los círculos vecinos se separan.
    summer = hls_ndvi(
        region,
        ee.Date.fromYMD(args.year, 6, 1),
        ee.Date.fromYMD(args.year, 9, 1),
    ).median()
    vectors = (
        cdl.updateMask(grouped.gt(0).And(summer.gt(args.min_ndvi)))
        .toInt()
        .reduceToVectors(
            geometry=region, scale=30, geometryType="polygon", eightConnected=False,
            labelProperty="cdl_code", maxPixels=1e10, tileScale=4,
        )
    )
    fields = [
        f for f in ranked(vectors, args.min_ha, args.max_ha)
        if f["properties"]["compact"] >= args.min_compact
    ]
    fields.sort(key=lambda f: (-f["properties"]["center"][1], f["properties"]["center"][0]))
    print(f"{len(fields)} campos de pivote en {args.valley} ({args.year})")

    features = []
    for i, field in enumerate(fields, start=1):
        p = field["properties"]
        lon, lat = p["center"]
        radius = math.sqrt(p["ha"] * 1e4 / math.pi) - EDGE_MARGIN_M
        code = int(p["cdl_code"])
        group = next((g for g in GROUP_ORDER if code in CDL_GROUPS[g]), "other")
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "parcel_id": f"{args.id_prefix}{i:03d}",
                    "valley": args.valley,
                    "region_mode": "labeled",
                    "cdl_code_ref": code,
                    "group_ref": group,
                    "note": (
                        f"Propuesta derivada de datos: campo con clase {code} de USDA CDL y vigor "
                        f"de verano de HLS > {args.min_ndvi} en {args.year}; {p['ha']:.1f} ha, compacidad {p['compact']:.2f}. Círculo "
                        f"con radio equivalente menos {EDGE_MARGIN_M} m ({radius:.0f} m). "
                        "No es un lindero oficial."
                    ),
                },
                "geometry": {"type": "Polygon", "coordinates": [circle(lon, lat, radius)]},
            }
        )
    Path(args.out).write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
        encoding="utf-8",
    )
    counts: dict[str, int] = {}
    for f in features:
        counts[f["properties"]["group_ref"]] = counts.get(f["properties"]["group_ref"], 0) + 1
    print(counts, "->", args.out)


if __name__ == "__main__":
    main()
