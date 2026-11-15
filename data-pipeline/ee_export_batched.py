"""Exporta a CSV local por lotes, para cientos de parcelas y muchos años.

`getInfo` de Earth Engine corta en unas 5000 filas por consulta. Este script
parte las parcelas por valle y en lotes, y los meses por bloques de años, y va
escribiendo los mismos tres CSV que ee_export.py (`_monthly`, `_static`,
`_cdl`). Si se corta, vuelve a correrlo: salta los lotes que ya están en
`<local-dir>/parts/`.

El cálculo corre en Earth Engine; aquí solo llegan filas ya reducidas.

    python ee_export_batched.py --parcels parcels/train_fields.geojson \
        --start-year 2016 --end-year 2024 --local-dir exports/train_fields
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from collections import defaultdict
from pathlib import Path

import ee

from ee_common import init_ee, resolve_all
from ee_export import cdl_table, monthly_table, static_table

MONTHLY = [
    "parcel_id", "valley", "month", "hls_n_images", "red", "green", "blue",
    "ndvi", "ndmi", "bsi", "ndti", "smap_sm_surface", "smap_sm_rootzone", "openet_et_mm",
]
STATIC = ["parcel_id", "valley", "elevation_m", "slope_pct", "clay_gkg", "sand_gkg", "silt_gkg", "soc_dgkg"]
CDL = ["parcel_id", "valley", "year", "cdl_code"]


def collection(features: list[dict]) -> ee.FeatureCollection:
    return ee.FeatureCollection(
        [
            ee.Feature(
                ee.Geometry(f["geometry"]),
                {"parcel_id": f["properties"]["parcel_id"], "valley": f["properties"]["valley"]},
            )
            for f in features
        ]
    )


def fetch(fc: ee.FeatureCollection, columns: list[str], dest: Path, tries: int = 8) -> int:
    if dest.exists():
        return -1
    for attempt in range(1, tries + 1):
        try:
            data = fc.select(columns, retainGeometry=False).getInfo()
            break
        except ee.EEException as exc:
            print(f"    intento {attempt} falló: {str(exc)[:160]}")
            if attempt == tries:
                raise
            time.sleep(20 * attempt)
    rows = [f.get("properties") or {} for f in data.get("features", [])]
    tmp = dest.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({c: ("" if row.get(c) is None else row.get(c)) for c in columns})
    tmp.replace(dest)
    return len(rows)


def merge(parts: list[Path], dest: Path) -> int:
    count = 0
    with dest.open("w", encoding="utf-8", newline="") as out:
        header_written = False
        for part in sorted(parts):
            with part.open(encoding="utf-8") as handle:
                lines = handle.readlines()
            if not lines:
                continue
            if not header_written:
                out.write(lines[0])
                header_written = True
            out.writelines(lines[1:])
            count += len(lines) - 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--parcels", required=True)
    parser.add_argument("--start-year", type=int, required=True)
    parser.add_argument("--end-year", type=int, required=True)
    parser.add_argument("--local-dir", required=True)
    parser.add_argument("--prefix", default=None)
    parser.add_argument("--batch", type=int, default=100, help="parcelas por consulta")
    parser.add_argument("--years-per-call", type=int, default=2)
    parser.add_argument("--project", default=None)
    args = parser.parse_args()

    init_ee(args.project)
    resolved = resolve_all(labeled=True)
    prefix = args.prefix or Path(args.parcels).stem
    out_dir = Path(args.local_dir)
    parts_dir = out_dir / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)

    features = json.loads(Path(args.parcels).read_text(encoding="utf-8"))["features"]
    by_valley: dict[str, list[dict]] = defaultdict(list)
    for feature in features:
        by_valley[feature["properties"]["valley"]].append(feature)

    for valley, items in by_valley.items():
        batches = [items[i : i + args.batch] for i in range(0, len(items), args.batch)]
        for b, batch in enumerate(batches):
            fc = collection(batch)
            tag = f"{valley}_b{b:02d}"
            n = fetch(static_table(fc, resolved), STATIC, parts_dir / f"static_{tag}.csv")
            n2 = fetch(
                cdl_table(fc, resolved, args.start_year - 1, args.end_year),
                CDL,
                parts_dir / f"cdl_{tag}.csv",
            )
            print(f"{tag}: {len(batch)} parcelas, static {n}, cdl {n2}")
            for y0 in range(args.start_year, args.end_year + 1, args.years_per_call):
                y1 = min(y0 + args.years_per_call - 1, args.end_year)
                started = time.time()
                n = fetch(
                    monthly_table(fc, resolved, y0, y1, labeled=True),
                    MONTHLY,
                    parts_dir / f"monthly_{tag}_{y0}.csv",
                )
                note = "ya estaba" if n < 0 else f"{n} filas en {time.time() - started:.0f} s"
                print(f"  {y0}-{y1}: {note}", flush=True)

    for kind, columns in (("monthly", MONTHLY), ("static", STATIC), ("cdl", CDL)):
        del columns
        total = merge(list(parts_dir.glob(f"{kind}_*.csv")), out_dir / f"{prefix}_{kind}.csv")
        print(f"{prefix}_{kind}.csv: {total} filas")


if __name__ == "__main__":
    main()
