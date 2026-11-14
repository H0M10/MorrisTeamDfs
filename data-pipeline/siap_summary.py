"""Resumen de SIAP: qué se siembra con riego, cuánto rinde y a qué precio, por municipio.

Lee los CSV del cierre agrícola municipal de SIAP (`Cierre_agricola_mun_<año>.csv`,
descargados a mano a data-pipeline/exports/siap/, que git ignora) y escribe un
resumen compacto por año, municipio, ciclo y cultivo. El resumen sí entra al
repositorio (pocos KB).

    python siap_summary.py --state Querétaro --municipios Colón "Pedro Escobedo" \
        "San Juan del Río" "El Marqués" --out siap/queretaro_riego.csv

Fuente: SIAP (Servicio de Información Agroalimentaria y Pesquera, SADER), cierre de
la producción agrícola. Es estadística oficial mexicana: NO está en la lista de
recursos del reto; el equipo decidió usarla y declararla (HUMANO.md H-16).
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

RAW = Path(__file__).resolve().parent / "exports" / "siap"
RENAME = {"Nomcultivo Sin Um": "Nomcultivo", "Precio": "Preciomediorural"}
NUMERIC = ["Sembrada", "Cosechada", "Siniestrada", "Volumenproduccion", "Rendimiento",
           "Preciomediorural", "Valorproduccion"]


def load(state: str, years: list[int]) -> pd.DataFrame:
    frames = []
    for year in years:
        path = RAW / f"Cierre_agricola_mun_{year}.csv"
        if not path.exists():
            print(f"falta {path.name}; se omite")
            continue
        table = pd.read_csv(path, encoding="latin1", low_memory=False).rename(columns=RENAME)
        table = table[table["Nomestado"].str.strip() == state].copy()
        for column in NUMERIC:
            table[column] = pd.to_numeric(
                table[column].astype(str).str.replace(",", "", regex=False), errors="coerce"
            )
        frames.append(table)
    return pd.concat(frames, ignore_index=True)


def summarize(table: pd.DataFrame, municipios: list[str], modalidad: str) -> pd.DataFrame:
    rows = table[table["Nommunicipio"].isin(municipios) & (table["Nommodalidad"] == modalidad)]
    rows = rows.assign(_valor_precio=rows["Preciomediorural"] * rows["Volumenproduccion"])
    out = (
        rows.groupby(["Anio", "Nommunicipio", "Nomcicloproductivo", "Nomcultivo", "Nomunidad"])
        .agg(
            sembrada_ha=("Sembrada", "sum"),
            cosechada_ha=("Cosechada", "sum"),
            siniestrada_ha=("Siniestrada", "sum"),
            produccion=("Volumenproduccion", "sum"),
            _valor_precio=("_valor_precio", "sum"),
            valor_miles_mxn=("Valorproduccion", "sum"),
        )
        .reset_index()
    )
    out["rendimiento_por_ha"] = (out["produccion"] / out["cosechada_ha"]).round(2)
    out["precio_medio_rural_mxn"] = (out["_valor_precio"] / out["produccion"]).round(2)
    out["valor_miles_mxn"] = (out["valor_miles_mxn"] / 1000).round(1)
    out = out.drop(columns="_valor_precio").rename(
        columns={"Anio": "anio", "Nommunicipio": "municipio", "Nomcicloproductivo": "ciclo",
                 "Nomcultivo": "cultivo", "Nomunidad": "unidad"}
    )
    out["fuente"] = "SIAP, cierre de la producción agrícola municipal (SADER)"
    out["modalidad"] = modalidad
    return out.sort_values(["anio", "municipio", "ciclo", "sembrada_ha"], ascending=[True, True, True, False])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--state", required=True)
    parser.add_argument("--municipios", nargs="+", required=True)
    parser.add_argument("--years", nargs="+", type=int, default=list(range(2020, 2026)))
    parser.add_argument("--modalidad", default="Riego")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    table = load(args.state, args.years)
    found = sorted(set(args.municipios) & set(table["Nommunicipio"].unique()))
    missing = sorted(set(args.municipios) - set(found))
    if missing:
        raise SystemExit(f"Municipios no encontrados en {args.state}: {missing}")
    summary = summarize(table, args.municipios, args.modalidad)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    summary.to_csv(out, index=False, encoding="utf-8")

    area = summary.pivot_table(index="cultivo", columns="anio", values="sembrada_ha", aggfunc="sum").fillna(0)
    last = area.columns.max()
    area = area.loc[area[last].sort_values(ascending=False).index]
    print(f"\nSuperficie sembrada con {args.modalidad.lower()} (ha), {', '.join(args.municipios)}:")
    print(area.head(12).round(0).astype(int).to_string())
    print("Total:", area.sum().round(0).astype(int).to_dict())
    top = list(area.head(8).index)
    yearly = summary[summary["cultivo"].isin(top)].groupby(["cultivo", "anio"])
    price = (
        yearly.apply(lambda g: (g["precio_medio_rural_mxn"] * g["produccion"]).sum() / g["produccion"].sum()
                     if g["produccion"].sum() else float("nan"), include_groups=False)
        .unstack()
    )
    print("\nPrecio medio rural (pesos por unidad, ponderado por producción):")
    print(price.loc[top].round(0).to_string())
    cycles = summary[summary["anio"] == last].pivot_table(
        index="cultivo", columns="ciclo", values="sembrada_ha", aggfunc="sum").fillna(0)
    print(f"\n{last} por ciclo (ha):")
    print(cycles.loc[[c for c in top if c in cycles.index]].round(0).astype(int).to_string())
    print(f"\n{len(summary)} filas -> {out}")


if __name__ == "__main__":
    main()
