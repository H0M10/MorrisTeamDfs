"""Fuentes del núcleo (AGENTS.md sección 4) y cómo se leen en Earth Engine.

Los identificadores de colección se escribieron de memoria y NO se han
comprobado contra el catálogo: `ee_coverage.py` es el primer paso justo para
eso. Cada fuente lista candidatos en orden de preferencia; se usa el primero
que exista. Si ninguno existe, el guion se detiene y lo dice.

No se usan: GEDI, LANDFIRE, NAIP, NLCD, CoCoRaHS, NLDAS, ERA5.
NASA POWER no está en Earth Engine: se pide por su API en build_table.py.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Source:
    key: str
    candidates: tuple[str, ...]
    native_scale: str
    kind: str = "collection"  # "collection" o "image"
    labeled_only: bool = False  # solo existe en EE. UU. (CDL, OpenET)
    required: bool = True


SOURCES: tuple[Source, ...] = (
    Source("hls_l30", ("NASA/HLS/HLSL30/v002",), "30 m"),
    Source("hls_s30", ("NASA/HLS/HLSS30/v002",), "30 m", required=False),
    # Respaldo si HLS no cubre los años: Landsat 8 y 9, colección 2, nivel 2.
    Source("landsat8", ("LANDSAT/LC08/C02/T1_L2",), "30 m", required=False),
    Source("landsat9", ("LANDSAT/LC09/C02/T1_L2",), "30 m", required=False),
    Source("cdl", ("USDA/NASS/CDL",), "30 m", labeled_only=True),
    Source(
        "openet",
        (
            "OpenET/ENSEMBLE/CONUS/GRIDMET/MONTHLY/v2_0",
            "OpenET/ENSEMBLE/CONUS/GRIDMET/MONTHLY/v2_1",
        ),
        "30 m",
        labeled_only=True,
    ),
    Source(
        "smap",
        ("NASA/SMAP/SPL4SMGP/008", "NASA/SMAP/SPL4SMGP/007"),
        "9 km (contexto regional)",
    ),
    Source("srtm", ("USGS/SRTMGL1_003",), "30 m", kind="image"),
    Source("soil_clay", ("projects/soilgrids-isric/clay_mean",), "250 m", kind="image"),
    Source("soil_sand", ("projects/soilgrids-isric/sand_mean",), "250 m", kind="image"),
    Source("soil_silt", ("projects/soilgrids-isric/silt_mean",), "250 m", kind="image"),
    Source("soil_soc", ("projects/soilgrids-isric/soc_mean",), "250 m", kind="image"),
)
SOURCE_BY_KEY = {source.key: source for source in SOURCES}

# Bandas de HLS con nombre común. NDRE no se calcula: Landsat no tiene borde rojo.
HLS_L30_BANDS = {"B2": "blue", "B3": "green", "B4": "red", "B5": "nir", "B6": "swir1", "B7": "swir2"}
HLS_S30_BANDS = {"B2": "blue", "B3": "green", "B4": "red", "B8A": "nir", "B11": "swir1", "B12": "swir2"}
LANDSAT_BANDS = {
    "SR_B2": "blue",
    "SR_B3": "green",
    "SR_B4": "red",
    "SR_B5": "nir",
    "SR_B6": "swir1",
    "SR_B7": "swir2",
}
COMMON_BANDS = ["blue", "green", "red", "nir", "swir1", "swir2"]

# Fmask de HLS: bit 1 nube, bit 3 sombra, bit 4 nieve o hielo.
HLS_FMASK_REJECT = (1 << 1) | (1 << 3) | (1 << 4)

# CDL agrupado como lo usa el modelo 3 (AGENTS.md sección 5).
CDL_GROUPS: dict[str, tuple[int, ...]] = {
    "alfalfa": (36,),
    "small_grain": (21, 22, 23, 24, 27, 28, 205),  # cebada, trigos, centeno, avena, triticale
    "corn": (1, 12, 13),
    "fallow": (61,),
}


def cdl_group(code: int | None) -> str:
    if code is None:
        return "unknown"
    for group, codes in CDL_GROUPS.items():
        if int(code) in codes:
            return group
    return "other"
