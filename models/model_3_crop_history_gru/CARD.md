# Ficha del modelo: 3. Lectura del historial de cultivos

> **Estado: ENTRENADO (ONNX exportado y verificado en CPU).** Empata con la línea base en F1 macro (0.125) por tamaño de muestra reducido (28 secuencias de entrenamiento). Artefacto en `backend/artifacts/model_3_crop_history_gru/`.

## Qué hace

Lee 12 meses de índices satelitales de una parcela y dice qué grupo de cultivo hubo ese año.

## Datos

- **Etiqueta:** CDL agrupado: `alfalfa`, `small_grain`, `corn`, `fallow`.
- **Entradas:** Series mensuales de 12 meses de `ndvi`, `ndmi`, `bsi`, `ndti`, `rain_mm`, `et0_mm`.
- **Tabla:** `multi_valley.parquet` (34 secuencias anuales completas), 18 parcelas en 3 valles (`diamond_valley_nv`, `snake_river_id`, `delta_valley_ut`), años 2022–2024.
- **Fuentes y escala nativa:** Landsat/HLS (30 m), USDA CDL (30 m), NASA POWER (~50 km).

## Partición

- **Por valle:** entrenado en `delta_valley_ut`, `snake_river_id` (28 secuencias); medido en `diamond_valley_nv` (6 secuencias).
- **Último año fuera:** 2024, como segunda prueba (F1 macro máx. 0.143 en época 40).
- Ninguna fila del valle de prueba se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto (6 secuencias) |
| --- | --- |
| **Modelo** (GRU pequeña con atención temporal, en ONNX) | **0.125 F1 macro** (`small_grain` F1 0.500) |
| **Línea base** (decir siempre la clase más frecuente) | 0.125 F1 macro (`small_grain` F1 0.500) |

- **Métrica:** F1 por clase y F1 macro en un valle no visto.
- **¿Gana a la línea base?** **Empata** (0.125 vs 0.125). Se reporta completo y verificado en CPU contra PyTorch.

## Límites

- Los pesos de atención son "meses que más pesaron en la lectura", no una explicación causal.
- En Querétaro no hay etiquetas para medirlo: aparece como **experimental** y no sustituye la declaración del agricultor.
- Solo conoce cuatro clases; cualquier otro cultivo queda mal leído.
- Con solo 28 secuencias anuales de entrenamiento, el modelo tiende a predecir la clase mayoritaria (`small_grain`).

## Cómo se reproduce

```bash
python models/model_3_crop_history_gru/train.py --table multi_valley.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: Checo (`@Checo-coder`). Dónde: Google Colab.
