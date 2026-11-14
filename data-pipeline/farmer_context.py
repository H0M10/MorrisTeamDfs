"""Arma `<parcel_id>.meta.json` con lo que los datos pueden decir sobre el agricultor.

Las restricciones (agua, maquinaria, comprador, ventana de siembra) normalmente las
declara el agricultor. Cuando no hay uno, este guion las saca de los datos que
existen y escribe en `constraints_source` de dónde salió cada una. Todo queda como
SUPUESTO CON DATOS (type "assumed"): un agricultor real las reemplaza.

De dónde sale cada cosa:

| Restricción | EE. UU. (con etiquetas) | México (sin etiquetas) |
| --- | --- | --- |
| Agua máxima | Riego que ya usa el campo según OpenET (no se le da agua extra) | Agua estimada con FAO-56 para el historial supuesto |
| Ventana de siembra | Meses con temperatura media de 5 °C o más (NASA POWER) | Igual |
| Maquinaria | La que pide el cultivo actual (banco de cultivos) | Supuesto: riego por gravedad y sembradora |
| Sin comprador | Cultivos sin registro en el censo de QuickStats ni en CDL del condado | Sin dato (falta SIAP) |
| Historial | CDL (ya está en la tabla) | Ciclos verdes de HLS + cultivo típico de riego (supuesto) |

    python farmer_context.py --table ../backend/data/diamond_valley.parquet --parcel-id dv-nv-01 \
        --state NV --county EUREKA --county-fips 32011 --name-es "..." --name-en "..."
    python farmer_context.py --table ../backend/data/queretaro.parquet --parcel-id qro-sjr-01 \
        --name-es "..." --name-en "..."

QuickStats necesita NASS_QUICKSTATS_KEY en backend/.env.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import httpx
import pandas as pd

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "backend"))

from app.engine import crop_bank  # noqa: E402
from app.engine.crop_traits import BALER, IRRIGATION, SEEDER  # noqa: E402
from app.services.table_to_contract import (  # noqa: E402
    annual_water_mm,
    observed_net_irrigation,
)
from crop_census import county_stats  # noqa: E402

QUICKSTATS = "https://quickstats.nass.usda.gov/api/api_GET/"
MIN_MEAN_TEMP_C = 5.0  # germinación de cereales de clima frío (supuesto declarado)
GREEN_NDVI = 0.45
MIN_ACRES = 100.0
EQUIPMENT_NAME = {IRRIGATION: "pivote_central", SEEDER: "sembradora_grano", BALER: "empacadora"}
# Clases de QuickStats -> cultivos del banco que cubren (evidencia de mercado en el condado).
QS_TO_BANK = {
    "HAY": ["alfalfa"],
    "BARLEY": ["cebada_forrajera"],
    "WHEAT": ["trigo_invierno", "trigo_primavera"],
    "OATS": ["avena_forrajera"],
    "CORN": ["maiz", "maiz_frijol"],
    "SORGHUM": ["sorgo_grano"],
    "POTATOES": ["papa"],
    "BEANS": ["frijol_seco"],
}
MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
             "septiembre", "octubre", "noviembre", "diciembre"]


def load_key() -> str:
    key = os.environ.get("NASS_QUICKSTATS_KEY")
    env = REPO / "backend" / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("NASS_QUICKSTATS_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        raise SystemExit("Falta NASS_QUICKSTATS_KEY en backend/.env")
    return key


def quickstats(key: str, **params: str) -> list[dict]:
    response = httpx.get(QUICKSTATS, params={"key": key, "format": "JSON", **params}, timeout=120)
    response.raise_for_status()
    return response.json().get("data", [])


def planting_window(table: pd.DataFrame) -> tuple[int, int, str]:
    """El tramo más largo de meses seguidos con temperatura media de 5 °C o más."""
    means = table.groupby("month_num")[["tmax_c", "tmin_c"]].mean()
    tmean = (means["tmax_c"] + means["tmin_c"]) / 2
    ok = [tmean.get(m, -99) >= MIN_MEAN_TEMP_C for m in range(1, 13)]
    if all(ok):
        return 1, 12, "todos los meses tienen temperatura media de 5 °C o más"
    best, start = (0, 1, 1), None
    for i in range(24):  # dos vueltas para ventanas que cruzan el año
        month = i % 12
        if ok[month]:
            start = i if start is None else start
            length = i - start + 1
            if length > best[0] and length <= 12:
                best = (length, start % 12 + 1, month + 1)
        else:
            start = None
    _, first, last = best
    return first, last, (
        f"meses con temperatura media de {MIN_MEAN_TEMP_C:.0f} °C o más (germinación de cereales "
        f"de clima frío, supuesto): de {MONTHS_ES[first - 1]} a {MONTHS_ES[last - 1]}"
    )


def rows_of(table: pd.DataFrame) -> list[dict]:
    return [
        {k: (None if isinstance(v, float) and pd.isna(v) else v) for k, v in r.items()}
        for r in table.drop(columns=["geometry"]).to_dict(orient="records")
    ]


def labeled_context(args: argparse.Namespace, table: pd.DataFrame) -> dict:
    key = load_key()
    rows = rows_of(table)
    water = observed_net_irrigation(rows)
    if water is None:
        raise SystemExit("La tabla no tiene OpenET completo: no se puede derivar el agua.")

    current = sorted({c for c in table["crop_group"].dropna()})
    codes = [crop_bank.crop_code_for_cdl(int(c)) for c in table["cdl_code"].dropna().unique()]
    machinery: list[str] = []
    for code in filter(None, codes):
        for requirement in crop_bank.get_crop_spec(code).machinery:  # type: ignore[union-attr]
            name = EQUIPMENT_NAME[{"IRRIGATION": IRRIGATION, "SEEDER": SEEDER, "BALER": BALER}[requirement]]
            if name not in machinery:
                machinery.append(name)

    census = quickstats(key, source_desc="CENSUS", year="2022", state_alpha=args.state,
                        county_name=args.county, sector_desc="CROPS",
                        statisticcat_desc="AREA HARVESTED", domain_desc="TOTAL")
    in_census = {r["commodity_desc"] for r in census if r["unit_desc"] == "ACRES"}
    evidence = {code for qs, bank in QS_TO_BANK.items() if any(qs in c for c in in_census) for code in bank}
    with httpx.Client(timeout=180) as client:
        for year in args.cdl_years:
            for row in county_stats(client, args.county_fips, year):
                bank = crop_bank.crop_code_for_cdl(int(row["value"]))
                if bank and row["acreage"] >= MIN_ACRES:
                    evidence.add(bank)
    no_market = sorted(
        s.crop_code for s in crop_bank.list_crops()
        if s.sold and s.crop_code not in evidence and not s.crop_code.endswith("_dormant")
    )

    prices = quickstats(key, source_desc="SURVEY", state_alpha=args.state,
                        statisticcat_desc="PRICE RECEIVED", freq_desc="ANNUAL",
                        year__GE=str(args.price_from), commodity_desc="HAY")
    by_item: dict[str, list[tuple[str, str]]] = {}
    for r in prices:
        if r["short_desc"] in ("HAY, ALFALFA - PRICE RECEIVED, MEASURED IN $ / TON",
                               "HAY, (EXCL ALFALFA) - PRICE RECEIVED, MEASURED IN $ / TON"):
            by_item.setdefault(r["short_desc"], []).append((r["year"], r["Value"].strip()))
    notes = []
    for item, values in by_item.items():
        values.sort()
        series = ", ".join(f"{y}: {v}" for y, v in values)
        es_name = "heno de alfalfa" if "ALFALFA -" in item and "EXCL" not in item else "otro heno"
        en_name = "alfalfa hay" if es_name == "heno de alfalfa" else "other hay"
        notes.append({
            "es": f"Precio recibido por {es_name} en {args.state} (USD por tonelada) — {series}. "
                  "Fuente: USDA NASS QuickStats, encuesta anual. Es un precio estatal, no de la parcela.",
            "en": f"Price received for {en_name} in {args.state} (USD per ton) — {series}. "
                  "Source: USDA NASS QuickStats annual survey. State price, not the field's.",
        })
    acres = {r["short_desc"]: r["Value"].strip() for r in census if r["unit_desc"] == "ACRES"}
    top = [f"{k.split(' - ')[0].title()}: {v}" for k, v in acres.items()
           if k in ("HAY, ALFALFA - ACRES HARVESTED", "HAY, (EXCL ALFALFA) - ACRES HARVESTED",
                    "BARLEY - ACRES HARVESTED", "CORN, SILAGE - ACRES HARVESTED")]
    notes.append({
        "es": f"Censo agrícola 2022, condado {args.county.title()}: acres cosechados — {'; '.join(top)} "
              "((D) = dato reservado por confidencialidad). Fuente: USDA NASS QuickStats.",
        "en": f"2022 Census of Agriculture, {args.county.title()} County: acres harvested — "
              f"{'; '.join(top)} ((D) = withheld). Source: USDA NASS QuickStats.",
    })

    first, last, window_text = planting_window(table)
    source = (
        f"Supuesto con datos, no declarado por un agricultor. Agua: riego que ya usa el campo según "
        f"OpenET menos lluvia efectiva ({water:.0f} mm/año; no se asigna agua extra). Ventana: "
        f"NASA POWER, {window_text}. Maquinaria: la que pide el cultivo actual ({', '.join(current)}). "
        f"Sin comprador: cultivos sin registro en el censo 2022 de QuickStats ni más de "
        f"{MIN_ACRES:.0f} acres en CDL del condado."
    )
    return {
        "constraints": {
            "max_water_mm_year": round(water),
            "available_machinery": machinery,
            "crops_without_buyer": no_market,
            "planting_window": {"start_month": first, "end_month": last},
        },
        "constraints_source": source,
        "context_notes": notes,
    }


def unlabeled_context(args: argparse.Namespace, table: pd.DataFrame) -> dict:
    ndvi = table.groupby("month_num")["ndvi"].mean()
    green = {m: ndvi.get(m, 0) >= GREEN_NDVI for m in range(1, 13)}
    perennial = sum(green.values()) >= 10
    history: dict[int, str] = {}
    for month in range(1, 13):
        if perennial:
            # Verde casi todo el año bajo riego: patrón de forraje perenne (alfalfa).
            history[month] = "alfalfa"
        else:
            winter = month in (11, 12, 1, 2, 3, 4, 5)
            crop = "cebada_forrajera" if winter else "maiz"
            history[month] = crop if green[month] else "barbecho"
    pattern = (
        "verde 10 meses o más al año: se supone un forraje perenne (alfalfa), común bajo riego "
        "en el Bajío"
        if perennial
        else "los meses verdes se suponen cebada en el ciclo de invierno y maíz en el de verano "
        "(cultivos típicos de riego del Bajío)"
    )
    rows = rows_of(table)
    months = [r["month"] for r in rows]
    crops = [history[int(m[5:7])] for m in months]
    water = annual_water_mm(months, crops, [r["et0_mm"] for r in rows], [r["rain_mm"] for r in rows])
    # La maquinaria que pide el historial supuesto; el riego, por gravedad (supuesto).
    names = {"IRRIGATION": "riego_compuerta", "SEEDER": "sembradora_convencional", "BALER": "empacadora"}
    machinery: list[str] = []
    for code in dict.fromkeys(history.values()):
        for requirement in crop_bank.get_crop_spec(code).machinery:  # type: ignore[union-attr]
            if names[requirement] not in machinery:
                machinery.append(names[requirement])
    first, last, window_text = planting_window(table)
    green_months = [MONTHS_ES[m - 1] for m in range(1, 13) if green[m]]
    source = (
        "Supuesto del equipo, no declarado por un agricultor ni tomado de SIAP. Historial: meses "
        f"verdes en HLS ({', '.join(green_months)}); {pattern}. Falta confirmarlo con SIAP o el "
        f"agricultor. Agua: FAO-56 para ese historial ({water:.0f} mm/año; no se asigna agua "
        f"extra). Ventana: NASA POWER, {window_text}. Maquinaria: la que pide "
        f"ese historial ({', '.join(machinery)}), con riego por gravedad (supuesto). "
        "Sin comprador: sin dato."
    )
    return {
        "declared_history": {str(k): v for k, v in history.items()},
        "constraints": {
            "max_water_mm_year": round(water) if water else 0,
            "available_machinery": machinery,
            "crops_without_buyer": [],
            "planting_window": {"start_month": first, "end_month": last},
        },
        "constraints_source": source,
        "context_notes": [{
            "es": "Qué se siembra y a qué precio en el municipio debe salir del cierre agrícola "
                  "municipal de SIAP (riego, ciclos otoño-invierno y primavera-verano). Aún no se "
                  "integra: pendiente de descarga.",
            "en": "What is grown and at what price in the municipality should come from SIAP's "
                  "municipal crop closure. Not integrated yet: pending download.",
        }],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--table", required=True)
    parser.add_argument("--parcel-id", required=True)
    parser.add_argument("--name-es", required=True)
    parser.add_argument("--name-en", required=True)
    parser.add_argument("--state")
    parser.add_argument("--county")
    parser.add_argument("--county-fips")
    parser.add_argument("--cdl-years", nargs="+", type=int, default=[2022, 2023, 2024])
    parser.add_argument("--price-from", type=int, default=2023)
    parser.add_argument("--out", help="por omisión, junto a la tabla: <parcel_id>.meta.json")
    args = parser.parse_args()

    table = pd.read_parquet(args.table)
    table = table[table["parcel_id"] == args.parcel_id]
    labeled = table["cdl_code"].notna().any()
    meta = {"name": {"es": args.name_es, "en": args.name_en}}
    if labeled:
        if not (args.state and args.county and args.county_fips):
            raise SystemExit("Con etiquetas (EE. UU.) hacen falta --state, --county y --county-fips")
        meta |= labeled_context(args, table)
    else:
        meta |= unlabeled_context(args, table)
    out = Path(args.out) if args.out else Path(args.table).parent / f"{args.parcel_id}.meta.json"
    out.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(meta["constraints"], ensure_ascii=False))
    print(meta["constraints_source"])
    print(f"-> {out}")


if __name__ == "__main__":
    main()
