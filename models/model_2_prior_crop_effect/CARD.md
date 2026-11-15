# Ficha del modelo: 2. Efecto del cultivo anterior

> **Estado: ENTRENADO Y MEDIDO — SIN EVIDENCIA DE MEJORA (2026-11-14, tabla grande).** Artefacto en `backend/artifacts/model_2_prior_crop_effect/`. Agregar el cultivo anterior **empeora** la predicción del vigor máximo en el valle no visto (`-4.6 %`). Se reporta íntegro y la herramienta dice "sin evidencia local".

## Qué hace

Describe cómo fue el vigor máximo de un cultivo según qué se sembró antes, en campos parecidos. Es observacional: nunca se presenta como causa ni produce cifras de ahorro.

## Datos

- **Etiqueta:** NDVI máximo del año (HLS, `30 m`).
- **Entradas:** grupo de cultivo, ET de referencia de la temporada, lluvia del año, elevación, arcilla y grupo de cultivo del año anterior (CDL).
- **Tabla:** `data-pipeline/exports/train_fields.parquet`: `1 138` parcelas en `6` valles de riego (`diamond_valley_nv` 94, `millard_ut` 240, `snake_river_id` 240, `lovelock_nv` 240, `mason_valley_nv` 154, `sevier_ut` 170), `2016-01` a `2024-12`, `122 904` filas mensuales. Cada parcela es el interior de un campo (círculo de 45 m donde CDL da el mismo grupo en 5 × 5 píxeles), muestreado por grupo de cultivo con `ee_sample_fields.py`. Corrida anterior: 15 parcelas, 2021–2024.
- `8 835` parcela-años dentro de los 4 grupos: `8 208` de entrenamiento, `627` del valle de prueba (`546` con todos los datos).

## Partición

- **Por valle:** entrenado en los 5 valles que no son `diamond_valley_nv`; medido en `diamond_valley_nv`.
- **Último año fuera:** `2024` de los valles de entrenamiento.

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`, n = 546) |
| --- | --- |
| **Modelo con el cultivo anterior** | error medio `0.1199` NDVI |
| **Línea base: el mismo modelo sin el cultivo anterior** | `0.1146` NDVI |
| **Mejora** | **-4.6 %** (empeora) |

- La corrida anterior daba `-6.3 %` con `9` casos de prueba; ahora con `546` el resultado se sostiene: en estos valles el cultivo anterior no ayuda a predecir el vigor.
- Lo que sí queda como dato descriptivo (`metrics.json`, `observed_peak_ndvi_by_sequence`): por ejemplo, alfalfa después de grano pequeño llegó a un NDVI máximo medio de `0.84` (n = 342) contra `0.81` después de alfalfa (n = 3 384). Es lo que pasó, no una causa.

## Límites

- Observacional: el cultivo anterior va junto con decisiones del agricultor que no vemos (riego, fertilización).
- En el valle de prueba solo hay alfalfa y grano pequeño.

## Cómo se reproduce

```bash
python data-pipeline/ee_sample_fields.py --valleys diamond_valley_nv --per-group 80 --ref-years 2018 2020 2022 2024 --min-spacing-m 400 --out parcels/...
python data-pipeline/ee_export_batched.py --parcels data-pipeline/parcels/train_fields.geojson --start-year 2016 --end-year 2024 --local-dir data-pipeline/exports/train_fields --batch 50 --years-per-call 1
python data-pipeline/build_table.py --parcels data-pipeline/parcels/train_fields.geojson --exports data-pipeline/exports/train_fields --prefix train_fields --out data-pipeline/exports/train_fields.parquet
python models/model_2_prior_crop_effect/train.py --table data-pipeline/exports/train_fields.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14 (noche, reentrenamiento con la tabla grande). Quién lo corrió: `@H0M10` / Claude Code. Dónde: CPU local (XGBoost) sobre tablas reducidas en Google Earth Engine (`luca-497507`).
