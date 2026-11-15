# Ficha del modelo: 1. Agua que usa cada cultivo

> **Estado: ENTRENADO, MEDIDO Y EN USO (2026-11-15).** Artefacto en `backend/artifacts/model_1_crop_water/` (`model.ubj` + `metrics.json`). Versión **sin satélite**: cultivo, clima y suelo. Gana a FAO-56 en el valle no visto: `20.11 mm` contra `25.25 mm` de error medio mensual, en `7 524` meses de prueba. **Predice en vivo el agua de las rotaciones alternativas** en las parcelas con etiquetas.

## Qué hace

Estima la evapotranspiración mensual de un campo (mm) según su cultivo, el clima y el suelo local.

## Datos

- **Etiqueta:** OpenET (conjunto de modelos, `30 m`), mensual.
- **Entradas:** grupo de cultivo de CDL, mes, ET de referencia, lluvia, temperaturas máxima y mínima (NASA POWER), elevación (SRTM), arcilla y arena (SoilGrids). **Sin NDVI ni NDMI** a propósito: el vigor solo existe para lo que de verdad se sembró, y el modelo tiene que predecir rotaciones que nadie ha sembrado.
- **Tabla:** `data-pipeline/exports/train_fields.parquet`: `1 138` parcelas en `6` valles de riego (`diamond_valley_nv` 94, `millard_ut` 240, `snake_river_id` 240, `lovelock_nv` 240, `mason_valley_nv` 154, `sevier_ut` 170), `2016-01` a `2024-12`, `122 904` filas mensuales. Cada parcela es el interior de un campo (círculo de 45 m donde CDL da el mismo grupo en 5 × 5 píxeles), muestreado por grupo de cultivo con `ee_sample_fields.py`. Corrida anterior: 15 parcelas, 2021–2024.
- Filas útiles (cultivo en los 4 grupos, con OpenET y NDVI): `102 953`; entrenamiento `96 077`.

## Partición

- **Por valle:** entrenado en los 5 valles que no son `diamond_valley_nv`; medido en `diamond_valley_nv` (`7 524` parcela-meses, nunca visto).
- **Validación temporal:** `2024` de los valles de entrenamiento se usa para detener el entrenamiento (`15.21 mm`). No es una segunda prueba independiente; esa prueba queda pendiente.

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`, n = 7 524) |
| --- | --- |
| **Modelo** (XGBoost, sin satélite) | **20.11 mm** de error medio mensual |
| **Línea base** (FAO-56, Kc × ET0) | **25.25 mm** |

- **¿Gana?** Sí, un 20 % menos de error. La variante con NDVI y NDMI daba `12.96 mm`, pero no sirve para escenarios hipotéticos y no se usa.
- Último año de los valles de entrenamiento: `15.21 mm`.

## Cómo se usa en la herramienta

- `table_to_contract.model1_water`: para cada mes de la rotación, si el cultivo es alfalfa, grano pequeño, maíz o barbecho, predice la ET con el modelo; los demás cultivos usan FAO-56. El riego es ET menos lluvia efectiva (USDA SCS), promedio por año.
- **Ajuste por parcela:** en Diamond Valley el modelo sobreestima la rotación actual entre `+93` y `+153 mm/año` frente a lo que midió OpenET. Las alternativas se multiplican por el factor `medido / predicho` de la misma parcela (el factor se informa en la fuente de cada evaluación): el modelo aporta la diferencia entre cultivos según clima y suelo; la medición del campo, el nivel. La ficha de la rotación actual muestra esa comprobación.
- Las alternativas dependen de las restricciones vigentes; no se fija aquí una cifra de ejemplo. La tabla muestra el promedio anual, pero la viabilidad comprueba el año de mayor consumo con la misma fuente y calibración.
- Solo en parcelas con etiquetas (EE. UU.). Sin OpenET en la parcela no hay ajuste y se usa la predicción tal cual.

## Límites

- En el valle de prueba solo hay alfalfa y grano pequeño: el error de maíz y barbecho se mide solo en el último año de los otros valles.
- Sesgo alto en Diamond Valley (1 808 m, el valle más alto): por eso se ajusta con OpenET de cada parcela.
- Solo vale donde hay OpenET y CDL (EE. UU. contiguos). En México es experimental.

## Cómo se reproduce

```bash
python data-pipeline/ee_sample_fields.py --valleys diamond_valley_nv --per-group 80 --ref-years 2018 2020 2022 2024 --min-spacing-m 400 --out parcels/...
python data-pipeline/ee_export_batched.py --parcels data-pipeline/parcels/train_fields.geojson --start-year 2016 --end-year 2024 --local-dir data-pipeline/exports/train_fields --batch 50 --years-per-call 1
python data-pipeline/build_table.py --parcels data-pipeline/parcels/train_fields.geojson --exports data-pipeline/exports/train_fields --prefix train_fields --out data-pipeline/exports/train_fields.parquet
python models/model_1_crop_water/train.py --table data-pipeline/exports/train_fields.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14 (noche, reentrenamiento con la tabla grande). Quién lo corrió: `@H0M10` / Claude Code. Dónde: CPU local (XGBoost) sobre tablas reducidas en Google Earth Engine (`luca-497507`).
