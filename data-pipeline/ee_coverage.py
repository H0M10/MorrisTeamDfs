"""Paso 1: ¿qué años cubre cada colección sobre mis parcelas?

Se corre ANTES de fijar los años de las tablas (AGENTS.md sección 4). No
exporta nada: solo consulta el catálogo e imprime.

    python ee_coverage.py --parcels parcels/diamond_valley.geojson --project <proyecto-ee>
    python ee_coverage.py --parcels parcels/queretaro.geojson --unlabeled

Memoria: menos de 1 GB (todo el cómputo ocurre en Earth Engine).
"""

from __future__ import annotations

import argparse
import json

import ee

from config import SOURCES
from ee_common import init_ee, load_parcels, resolve, year_range


def coverage(parcels_path: str, labeled: bool) -> dict[str, dict]:
    parcels, _ = load_parcels(parcels_path)
    region = parcels.geometry().bounds()
    report: dict[str, dict] = {}
    for source in SOURCES:
        if source.labeled_only and not labeled:
            report[source.key] = {"status": "no aplica (región sin etiquetas)"}
            continue
        asset_id = resolve(source)
        if asset_id is None:
            report[source.key] = {"status": "NO ENCONTRADA", "candidates": list(source.candidates)}
            continue
        entry: dict = {"status": "ok", "id": asset_id, "native_scale": source.native_scale}
        if source.kind == "image":
            entry["bands"] = ee.Image(asset_id).bandNames().getInfo()
        else:
            entry["bands"] = ee.ImageCollection(asset_id).first().bandNames().getInfo()
            years = year_range(asset_id, region)
            entry["years"] = list(years) if years else None
            if years is None:
                entry["status"] = "SIN IMÁGENES SOBRE LA REGIÓN"
        report[source.key] = entry
    return report


def common_years(report: dict[str, dict], keys: list[str]) -> tuple[int, int] | None:
    """Años en que todas las fuentes pedidas tienen datos."""
    ranges = [tuple(report[k]["years"]) for k in keys if report.get(k, {}).get("years")]
    if len(ranges) < len(keys):
        return None
    start, end = max(r[0] for r in ranges), min(r[1] for r in ranges)
    return (start, end) if start <= end else None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--parcels", required=True)
    parser.add_argument("--project", default=None)
    parser.add_argument("--unlabeled", action="store_true", help="región sin CDL ni OpenET")
    parser.add_argument("--json", default=None, help="guardar el reporte en este archivo")
    args = parser.parse_args()

    init_ee(args.project)
    report = coverage(args.parcels, labeled=not args.unlabeled)

    print(f"\nCobertura sobre {args.parcels}\n" + "-" * 72)
    for key, entry in report.items():
        years = entry.get("years")
        span = f"{years[0]}-{years[1]}" if years else "-"
        print(f"{key:<10} {entry['status']:<34} {span:<10} {entry.get('id', '')}")
        if "bands" in entry:
            print(f"{'':<10} bandas: {', '.join(entry['bands'][:14])}")
    needed = ["hls_l30", "smap"] + ([] if args.unlabeled else ["cdl", "openet"])
    shared = common_years(report, needed)
    print("-" * 72)
    if shared:
        print(f"Años en común de {needed}: {shared[0]} a {shared[1]}")
        print(f"Sugerencia para 36 meses: --start-year {max(shared[0], shared[1] - 2)} --end-year {shared[1]}")
        print("Ojo: el último año puede estar incompleto. Revisa antes de fijarlo.")
    else:
        print(f"No hay años en común para {needed}. No fijes años todavía.")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, ensure_ascii=False)
        print(f"Reporte guardado en {args.json}")


if __name__ == "__main__":
    main()
