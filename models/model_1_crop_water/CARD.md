# Ficha del modelo: 1. Agua que usa cada cultivo

> **Estado: ENTRENADO.** Validado en valle no visto (`diamond_valley_nv`) contra la línea base FAO-56. Artefacto en `backend/artifacts/model_1_crop_water/`.

## Qué hace

Estima la evapotranspiración mensual de un cultivo en una parcela a partir del clima y del vigor observado.

## Datos

- **Etiqueta:** OpenET mensual por píxel, con el cultivo de USDA CDL.
- **Entradas:** `crop_code`, `month_num`, `et0_mm`, `rain_mm`, `tmax_c`, `tmin_c`, `ndvi`, `ndmi`, `elevation_m`.
- **Tabla:** `multi_valley.parquet` (648 filas totales; 408 filas válidas tras filtrar los 4 grupos de cultivo), 18 parcelas en 3 valles (`diamond_valley_nv`, `snake_river_id`, `delta_valley_ut`), años 2022–2024.
- **Fuentes y escala nativa:** OpenET (30 m), USDA CDL (30 m), Landsat/HLS (30 m), SRTM (30 m), NASA POWER (~50 km).

## Partición

- **Por valle:** entrenado en `delta_valley_ut`, `snake_river_id` (336 filas); medido en `diamond_valley_nv` (72 filas).
- **Último año fuera:** 2024, como segunda prueba.
- Ninguna fila del valle de prueba se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto | Último año |
| --- | --- | --- |
| **Modelo** (XGBoost) | **11.675 mm** (11.7 mm) | 11.0 mm |
| **Línea base** (FAO-56, Kc × ET0) | 45.1146 mm (45.1 mm) | — |

- **Métrica:** error medio absoluto en mm por mes en un valle no visto.
- **¿Gana a la línea base?** **Sí** (reduce el error de 45.1 mm a 11.7 mm).

## Límites

- Solo vale donde hay OpenET para entrenar (oeste de EE. UU.). Fuera de ahí es transferencia sin verificar.
- OpenET es a su vez un modelo: el error se mide contra él, no contra un medidor en campo.
- Muestra de entrenamiento de 12 parcelas (336 filas mensuales) en dos valles de referencia.

## Cómo se reproduce

```bash
python models/model_1_crop_water/train.py --table multi_valley.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: Checo (`@Checo-coder`). Dónde: Google Colab.
