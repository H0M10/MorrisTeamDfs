# Ficha del modelo: 3. Lectura del historial

> **Estado: ENTRENADO, MEDIDO Y EN USO (2026-11-15, tabla grande).** Artefactos en `backend/artifacts/model_3_crop_history_gru/` (`model.onnx`, `model.onnx.data`, `metrics.json`), verificados con `onnxruntime` en CPU. F1 macro `0.2716` contra `0.2439` de la línea base en 627 años-campo de Diamond Valley, que no vio al entrenar.

## Qué hace

Lee 12 meses de imágenes de satélite de un año y dice qué grupo de cultivo hubo: alfalfa, grano pequeño, maíz o barbecho, con su probabilidad. También entrega los pesos de atención: los meses que más pesaron en la lectura, que se muestran como tales y nunca como explicación causal.

## Datos

- **Etiqueta:** grupo de cultivo de USDA CDL del año.
- **Entradas:** NDVI, NDMI, BSI y NDTI mensuales de HLS (30 m), más una marca de mes sin imagen.
- **Tabla:** `data-pipeline/exports/train_fields.parquet`, 1 138 campos en 6 valles, 2016 a 2024. Antes: 15 campos y 45 secuencias.
- **Algoritmo:** GRU pequeña (32 unidades) con atención temporal, pesos por clase, 60 épocas, exportada a ONNX (opset 17).

## Partición

- **Por valle:** entrenado en los 5 valles que no son `diamond_valley_nv`; medido en `diamond_valley_nv` (627 años-campo).
- **Validación temporal:** 2024 de los valles de entrenamiento elige la mejor época. Su F1 es de validación, no de una segunda prueba independiente; esa prueba queda pendiente.

## Métrica contra la línea base

| | Diamond Valley (n = 627) | Línea base: decir siempre el cultivo más común |
| --- | ---: | ---: |
| F1 macro (4 clases) | **0.2716** | 0.2439 |
| F1 alfalfa | 0.881 | 0.975 |
| F1 grano pequeño | 0.205 | 0.000 |
| F1 maíz y barbecho | 0 (no hay en el valle) | 0 |

- **F1 macro en el último año de los otros valles, con las 4 clases presentes: 0.78.**
- **¿Gana?** Sí, por poco en Diamond Valley y con claridad en los otros valles. El F1 macro de Diamond Valley no puede pasar de cerca de 0.5, porque ahí no hay maíz ni barbecho y esas clases cuentan como 0.
- La corrida anterior daba 0.41 con solo 10 casos de prueba: era una cifra frágil. Esta, con 627, es más baja y más confiable.

## Cómo se usa en la herramienta

- Pesos de atención en la tira de 36 meses (`attention_weight`).
- `GET /api/v1/predictions/{id}`: cultivo leído cada año con su probabilidad y si coincide con USDA CDL. En `/tool/retrato`, "Lo que leen los modelos en tu parcela".

## Límites

- En Diamond Valley (1 808 m) distingue mal el grano pequeño (F1 0.21): confunde años de grano con alfalfa.
- Fuera de EE. UU. no hay etiqueta para medirlo: ahí es experimental.

## Cómo se reproduce

PyTorch solo-CPU en un entorno aparte (no en el del backend):

```bash
python models/model_3_crop_history_gru/train.py --table data-pipeline/exports/train_fields.parquet --test-valley diamond_valley_nv
```

En Windows, con `PYTHONIOENCODING=utf-8` (el exportador de ONNX imprime emojis). Alternativa: `colab_retrain.ipynb`.

Fecha de entrenamiento: 2026-11-15. Quién lo corrió: `@H0M10` / Claude Code. Dónde: CPU local, alrededor de 1 minuto.
