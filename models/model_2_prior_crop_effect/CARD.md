# Ficha del modelo: 2. Efecto del cultivo anterior

> **Estado: FALLBACK ("Sin evidencia local").** El modelo se entrenó y midió honestamente contra la línea base, pero no mejoró la predicción del vigor en el valle no visto (-10.39 %). Conforme a `AGENTS.md`, entra su respaldo.

## Qué hace

Describe cómo fue el vigor máximo de un cultivo según qué se sembró antes, en campos parecidos.

## Datos

- **Etiqueta:** Secuencias de cultivo de CDL y vigor máximo anual (NDVI) de Landsat/HLS.
- **Entradas:** `crop_code`, `prev_crop_code`, `et0_mm`, `rain_mm`, `elevation_m`, `clay_pct`, `sand_pct`, `soc_gkg`.
- **Tabla:** `multi_valley.parquet` (25 secuencias anuales válidas), 18 parcelas en 3 valles (`diamond_valley_nv`, `snake_river_id`, `delta_valley_ut`), años 2022–2024.
- **Fuentes y escala nativa:** USDA CDL (30 m), Landsat/HLS (30 m), SoilGrids (250 m), SRTM (30 m), NASA POWER (~50 km).

## Partición

- **Por valle:** entrenado en `delta_valley_ut`, `snake_river_id` (21 filas anuales); medido en `diamond_valley_nv` (4 filas anuales).
- **Último año fuera:** 2024, como segunda prueba.
- Ninguna fila del valle de prueba se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto | Último año |
| --- | --- | --- |
| **Modelo** (XGBoost con cultivo anterior) | 0.1853 NDVI MAE | 0.1585 |
| **Línea base** (el mismo modelo sin cultivo anterior) | **0.1679 NDVI MAE** | 0.1628 |

- **Métrica:** reducción del error al agregar el cultivo anterior, en un valle no visto (**-10.3924 %**).
- **¿Gana a la línea base?** **No.** El cultivo anterior no mejora la predicción en esta muestra; la ficha reportará `"Sin evidencia local"`.

## Límites

- **Es observacional.** Se presenta como "lo que pasó en campos parecidos", nunca como causa.
- **No produce cifras de ahorro de agua.**
- No existe fuera de EE. UU. (no hay CDL): ahí el estado es `absent`.
- Muestra anual muy pequeña (21 secuencias de entrenamiento y 4 de prueba).

## Cómo se reproduce

```bash
python models/model_2_prior_crop_effect/train.py --table multi_valley.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: Checo (`@Checo-coder`). Dónde: Google Colab.
