"""Predicciones por parcela que no caben en el contrato congelado (GET /api/v1/predictions/{id}).

1. Modelo 3 (GRU con atención, ONNX): qué grupo de cultivo lee en cada año a partir de
   12 meses de índices de HLS, con su probabilidad. Donde hay USDA CDL se compara con él.
2. Google Dynamic World (GOOGLE/DYNAMICWORLD/V1 en Earth Engine): probabilidad media de
   que el campo sea cultivo cada año, según la red neuronal de Google sobre Sentinel-2 a
   10 m. Es un producto externo: se cita como tal y no lo medimos nosotros.

Ninguna de las dos cambia las cifras de la evaluación; se muestran al lado, con su fuente.
"""

from __future__ import annotations

import math
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from app.config import Settings
from app.engine import crop_bank
from app.models.loader import ModelRegistry
from app.services import table_to_contract
from app.sources import earth_engine

CLASS_LABELS = {
    "alfalfa": {"es": "alfalfa", "en": "alfalfa"},
    "small_grain": {"es": "grano pequeño (trigo, cebada, avena)", "en": "small grain"},
    "corn": {"es": "maíz", "en": "corn"},
    "fallow": {"es": "barbecho", "en": "fallow"},
    "other": {"es": "otro cultivo o uso", "en": "other crop or use"},
}
DYNAMIC_WORLD = "GOOGLE/DYNAMICWORLD/V1"
DW_CLASSES = [
    "water",
    "trees",
    "grass",
    "flooded_vegetation",
    "crops",
    "shrub_and_scrub",
    "built",
    "bare",
    "snow_and_ice",
]
DW_LABELS = {
    "water": {"es": "agua", "en": "water"},
    "trees": {"es": "árboles", "en": "trees"},
    "grass": {"es": "pasto", "en": "grass"},
    "flooded_vegetation": {"es": "vegetación inundada", "en": "flooded vegetation"},
    "crops": {"es": "cultivo", "en": "crops"},
    "shrub_and_scrub": {"es": "matorral", "en": "shrub and scrub"},
    "built": {"es": "construido", "en": "built"},
    "bare": {"es": "suelo desnudo", "en": "bare ground"},
    "snow_and_ice": {"es": "nieve", "en": "snow"},
}

_DW_CACHE: dict[str, dict[str, Any]] = {}


def _softmax(values: list[float]) -> list[float]:
    top = max(values)
    exps = [math.exp(v - top) for v in values]
    total = sum(exps)
    return [e / total for e in exps]


def crop_reading(rows: list[dict[str, Any]], registry: ModelRegistry) -> dict[str, Any]:
    """Lectura del modelo 3 año por año. Usa la misma entrada que los pesos de atención."""
    model = registry.get("model_3_crop_history_gru")
    extra = ((model.metrics or {}).get("extra") or {}) if model.status == "trained" else {}
    classes = list(extra.get("classes") or [])
    metric = (model.metrics or {}).get("metric") or {}
    baseline = (model.metrics or {}).get("baseline_metric") or {}
    report: dict[str, Any] = {
        "model": "model_3_crop_history_gru",
        "status": model.status,
        "metric_f1": metric.get("value"),
        "baseline_f1": baseline.get("value"),
        "f1_per_class": extra.get("f1_per_class"),
        "source": "Modelo 3 (GRU con atención temporal, ONNX) sobre 12 meses de NDVI, NDMI, "
        "BSI y NDTI de HLS; F1 macro medido en Diamond Valley, valle no visto al entrenar",
        "years": [],
    }
    if model.status != "trained" or not classes:
        return report
    import numpy as np  # noqa: PLC0415

    for start in range(0, len(rows) - 11, 12):
        block = rows[start : start + 12]
        values = [[row.get(k) for k in ("ndvi", "ndmi", "bsi", "ndti")] for row in block]
        sequence = [
            [0.0 if v is None else float(v) for v in month] + [float(None in month)]
            for month in values
        ]
        logits, _ = model.predict(np.asarray([sequence], dtype=np.float32))
        probs = _softmax([float(x) for x in np.asarray(logits)[0]])
        best = max(range(len(classes)), key=lambda i: probs[i])
        year = block[0]["month"][:4]
        cdl = next((r.get("cdl_code") for r in block if r.get("cdl_code") is not None), None)
        truth = None
        if cdl is not None:
            bank = crop_bank.crop_code_for_cdl(int(cdl))
            spec = crop_bank.get_crop_spec(bank) if bank else None
            truth = spec.crop_group if spec and spec.crop_group in classes else "other"
        report["years"].append(
            {
                "year": year,
                "predicted": classes[best],
                "predicted_label": CLASS_LABELS.get(classes[best], CLASS_LABELS["other"]),
                "probability": round(probs[best], 3),
                "probabilities": {c: round(p, 3) for c, p in zip(classes, probs, strict=True)},
                "usda_cdl_group": truth,
                "usda_cdl_label": CLASS_LABELS.get(truth) if truth else None,
                "agrees": None if truth is None else truth == classes[best],
            }
        )
    return report


def dynamic_world(parcel_id: str, rows: list[dict[str, Any]], settings: Settings) -> dict[str, Any]:
    """Probabilidad media de cultivo por año según Google Dynamic World (10 m)."""
    base = {
        "source": "Google Dynamic World V1 (red neuronal sobre Sentinel-2), Earth Engine "
        "GOOGLE/DYNAMICWORLD/V1; probabilidad media del año en el campo",
        "native_scale": "10 m",
        "type": "modeled",
    }
    if not settings.earth_engine_configured:
        return {**base, "available": False, "reason": "earth_engine_not_configured", "years": []}
    if parcel_id in _DW_CACHE:
        return _DW_CACHE[parcel_id]
    ring = table_to_contract.parse_wkb_polygon(bytes(rows[0]["geometry"]))
    years = sorted({row["month"][:4] for row in rows})
    try:
        ee = earth_engine.initialize(settings)
        region = ee.Geometry.Polygon([ring])

        def one_year(year: str) -> dict[str, Any]:
            collection = (
                ee.ImageCollection(DYNAMIC_WORLD)
                .filterBounds(region)
                .filterDate(f"{year}-01-01", f"{int(year) + 1}-01-01")
                .select(DW_CLASSES)
            )
            stats = (
                collection.mean()
                .reduceRegion(ee.Reducer.mean(), region, 10, tileScale=4)
                .set("n_images", collection.size())
                .getInfo()
            )
            probs = {c: stats.get(c) for c in DW_CLASSES if stats.get(c) is not None}
            top = max(probs, key=lambda c: probs[c]) if probs else None
            return {
                "year": year,
                "n_images": stats.get("n_images"),
                "crop_probability": None
                if probs.get("crops") is None
                else round(float(probs["crops"]), 3),
                "top_class": top,
                "top_label": DW_LABELS.get(top) if top else None,
                "top_probability": None if top is None else round(float(probs[top]), 3),
            }

        with ThreadPoolExecutor(len(years)) as pool:
            result = {**base, "available": True, "years": list(pool.map(one_year, years))}
    except Exception as exc:  # cuota, red o permisos: la evaluación sigue sin esto
        return {**base, "available": False, "reason": str(exc)[:160], "years": []}
    _DW_CACHE[parcel_id] = result
    return result
