# Ficha del modelo: 1. Agua que usa cada cultivo

> **Estado: ENTRENADO Y MEDIDO (2026-11-14).** Artefacto en `backend/artifacts/model_1_crop_water/` (`model.ubj` + `metrics.json`) entrenado en CPU sobre tabla real multi-valle (`2021–2024`). Ver sección Límites.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Estima la evapotranspiración mensual de un cultivo en una parcela a partir del clima y del vigor observado.

## Datos

- **Etiqueta:** OpenET mensual por píxel (`openet_et_mm`), con el cultivo de USDA CDL (`cdl_code` / `crop_group`).
- **Entradas:** `crop_code`, `month_num`, `et0_mm`, `rain_mm`, `tmax_c`, `tmin_c`, `ndvi`, `ndmi`, `elevation_m`.
- **Tabla:** `data-pipeline/exports/multi_valley_us.parquet` (`720` filas totales; `540` filas en los 4 grupos `CROP_GROUPS` usadas tras filtrar clases fuera de grupo y vacíos), `15` parcelas en `3` valles, `2021-01` a `2024-12`.
- **Fuentes y escala nativa:** OpenET (`30 m`, `modeled`), USDA CDL (`30 m`), Landsat/HLS (`30 m`, `observed`), SRTM (`30 m`, `observed`), NASA POWER (`cerca de 50 km`, `modeled`).

## Partición

- **Por valle:** entrenado en `millard_ut` + `snake_river_id` (`420` filas); medido en `diamond_valley_nv` (`120` filas, nunca visto).
- **Último año fuera:** `2024` dentro de los valles de entrenamiento (`early stopping` y segunda prueba).
- Ninguna fila de `diamond_valley_nv` se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`) | Último año (`2024`, entrenamiento) |
| --- | --- | --- |
| **Modelo** (XGBoost, `best_iteration = 65`) | **9.2512 mm** (`9.3 mm`) | **9.626 mm** (`9.6 mm`) |
| **Línea base** (FAO-56, Kc × ET0) | **29.0496 mm** (`29.0 mm`) | — |

- **Métrica:** error medio absoluto (MAE) en mm por mes en un valle no visto.
- **¿Gana a la línea base?** **Sí** (`9.25 mm` vs `29.05 mm` de FAO-56 en `diamond_valley_nv`).

## Límites

- Solo vale donde hay OpenET y CDL para entrenar (EE. UU. contiguos; en México corre fuera de su dominio de entrenamiento o entra su respaldo FAO-56).
- OpenET es a su vez un conjunto de modelos: el error se mide contra OpenET, no contra lisímetros ni torres de flujo en campo.
- Muestra de `15` parcelas elegidas por USDA CDL en 3 valles (`NV`, `ID`, `UT`); en inferencia de rotaciones alternativas aún falta conectar el paso que sustituya al respaldo FAO-56 (`PLAN.md` C-04 / A-07).
- `table_to_contract.py` todavía calcula el agua de cada rotación en `/evaluate` usando el respaldo FAO-56 hasta integrar `model.ubj` en `A-07`.

## Cómo se reproduce

```bash
python -m uv --directory backend run --no-sync python ../models/model_1_crop_water/train.py --table ../data-pipeline/exports/multi_valley_us.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: `@H0M10` / ARGON. Dónde: CPU local sobre tablas exportadas de Google Earth Engine (`luca-497507`).
