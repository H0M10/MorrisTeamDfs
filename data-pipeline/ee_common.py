"""Utilidades compartidas por los guiones de Earth Engine."""

from __future__ import annotations

import json
import os
from pathlib import Path

import ee

from config import SOURCE_BY_KEY, SOURCES, Source


def init_ee(project: str | None = None) -> None:
    """Inicia Earth Engine. Requiere haber corrido `earthengine authenticate` (o ee.Authenticate en Colab)."""
    project = project or os.environ.get("EE_PROJECT")
    if not project:
        raise SystemExit("Falta el proyecto: usa --project o la variable EE_PROJECT.")
    ee.Initialize(project=project)


def load_parcels(path: str) -> tuple[ee.FeatureCollection, list[dict]]:
    """Lee un GeoJSON de parcelas. Cada una necesita parcel_id y valley."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    features = data["features"]
    for feature in features:
        missing = {"parcel_id", "valley"} - feature["properties"].keys()
        if missing:
            raise SystemExit(f"A una parcela le falta {sorted(missing)} en {path}")
    collection = ee.FeatureCollection(
        [
            ee.Feature(
                ee.Geometry(f["geometry"]),
                {"parcel_id": f["properties"]["parcel_id"], "valley": f["properties"]["valley"]},
            )
            for f in features
        ]
    )
    return collection, features


def resolve(source: Source) -> str | None:
    """Primer identificador candidato que existe en el catálogo."""
    for asset_id in source.candidates:
        try:
            if source.kind == "image":
                ee.Image(asset_id).bandNames().getInfo()
            else:
                ee.ImageCollection(asset_id).limit(1).size().getInfo()
            return asset_id
        except ee.EEException:
            continue
    return None


def resolve_all(labeled: bool) -> dict[str, str]:
    """Identificador de cada fuente que aplica. Se detiene si falta una obligatoria."""
    resolved: dict[str, str] = {}
    for source in SOURCES:
        if source.labeled_only and not labeled:
            continue
        asset_id = resolve(source)
        if asset_id:
            resolved[source.key] = asset_id
        elif source.required:
            raise SystemExit(
                f"No existe ninguna colección candidata para '{source.key}': {source.candidates}. "
                "Busca el identificador actual en el catálogo y corrige config.py."
            )
    return resolved


def year_range(asset_id: str, region: ee.Geometry) -> tuple[int, int] | None:
    """Primer y último año con imágenes sobre la región."""
    collection = ee.ImageCollection(asset_id).filterBounds(region)
    first = collection.aggregate_min("system:time_start").getInfo()
    last = collection.aggregate_max("system:time_start").getInfo()
    if first is None or last is None:
        return None
    return (
        ee.Date(first).get("year").getInfo(),
        ee.Date(last).get("year").getInfo(),
    )


__all__ = ["SOURCE_BY_KEY", "init_ee", "load_parcels", "resolve", "resolve_all", "year_range"]
