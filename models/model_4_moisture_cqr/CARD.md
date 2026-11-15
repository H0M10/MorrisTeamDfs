# Ficha del modelo: 4. Humedad con intervalo

> **Estado: ENTRENADO Y MEDIDO (2026-11-14, tabla grande y calibración por valle).** Artefacto en `backend/artifacts/model_4_moisture_cqr/` (`model.ubj` + `metrics.json`). El intervalo al 90 % contiene la humedad real de SMAP en `96.3 %` de los meses del valle no visto, contra `62.0 %` de la línea base.

## Qué hace

Estima la humedad del suelo de la zona con un intervalo que debe contener el valor real 9 de cada 10 veces.

## Datos

- **Etiqueta:** humedad en zona de raíces de SMAP L4 (`smap_sm_rootzone`, `9 km`).
- **Entradas:** mes, ET de referencia, lluvia, temperaturas (NASA POWER), NDVI (HLS) e índice relativo de agua del balance FAO-56.
- **Tabla:** `data-pipeline/exports/train_fields.parquet`: `1 138` parcelas en `6` valles de riego (`diamond_valley_nv` 94, `millard_ut` 240, `snake_river_id` 240, `lovelock_nv` 240, `mason_valley_nv` 154, `sevier_ut` 170), `2016-01` a `2024-12`, `122 904` filas mensuales. Cada parcela es el interior de un campo (círculo de 45 m donde CDL da el mismo grupo en 5 × 5 píxeles), muestreado por grupo de cultivo con `ee_sample_fields.py`. Corrida anterior: 15 parcelas, 2021–2024.
- Promediado por valle y mes (SMAP no distingue parcelas): `648` meses de zona; `540` de entrenamiento y `108` de prueba.

## Partición y calibración

- **Por valle:** ajustado en los 5 valles que no son `diamond_valley_nv`; medido en `diamond_valley_nv` (`108` meses de zona).
- **Cambio de método:** antes el intervalo se calibraba con el último año de los mismos valles, y nunca veía el error de cambiar de valle (Diamond Valley está a `1 808 m`). Ahora la calibración conformal deja un valle fuera cada vez: cada valle de entrenamiento se predice con un modelo que no lo vio, y el margen sale de esos errores (`540` puntos de calibración, margen `q = 0.0252` m³/m³).

El modelo final usa todos los años de los valles de entrenamiento. No se ejecutó una segunda prueba temporal con el último año separado; queda pendiente.

## Métrica contra la línea base

| | Cobertura en el valle no visto (108 meses) | Ancho medio |
| --- | --- | --- |
| **Modelo** (balance FAO-56 + residual con árboles + CQR al 90 %) | **96.3 %** | 0.154 m³/m³ |
| **Línea base** (balance FAO-56 con rango histórico p5–p95) | 62.0 % | 0.118 m³/m³ |

- **¿Gana?** Sí, y queda a menos de 10 puntos del objetivo de 90 %. El precio es un intervalo más ancho. La corrida anterior daba `58.3 %`.

## Límites

- **Es contexto regional de 9 km.** Se valida a escala de zona y nunca se muestra como humedad de la parcela.
- Cubre de más (96 % en vez de 90 %): el intervalo es conservador.
- El índice del balance usa una capacidad de agua supuesta (`150 mm`).

## Cómo se reproduce

```bash
python data-pipeline/ee_sample_fields.py --valleys diamond_valley_nv --per-group 80 --ref-years 2018 2020 2022 2024 --min-spacing-m 400 --out parcels/...
python data-pipeline/ee_export_batched.py --parcels data-pipeline/parcels/train_fields.geojson --start-year 2016 --end-year 2024 --local-dir data-pipeline/exports/train_fields --batch 50 --years-per-call 1
python data-pipeline/build_table.py --parcels data-pipeline/parcels/train_fields.geojson --exports data-pipeline/exports/train_fields --prefix train_fields --out data-pipeline/exports/train_fields.parquet
python models/model_4_moisture_cqr/train.py --table data-pipeline/exports/train_fields.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14 (noche, reentrenamiento con la tabla grande). Quién lo corrió: `@H0M10` / Claude Code. Dónde: CPU local (XGBoost) sobre tablas reducidas en Google Earth Engine (`luca-497507`).
