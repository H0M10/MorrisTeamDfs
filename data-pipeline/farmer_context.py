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
    out = {
        "constraints": {
            "max_water_mm_year": round(water),
            "available_machinery": machinery,
            "crops_without_buyer": no_market,
            "planting_window": {"start_month": first, "end_month": last},
        },
        "constraints_source": source,
        "context_notes": notes,
    }
    if args.state.upper() == "NV" and args.county.upper() == "EUREKA":
        out["aquifer_name"] = {
            "es": "Cuenca Hidrográfica de Diamond Valley (Área 153, Nevada — Contexto Regional)",
            "en": "Diamond Valley Hydrographic Basin (Area 153, Nevada — Regional Context)",
        }
        out["aquifer_status_note"] = {
            "es": (
                "Contexto regional de cuenca (NDWR, Área Hidrográfica 153): rendimiento "
                "perenne oficial de 30,000 acre-pies/año (~37.0 hm³/año) frente a un bombeo "
                "histórico cercano a 76,000 acre-pies/año; designada Área de Manejo Crítico "
                "(CMA) por Orden 1264 (2015-08-25) con Plan de Manejo de Agua Subterránea "
                "(GMP) aprobado por Orden 1302 (2019-01-11). Sujeto a verificación de "
                "derechos individuales del predio."
            ),
            "en": (
                "Regional basin context (NDWR, Hydrographic Area 153): official perennial "
                "yield of 30,000 acre-feet/yr (~37.0 hm³/yr) against historical pumping near "
                "76,000 acre-feet/yr; designated a Critical Management Area (CMA) by Order "
                "1264 (2015-08-25) with Groundwater Management Plan (GMP) approved by Order "
                "1302 (2019-01-11). Subject to parcel-level water-right verification."
            ),
        }
    return out


def _plain(text: str) -> str:
    import unicodedata  # noqa: PLC0415

    return "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))


# Nombre de cultivo en SIAP (inicio, sin acentos) -> códigos del banco que cubre.
SIAP_TO_BANK = {
    "maiz grano": ["maiz", "maiz_frijol"], "maiz forrajero": ["maiz"], "alfalfa": ["alfalfa"],
    "avena forrajera": ["avena_forrajera"], "avena grano": ["avena_forrajera"],
    "cebada": ["cebada_forrajera"], "trigo": ["trigo_invierno", "trigo_primavera"],
    "sorgo": ["sorgo_grano"], "frijol": ["frijol_seco", "maiz_frijol"], "garbanzo": ["garbanzo"],
    "lenteja": ["lenteja"], "soya": ["soya"], "girasol": ["girasol"], "canola": ["canola"],
    "algodon": ["algodon"], "papa": ["papa"], "cebolla": ["cebolla"], "tomate rojo": ["tomate"],
    "chile": ["chile"], "ajo": ["ajo"], "brocoli": ["brocoli"],
}
GREEN_MONTH_NDVI = 0.45


def bank_codes_for(siap_name: str) -> list[str]:
    plain = _plain(siap_name)
    return next((codes for prefix, codes in SIAP_TO_BANK.items() if plain.startswith(prefix)), [])


def siap_context(siap: pd.DataFrame) -> tuple[dict[str, str], set[str], list[dict], str]:
    """Cultivo principal por ciclo, cultivos con mercado y notas de precios, desde SIAP."""
    last = int(siap["anio"].max())
    recent = siap[siap["anio"] >= last - 2]
    main_crop: dict[str, str] = {}
    for ciclo, key in (("Otoño-Invierno", "oi"), ("Primavera-Verano", "pv")):
        ranked = recent[recent["ciclo"] == ciclo].groupby("cultivo")["sembrada_ha"].sum().sort_values(ascending=False)
        for name in ranked.index:
            codes = bank_codes_for(name)
            if codes:
                main_crop[key] = codes[0]
                main_crop[key + "_name"] = f"{name} ({ranked[name] / 3:,.0f} ha/año)"
                break
    area = recent.groupby("cultivo")["sembrada_ha"].sum() / 3
    market = {code for name, ha in area.items() if ha >= 100 for code in bank_codes_for(name)}
    notes = []
    top = area.sort_values(ascending=False).head(5).index
    for name in top:
        rows = siap[siap["cultivo"] == name].groupby("anio")
        prices = rows.apply(lambda g: (g["precio_medio_rural_mxn"] * g["produccion"]).sum() / g["produccion"].sum()
                            if g["produccion"].sum() else float("nan"), include_groups=False)
        series = ", ".join(f"{y}: {p:,.0f}" for y, p in prices.items() if p == p)
        hectares = ", ".join(f"{y}: {h:,.0f}" for y, h in rows["sembrada_ha"].sum().items())
        unit = siap[siap["cultivo"] == name]["unidad"].iloc[0].lower()
        notes.append({
            "es": f"{name}, con riego en los municipios de la zona: superficie sembrada (ha) — {hectares}; "
                  f"precio medio rural (pesos por {unit}) — {series}. Fuente: SIAP, cierre agrícola municipal.",
            "en": f"{name}, irrigated, in the area's municipalities: planted area (ha) — {hectares}; "
                  f"average farm-gate price (MXN per {unit}) — {series}. Source: SIAP municipal crop closure.",
        })
    summary = f"OI: {main_crop.get('oi_name', 'sin dato')}; PV: {main_crop.get('pv_name', 'sin dato')}"
    return main_crop, market, notes, summary


def unlabeled_context(args: argparse.Namespace, table: pd.DataFrame) -> dict:
    if args.siap:
        return unlabeled_with_siap(args, table)
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


def unlabeled_with_siap(args: argparse.Namespace, table: pd.DataFrame) -> dict:
    siap = pd.read_csv(args.siap)
    main_crop, market, notes, summary = siap_context(siap)
    series = table.sort_values("month")
    history: dict[str, str] = {}
    previous = "descanso_rastrojo"
    for _, row in series.iterrows():
        month, month_num = row["month"], int(row["month_num"])
        green = row["ndvi"] == row["ndvi"] and row["ndvi"] >= GREEN_MONTH_NDVI
        if green:
            crop = main_crop["oi"] if month_num in (11, 12, 1, 2, 3, 4) else main_crop["pv"]
            previous = crop
        else:
            crop = "rastrojo_maiz" if previous.startswith("maiz") else "descanso_rastrojo"
        history[month] = crop
    rows = rows_of(table)
    months = [r["month"] for r in rows]
    crops = [history[m] for m in months]
    water = annual_water_mm(months, crops, [r["et0_mm"] for r in rows], [r["rain_mm"] for r in rows])
    names = {"IRRIGATION": "riego_compuerta", "SEEDER": "sembradora_convencional", "BALER": "empacadora"}
    machinery: list[str] = []
    for code in dict.fromkeys(crops):
        for requirement in crop_bank.get_crop_spec(code).machinery:  # type: ignore[union-attr]
            if names[requirement] not in machinery:
                machinery.append(names[requirement])
    no_market = sorted(
        s.crop_code for s in crop_bank.list_crops()
        if s.sold and s.crop_code not in market and not s.crop_code.endswith("_dormant")
    )
    first, last, window_text = planting_window(table)
    green_count = sum(1 for c in crops if not c.startswith(("rastrojo", "descanso")))
    source = (
        "Supuesto con datos, no declarado por un agricultor. Historial: los meses verdes de esta "
        f"parcela en HLS ({green_count} de 36) se asignan al cultivo de riego con más superficie en "
        f"SIAP para su ciclo en los municipios de la zona ({summary}); los meses sin verdor, a "
        f"rastrojo o descanso. Agua: FAO-56 para ese historial ({water:.0f} mm/año; no se asigna "
        f"agua extra). Ventana: NASA POWER, {window_text}. Maquinaria: la que pide ese historial "
        f"({', '.join(machinery)}), con riego por gravedad (supuesto). Sin comprador: cultivos sin "
        "al menos 100 ha de riego al año en SIAP en esos municipios (últimos 3 años)."
    )
    notes.append({
        "es": "Total estatal de Querétaro (SIAP 2025, cíclicos + perennes, riego + temporal): "
              "117,320.01 ha sembradas, 110,271.76 ha cosechadas y valor de producción de "
              "5,608,171.22 miles de pesos. Agregado estatal complementario al cierre municipal.",
        "en": "Querétaro state total (SIAP 2025, cyclic + perennial, irrigated + rainfed): "
              "117,320.01 ha planted, 110,271.76 ha harvested, production value 5,608,171.22 "
              "thousand MXN. State aggregate complementing the municipal closure.",
    })
    return {
        "declared_history": history,
        "constraints": {
            "max_water_mm_year": round(water) if water else 0,
            "available_machinery": machinery,
            "crops_without_buyer": no_market,
            "planting_window": {"start_month": first, "end_month": last},
        },
        "constraints_source": source,
        "history_source": (
            "Supuesto con datos, no declarado por un agricultor: meses verdes de esta parcela en "
            f"HLS con el cultivo de riego de mayor superficie en SIAP para cada ciclo ({summary})"
        ),
        "context_notes": notes,
        "aquifer_name": {
            "es": "Acuífero Valle de San Juan del Río (Clave 2203, Querétaro — Contexto Regional)",
            "en": "Valle de San Juan del Río Aquifer (Code 2203, Querétaro — Regional Context)",
        },
        "aquifer_status_note": {
            "es": (
                "Contexto regional de cuenca (CONAGUA, DOF 2023-11-09, Clave 2203): recarga "
                "media anual 277.9 hm³/año, descarga natural comprometida 0.0 hm³/año, extracción "
                "334.79 hm³/año y disponibilidad media anual -56.89 hm³/año (en déficit / "
                "sobreexplotado; NOM-011-CONAGUA-2015). Describe el acuífero regional, no un "
                "pozo individual."
            ),
            "en": (
                "Regional basin context (CONAGUA, DOF 2023-11-09, Code 2203): mean annual "
                "recharge 277.9 hm³/yr, committed natural discharge 0.0 hm³/yr, groundwater "
                "extraction 334.79 hm³/yr, and mean annual availability -56.89 hm³/yr (in "
                "deficit / overexploited; NOM-011-CONAGUA-2015). Describes the regional aquifer, "
                "not an individual well."
            ),
        },
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
    parser.add_argument("--siap", help="resumen de siap_summary.py (México)")
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
