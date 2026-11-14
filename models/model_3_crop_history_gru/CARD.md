# Ficha del modelo: 3. Lectura del historial de cultivos

> **Estado: ENTRENADO Y MEDIDO EN ONNX (2026-11-14).** Artefactos en `backend/artifacts/model_3_crop_history_gru/` (`model.onnx`, `model.onnx.data` y `metrics.json`) entrenados en CPU y verificados con `onnxruntime` CPU. Supera a la línea base en F1 macro (`0.4143` vs `0.2222`). Ver Límites.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Lee 12 meses de índices satelitales de una parcela y dice qué grupo de cultivo hubo ese año, entregando además un vector de atención temporal sobre los 12 meses.

## Datos

- **Etiqueta:** CDL agrupado: `alfalfa`, `small_grain` (grano pequeño), `corn` (maíz), `fallow` (barbecho).
- **Entradas:** `ndvi`, `ndmi`, `bsi`, `ndti`, `missing_flag` (forma `[batch, 12, 5]`; salidas `logits`, `attention`).
- **Tabla:** `data-pipeline/exports/multi_valley_us.parquet` (`45` secuencias parcela-año de 12 meses dentro de `CROP_GROUPS` en `2021–2024`: `35` en entrenamiento y `10` en prueba).
- **Fuentes y escala nativa:** USDA CDL (`30 m`), Landsat/HLS (`30 m`, `observed`).

## Partición

- **Por valle:** entrenado en `millard_ut` + `snake_river_id` (`35` secuencias); medido en `diamond_valley_nv` (`10` secuencias, nunca visto).
- **Último año fuera:** `2024` dentro de los valles de entrenamiento para seleccionar la mejor época (`F1 macro = 0.581`).
- Ninguna fila del valle de prueba se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`, `n = 10`) | Último año (`2024`, entrenamiento) |
| --- | --- | --- |
| **Modelo** (`CropHistoryGRU`, `hidden = 32`, ONNX en CPU) | **0.4143 F1 macro** (`alfalfa 0.857`, `small_grain 0.800`, `corn 0.000`, `fallow 0.000`) | **0.581 F1 macro** |
| **Línea base** (decir siempre `'alfalfa'`, clase más frecuente) | **0.2222 F1 macro** (`alfalfa 0.889`, `small_grain 0.000`, `corn 0.000`, `fallow 0.000`) | — |

- **Métrica:** F1 por clase y F1 macro en un valle no visto.
- **¿Gana a la línea base?** **Sí** (`0.4143` vs `0.2222` F1 macro en `diamond_valley_nv`; distingue `small_grain` además de `alfalfa`). ONNX verificado en `onnxruntime` CPU (`atol = 1e-4` contra PyTorch y suma de atención igual a `1.0`).

## Límites

- Los pesos de atención son "meses que más pesaron en la lectura", no una explicación causal.
- En Querétaro no hay etiquetas para medirlo: aparece como **experimental** y no sustituye la declaración del agricultor.
- Solo conoce cuatro clases; cualquier otro cultivo queda mal leído.
- Muestra de prueba pequeña (`n = 10` secuencias en `diamond_valley_nv`), dominada por `alfalfa` y `small_grain` (`corn` y `fallow` quedan en `0.000` F1 por falta de soporte en la prueba).

## Cómo se reproduce

```bash
python -m uv --directory backend run --no-project --with torch --with onnx --with onnxscript --with onnxruntime --with numpy --with pandas --with pyarrow --extra-index-url https://download.pytorch.org/whl/cpu python ../models/model_3_crop_history_gru/train.py --table ../data-pipeline/exports/multi_valley_us.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: `@H0M10` / ARGON. Dónde: CPU local (`torch` CPU + `onnxruntime`) sobre tabla multi-valle extraída de Google Earth Engine (`luca-497507`).
