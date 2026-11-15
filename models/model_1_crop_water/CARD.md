# Ficha del modelo: 1. Agua que usa cada cultivo

> **Estado: ENTRENADO Y MEDIDO (2026-11-14, tabla grande).** Artefacto en `backend/artifacts/model_1_crop_water/` (`model.ubj` + `metrics.json`). Gana a FAO-56 en el valle no visto: `12.96 mm` contra `25.25 mm` de error medio mensual, en `7 524` meses de prueba.

## Qué hace

Estima la evapotranspiración mensual de un campo (mm) según su cultivo, el clima y su vigor visto desde el satélite.

## Datos

- **Etiqueta:** OpenET (conjunto de modelos, `30 m`), mensual.
- **Entradas:** grupo de cultivo de CDL, mes, ET de referencia, lluvia, temperaturas máxima y mínima (NASA POWER), NDVI y NDMI (HLS), elevación (SRTM).
- **Tabla:** `data-pipeline/exports/train_fields.parquet`: `1 138` parcelas en `6` valles de riego (`diamond_valley_nv` 94, `millard_ut` 240, `snake_river_id` 240, `lovelock_nv` 240, `mason_valley_nv` 154, `sevier_ut` 170), `2016-01` a `2024-12`, `122 904` filas mensuales. Cada parcela es el interior de un campo (círculo de 45 m donde CDL da el mismo grupo en 5 × 5 píxeles), muestreado por grupo de cultivo con `ee_sample_fields.py`. Corrida anterior: 15 parcelas, 2021–2024.
- Filas útiles (cultivo en los 4 grupos, con OpenET y NDVI): `102 953`; entrenamiento `96 077`.

## Partición

- **Por valle:** entrenado en los 5 valles que no son `diamond_valley_nv`; medido en `diamond_valley_nv` (`7 524` parcela-meses, nunca visto).
- **Último año fuera:** `2024` de los valles de entrenamiento para detener el entrenamiento y como segunda prueba (`8.79 mm`).

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`, n = 7 524) |
| --- | --- |
| **Modelo** (XGBoost) | **12.96 mm** de error medio mensual |
| **Línea base** (FAO-56, Kc × ET0) | **25.25 mm** |

- **¿Gana?** Sí: reduce el error a la mitad. La corrida anterior daba `9.25 mm` pero con solo `120` meses de prueba en 3 parcelas; esta cifra es más alta y mucho más confiable.
- **Variante sin satélite** (cultivo, clima, suelo y elevación; sirve para rotaciones que nadie ha sembrado): `20.11 mm` contra `25.25 mm`. Gana, por menos. Resultado guardado aparte; todavía no está conectada al motor.

## Límites

- En el valle de prueba solo hay alfalfa y grano pequeño: el error de maíz y barbecho se mide solo en el último año de los otros valles.
- Usa el NDVI del cultivo que de verdad se sembró: no sirve tal cual para rotaciones hipotéticas. Por eso el motor calcula el agua de las alternativas con FAO-56 calibrado por OpenET de la parcela.
- Solo vale donde hay OpenET y CDL (EE. UU. contiguos). En México es experimental.

## Cómo se reproduce

```bash
python data-pipeline/ee_sample_fields.py --valleys diamond_valley_nv --per-group 80 --ref-years 2018 2020 2022 2024 --min-spacing-m 400 --out parcels/...
python data-pipeline/ee_export_batched.py --parcels data-pipeline/parcels/train_fields.geojson --start-year 2016 --end-year 2024 --local-dir data-pipeline/exports/train_fields --batch 50 --years-per-call 1
python data-pipeline/build_table.py --parcels data-pipeline/parcels/train_fields.geojson --exports data-pipeline/exports/train_fields --prefix train_fields --out data-pipeline/exports/train_fields.parquet
python models/model_1_crop_water/train.py --table data-pipeline/exports/train_fields.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14 (noche, reentrenamiento con la tabla grande). Quién lo corrió: `@H0M10` / Claude Code. Dónde: CPU local (XGBoost) sobre tablas reducidas en Google Earth Engine (`luca-497507`).
