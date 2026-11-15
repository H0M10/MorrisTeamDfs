"""Datos de satélite de un solo campo, pedidos en vivo a Google Earth Engine.

Es la misma reducción que hace /data-pipeline/ee_export.py para las tablas de
entrenamiento (HLS, SMAP, OpenET, CDL, SRTM, SoilGrids), pero para un campo y
36 meses. El cálculo corre en los servidores de Earth Engine; aquí solo llegan
unas 40 filas. Cada año va en su propia consulta (en paralelo): pedir los 36
meses juntos supera el límite de memoria por consulta.

Credenciales: EE_SERVICE_ACCOUNT_JSON (cuenta de servicio, Railway) o las de
`earthengine authenticate` (laptop). Nunca en el repositorio.
"""

from __future__ import annotations

import json
import math
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from app.config import Settings

ASSETS = {
    "hls_l30": "NASA/HLS/HLSL30/v002",
    "hls_s30": "NASA/HLS/HLSS30/v002",
    "cdl": "USDA/NASS/CDL",
    "openet": "OpenET/ENSEMBLE/CONUS/GRIDMET/MONTHLY/v2_0",
    "smap": "NASA/SMAP/SPL4SMGP/008",
    "srtm": "USGS/SRTMGL1_003",
    "soil_clay": "projects/soilgrids-isric/clay_mean",
    "soil_sand": "projects/soilgrids-isric/sand_mean",
    "soil_silt": "projects/soilgrids-isric/silt_mean",
    "soil_soc": "projects/soilgrids-isric/soc_mean",
}
HLS_L30_BANDS = {
    "B2": "blue",
    "B3": "green",
    "B4": "red",
    "B5": "nir",
    "B6": "swir1",
    "B7": "swir2",
}
HLS_S30_BANDS = {
    "B2": "blue",
    "B3": "green",
    "B4": "red",
    "B8A": "nir",
    "B11": "swir1",
    "B12": "swir2",
}
COMMON_BANDS = ["blue", "green", "red", "nir", "swir1", "swir2"]
HLS_FMASK_REJECT = (1 << 1) | (1 << 3) | (1 << 4)  # nube, sombra, nieve
SCALE_M = 30
SMAP_SCALE_M = 9000
PARALLEL_QUERIES = 12  # 12 a la vez: ~10 s por campo (con 6, ~23 s); medido el 15 nov

_lock = threading.Lock()
_state: dict[str, str] = {}  # proyecto ya iniciado en este proceso


class EarthEngineError(RuntimeError):
    pass


def initialize(settings: Settings) -> Any:
    """Inicia Earth Engine una vez por proceso. Devuelve el módulo `ee`."""
    import ee  # noqa: PLC0415  (carga diferida: pesa y no siempre se usa)

    with _lock:
        if _state.get("project") == settings.ee_project:
            return ee
        try:
            if settings.ee_service_account_json:
                info = json.loads(settings.ee_service_account_json)
                credentials = ee.ServiceAccountCredentials(
                    info["client_email"], key_data=settings.ee_service_account_json
                )
                ee.Initialize(credentials, project=settings.ee_project)
            else:
                ee.Initialize(project=settings.ee_project)
        except Exception as exc:  # credenciales o permisos
            raise EarthEngineError(str(exc)) from exc
        _state["project"] = settings.ee_project
    return ee


def circle_ring(lon: float, lat: float, radius_m: float, points: int = 48) -> list[list[float]]:
    ring = []
    for i in range(points):
        angle = 2 * math.pi * i / points
        dlat = radius_m * math.sin(angle) / 111_195
        dlon = radius_m * math.cos(angle) / (111_195 * math.cos(math.radians(lat)))
        ring.append([round(lon + dlon, 6), round(lat + dlat, 6)])
    return [*ring, ring[0]]


def _empty(ee: Any, names: list[str]) -> Any:
    return ee.Image.constant([0] * len(names)).rename(names).toFloat().updateMask(0)


def _hls(ee: Any, region: Any, start: Any, end: Any) -> Any:
    def prepare(bands: dict[str, str]):
        def apply(image: Any) -> Any:
            clear = image.select("Fmask").bitwiseAnd(HLS_FMASK_REJECT).eq(0)
            return (
                image.select(list(bands), list(bands.values()))
                .toFloat()
                .updateMask(clear)
                .copyProperties(image, ["system:time_start"])
            )

        return apply

    return (
        ee.ImageCollection(ASSETS["hls_l30"])
        .filterBounds(region)
        .filterDate(start, end)
        .map(prepare(HLS_L30_BANDS))
        .merge(
            ee.ImageCollection(ASSETS["hls_s30"])
            .filterBounds(region)
            .filterDate(start, end)
            .map(prepare(HLS_S30_BANDS))
        )
    )


def _month_feature(ee: Any, field: Any, year: int, month: int) -> Any:
    """Un mes de un campo. Una consulta por mes: el modo gratuito de Earth Engine
    no aguanta doce meses de HLS y SMAP en una sola consulta."""
    region = field.geometry()
    origin = ee.Date.fromYMD(year, month, 1)
    month_end = origin.advance(1, "month")
    # Filtrar por fecha y lugar ANTES de procesar: si no, se procesa todo el historial.
    hls = _hls(ee, region, origin, month_end)
    smap = (
        ee.ImageCollection(ASSETS["smap"])
        .filterDate(origin, month_end)
        .select(["sm_surface", "sm_rootzone"])
    )
    openet = (
        ee.ImageCollection(ASSETS["openet"])
        .filterBounds(region)
        .filterDate(origin, month_end)
        .select(["et_ensemble_mad"])
    )

    def one_month(start: Any, end: Any) -> Any:
        scenes = hls.filterDate(start, end)
        refl = ee.Image(
            ee.Algorithms.If(scenes.size().gt(0), scenes.median(), _empty(ee, COMMON_BANDS))
        )
        bsi = refl.expression(
            "((s + r) - (n + b)) / ((s + r) + (n + b))",
            {
                "s": refl.select("swir1"),
                "r": refl.select("red"),
                "n": refl.select("nir"),
                "b": refl.select("blue"),
            },
        ).rename("bsi")
        moisture = smap.filterDate(start, end)
        et = openet.filterDate(start, end)
        image = (
            refl.select(["red", "green", "blue"])
            .addBands(refl.normalizedDifference(["nir", "red"]).rename("ndvi"))
            .addBands(refl.normalizedDifference(["nir", "swir1"]).rename("ndmi"))
            .addBands(bsi)
            .addBands(refl.normalizedDifference(["swir1", "swir2"]).rename("ndti"))
            .addBands(
                ee.Image(
                    ee.Algorithms.If(et.size().gt(0), et.sum(), _empty(ee, ["et_ensemble_mad"]))
                ).rename(["openet_et_mm"])
            )
        )
        stats = image.reduceRegion(ee.Reducer.mean(), region, SCALE_M, tileScale=4)
        # SMAP trae una imagen cada 3 horas (unas 240 al mes) y su píxel mide 9 km:
        # se reduce a su escala nativa, en el centro del campo. Contexto regional.
        wet = ee.Image(
            ee.Algorithms.If(
                moisture.size().gt(0), moisture.mean(), _empty(ee, ["sm_surface", "sm_rootzone"])
            )
        ).rename(["smap_sm_surface", "smap_sm_rootzone"])
        stats = stats.combine(
            wet.reduceRegion(ee.Reducer.first(), region.centroid(1), SMAP_SCALE_M)
        )
        return ee.Feature(None, stats).set(
            {"month": start.format("YYYY-MM"), "hls_n_images": scenes.size()}
        )

    return one_month(origin, month_end)


def _static(ee: Any, field: Any, first_year: int, last_year: int) -> Any:
    region = field.geometry()
    elevation = ee.Image(ASSETS["srtm"]).select([0], ["elevation_m"]).toFloat()
    slope = (
        ee.Terrain.slope(elevation).multiply(math.pi / 180).tan().multiply(100).rename("slope_pct")
    )
    soil = [
        ee.Image(ASSETS[key]).select([0], [name]).toFloat()
        for key, name in [
            ("soil_clay", "clay_gkg"),
            ("soil_sand", "sand_gkg"),
            ("soil_silt", "silt_gkg"),
            ("soil_soc", "soc_dgkg"),
        ]
    ]
    values = elevation.addBands([slope, *soil]).reduceRegion(
        ee.Reducer.mean(), region, SCALE_M, tileScale=4
    )
    cdl = ee.ImageCollection(ASSETS["cdl"]).select("cropland")

    def one_year(year: Any) -> Any:
        year = ee.Number(year).toInt()
        images = cdl.filterDate(ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year, 12, 31))
        image = ee.Image(
            ee.Algorithms.If(images.size().gt(0), images.first(), _empty(ee, ["cropland"]))
        )
        mode = image.reduceRegion(ee.Reducer.mode(), region, SCALE_M, tileScale=4).get("cropland")
        return ee.Feature(None, {"year": year, "cdl_code": mode})

    years = ee.FeatureCollection(ee.List.sequence(first_year, last_year).map(one_year))
    # Dentro de un diccionario, una colección llega sin sus filas: va como lista.
    return ee.Dictionary({"static": values, "cdl": years.toList(20)})


def _get_info(job: Any, tries: int = 3) -> Any:
    for attempt in range(tries):
        try:
            return job.getInfo()
        except Exception as exc:
            if attempt == tries - 1 or "concurrent" not in str(exc).lower():
                raise
            time.sleep(2 * (attempt + 1))
    return None


def fetch_field(
    settings: Settings,
    ring: list[list[float]],
    years: list[int],
    check: Callable[[dict[int, int | None]], None] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any], dict[int, int | None]]:
    """Filas mensuales, valores fijos (suelo, elevación) y CDL por año del campo.

    `ring` es el anillo exterior en [lon, lat]. Primero se piden suelo y CDL (menos de
    un segundo) y se pasan a `check`, que puede detener todo (por ejemplo, si no es
    cultivo) antes de pedir los 36 meses, que es lo lento.
    """
    ee = initialize(settings)
    field = ee.Feature(ee.Geometry.Polygon([ring]))
    try:
        extra = _get_info(_static(ee, field, years[0] - 1, years[-1]))
    except Exception as exc:  # cuota, memoria, red
        raise EarthEngineError(str(exc)) from exc
    cdl: dict[int, int | None] = {}
    for feature in extra["cdl"]:
        props = feature.get("properties") or {}
        code = props.get("cdl_code")
        cdl[int(props["year"])] = None if code is None else int(code)
    if check is not None:
        check(cdl)
    jobs = [_month_feature(ee, field, year, month) for year in years for month in range(1, 13)]
    try:
        with ThreadPoolExecutor(PARALLEL_QUERIES) as pool:
            results = list(pool.map(_get_info, jobs))
    except Exception as exc:  # cuota, memoria, red
        raise EarthEngineError(str(exc)) from exc
    return [result["properties"] for result in results], extra["static"], cdl
