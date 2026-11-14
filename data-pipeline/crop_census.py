"""¿Qué se siembra de verdad? Superficie por cultivo y año desde USDA CDL (CropScape).

La lista de cultivos candidatos de la herramienta debe salir de aquí, no de una
tabla elegida a mano. Usa el servicio GetCDLStat de CropScape (sin llave), que
devuelve los acres de cada clase de CDL en un condado.

    python crop_census.py --fips 32011 --years 2021 2022 2023 2024
    python crop_census.py --fips 32011 32007 16083 --years 2022 2023 --out census.csv

Límites, que la ficha debe declarar:
- Es por CONDADO, no por valle ni por parcela. Para un valle hay que contar
  píxeles de CDL dentro del polígono (Earth Engine, ee_export.py).
- Las clases pequeñas (decenas de acres) tienen mucho error de clasificación en
  CDL: no se toman como prueba de que un cultivo se siembra ahí.
- Solo EE. UU. Para Querétaro no existe un equivalente en la lista del reto.

Memoria: unos MB. Se puede correr en la laptop.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

import httpx

SERVICE = "https://nassgeodata.gmu.edu/axis2/services/CDLService/GetCDLStat"
# Clases de CDL que no son cultivo (cobertura natural, agua, urbano).
NON_CROP = {
    "Shrubland", "Grassland/Pasture", "Barren", "Evergreen Forest", "Deciduous Forest",
    "Mixed Forest", "Open Water", "Developed/Open Space", "Developed/Low Intensity",
    "Developed/Med Intensity", "Developed/Medium Intensity", "Developed/High Intensity",
    "Woody Wetlands", "Herbaceous Wetlands", "Perennial Ice/Snow", "Clouds/No Data",
    "Grass/Pasture",  # en zonas áridas casi todo es pastizal de agostadero, no cultivo
}
MIN_ACRES = 100.0  # por debajo se marca como "poco confiable"


def bank_codes() -> dict[int, str]:
    """Clase de CDL -> crop_code del banco del equipo, si existe."""
    path = Path(__file__).resolve().parent.parent / "models" / "fao56_crop_bank.csv"
    if not path.exists():
        return {}
    out: dict[int, str] = {}
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            for code in filter(None, row["cdl_codes"].split(";")):
                out.setdefault(int(code), row["crop_code"])
    return out


def get(client: httpx.Client, url: str, **params: object) -> httpx.Response:
    """CropScape es lento: hasta tres intentos antes de rendirse."""
    for attempt in range(3):
        try:
            return client.get(url, params=params or None)
        except httpx.TimeoutException:
            if attempt == 2:
                raise
            print(f"  CropScape tardó demasiado; reintento {attempt + 1} de 2", file=sys.stderr)
    raise AssertionError("inalcanzable")


def county_stats(client: httpx.Client, fips: str, year: int) -> list[dict]:
    response = get(client, SERVICE, year=year, fips=fips, format="json")
    response.raise_for_status()
    match = re.search(r"<returnURL>(.*?)</returnURL>", response.text)
    if not match:
        raise RuntimeError(f"CropScape no devolvió datos para {fips} en {year}: {response.text[:200]}")
    raw = get(client, match.group(1)).text
    # El servicio responde JSON con llaves sin comillas.
    data = json.loads(re.sub(r'(\w+):(?=["\d\[{tf-])', r'"\1":', raw))
    return data["rows"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--fips", nargs="+", required=True, help="FIPS de condado (5 dígitos)")
    parser.add_argument("--years", nargs="+", type=int, required=True)
    parser.add_argument("--out", help="CSV de salida")
    args = parser.parse_args()

    in_bank = bank_codes()
    records = []
    with httpx.Client(timeout=180) as client:
        for fips in args.fips:
            for year in args.years:
                for row in county_stats(client, fips, year):
                    if row["category"] in NON_CROP:
                        continue
                    records.append(
                        {
                            "fips": fips,
                            "year": year,
                            "cdl_code": row["value"],
                            "cdl_class": row["category"],
                            "acres": row["acreage"],
                            "bank_crop_code": in_bank.get(row["value"], ""),
                            "source": f"USDA NASS CDL {year} vía CropScape GetCDLStat",
                            "native_scale": "30 m, agregado por condado",
                        }
                    )

    for fips in args.fips:
        rows = [r for r in records if r["fips"] == fips]
        classes = sorted({(r["cdl_code"], r["cdl_class"]) for r in rows},
                         key=lambda c: -max(r["acres"] for r in rows if r["cdl_code"] == c[0]))
        print(f"\nCondado {fips} (acres por año; * = menos de {MIN_ACRES:.0f} acres, poco confiable)")
        print(f"{'CDL':>4} {'clase':<30}" + "".join(f"{y:>10}" for y in args.years) + "  en el banco")
        for code, name in classes:
            by_year = {r["year"]: r["acres"] for r in rows if r["cdl_code"] == code}
            cells = "".join(
                f"{by_year.get(y, 0):>9.0f}{'*' if by_year.get(y, 0) < MIN_ACRES else ' '}"
                for y in args.years
            )
            print(f"{code:>4} {name:<30}{cells}  {in_bank.get(code, 'NO')}")

    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(records[0]))
            writer.writeheader()
            writer.writerows(records)
        print(f"\n{len(records)} filas -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
