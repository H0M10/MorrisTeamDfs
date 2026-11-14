"""Índices espectrales (AGENTS.md sección 5). Funciones puras.

Entradas: reflectancia de superficie (0 a 1) como número o arreglo de numpy.
Si el denominador es cero el resultado es NaN: no se inventa un valor.

No hay NDRE aquí a propósito: necesita la banda de borde rojo, que Landsat no
tiene. Tampoco CAI: no se puede calcular con Landsat ni Sentinel-2. NDTI es
solo un indicio cualitativo de rastrojo.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike, NDArray

Number = float | NDArray[np.float64]


def _ratio(numerator: ArrayLike, denominator: ArrayLike) -> Number:
    num = np.asarray(numerator, dtype=np.float64)
    den = np.asarray(denominator, dtype=np.float64)
    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.where(den == 0, np.nan, num / den)
    return float(out) if out.ndim == 0 else out


def _arr(value: ArrayLike) -> NDArray[np.float64]:
    return np.asarray(value, dtype=np.float64)


def ndvi(nir: ArrayLike, red: ArrayLike) -> Number:
    """Vigor: (NIR - Red) / (NIR + Red)."""
    return _ratio(_arr(nir) - _arr(red), _arr(nir) + _arr(red))


def ndmi(nir: ArrayLike, swir1: ArrayLike) -> Number:
    """Humedad de la vegetación: (NIR - SWIR1) / (NIR + SWIR1)."""
    return _ratio(_arr(nir) - _arr(swir1), _arr(nir) + _arr(swir1))


def bsi(swir1: ArrayLike, red: ArrayLike, nir: ArrayLike, blue: ArrayLike) -> Number:
    """Suelo desnudo: ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))."""
    soil = _arr(swir1) + _arr(red)
    cover = _arr(nir) + _arr(blue)
    return _ratio(soil - cover, soil + cover)


def ndti(swir1: ArrayLike, swir2: ArrayLike) -> Number:
    """Indicio cualitativo de rastrojo: (SWIR1 - SWIR2) / (SWIR1 + SWIR2)."""
    return _ratio(_arr(swir1) - _arr(swir2), _arr(swir1) + _arr(swir2))
