"""Corre farmer_context.py para todas las parcelas de una tabla del mismo condado.

El censo de QuickStats, los precios y CropScape son del CONDADO: son iguales
para todas sus parcelas. Aquí se piden una sola vez (se guardan en memoria) y
lo que sí cambia por parcela (agua de OpenET, ventana por temperatura,
maquinaria del cultivo actual) se calcula con su propia fila de la tabla.

    python farmer_context_batch.py --table ../backend/data/diamond_valley_fields.parquet \
        --parcels parcels/diamond_valley_fields.geojson --state NV --county EUREKA \
        --county-fips 32011 --name-es "Diamond Valley · pivote {n}" --name-en "Diamond Valley · pivot {n}"
"""

from __future__ import annotations

import argparse
import functools
import json
from pathlib import Path

import pandas as pd

import farmer_context as fc


def _freeze(kwargs: dict) -> tuple:
    return tuple(sorted(kwargs.items()))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--table", required=True)
    parser.add_argument("--parcels", required=True, help="GeoJSON con el orden y las notas")
    parser.add_argument("--state", required=True)
    parser.add_argument("--county", required=True)
    parser.add_argument("--county-fips", required=True)
    parser.add_argument("--name-es", required=True, help="usa {n} para el número")
    parser.add_argument("--name-en", required=True)
    parser.add_argument("--cdl-years", nargs="+", type=int, default=[2022, 2023, 2024])
    parser.add_argument("--price-from", type=int, default=2023)
    args = parser.parse_args()

    # Consultas del condado: una vez para todas las parcelas.
    quickstats_cache: dict[tuple, list[dict]] = {}
    original_quickstats = fc.quickstats

    def cached_quickstats(key: str, **params: str) -> list[dict]:
        frozen = _freeze(params)
        if frozen not in quickstats_cache:
            quickstats_cache[frozen] = original_quickstats(key, **params)
        return quickstats_cache[frozen]

    fc.quickstats = cached_quickstats
    fc.county_stats = functools.lru_cache(maxsize=None)(
        lambda client, fips, year: tuple(original_county_stats(client, fips, year))
    )

    table = pd.read_parquet(args.table)
    features = json.loads(Path(args.parcels).read_text(encoding="utf-8"))["features"]
    out_dir = Path(args.table).parent
    for n, feature in enumerate(features, start=1):
        parcel_id = feature["properties"]["parcel_id"]
        rows = table[table["parcel_id"] == parcel_id]
        try:
            context = fc.labeled_context(args, rows)
        except SystemExit as exc:
            print(f"{parcel_id}: se omite ({exc})")
            continue
        meta = {"name": {"es": args.name_es.format(n=n), "en": args.name_en.format(n=n)}} | context
        (out_dir / f"{parcel_id}.meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{parcel_id}: agua {meta['constraints']['max_water_mm_year']} mm/año", flush=True)


original_county_stats = fc.county_stats

if __name__ == "__main__":
    main()
