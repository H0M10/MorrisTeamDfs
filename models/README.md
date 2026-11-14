# /models — Modelos

Dueño: Checo (`@Checo-coder`) y Hanniel (`@H0M10`) — Modelos.
Entrega: entrenamiento con partición por valle, artefactos ligeros para CPU
(XGBoost y ONNX) y una ficha `CARD.md` por modelo con su métrica frente a la
línea base.

> **Estado:** ningún modelo está entrenado. Los guiones 1, 2 y 4 corrieron de
> principio a fin con una tabla sintética (`--sample`); el 3 necesita PyTorch
> y **no se ha ejecutado**. La API tiene los cuatro en respaldo.

## Un guion por modelo

| Modelo | Guion | Etiqueta | Métrica | Línea base | Dónde corre |
| --- | --- | --- | --- | --- | --- |
| 1. Agua por cultivo | `model_1_crop_water/train.py` | OpenET | MAE en mm | FAO-56 (`kc_monthly.csv`) | Colab, CPU, < 2 GB |
| 2. Cultivo anterior | `model_2_prior_crop_effect/train.py` | Vigor máximo anual | Mejora al agregar el cultivo anterior | Mismo modelo sin él | Colab, CPU, < 1 GB |
| 3. Historial | `model_3_crop_history_gru/train.py` | CDL agrupado | F1 por clase | Clase más frecuente | Colab (PyTorch), unos 3 GB |
| 4. Humedad con intervalo | `model_4_moisture_cqr/train.py` | SMAP | Cobertura del intervalo al 90 % | Rango histórico | Colab, CPU, < 1 GB |

Todos usan `common.py`, que pone en código las reglas de validación:

1. **Partición por valle**, nunca por fila al azar: `--test-valley` queda fuera.
2. **El último año** de los valles de entrenamiento es la segunda prueba.
3. **Siempre se reporta la línea base**, aunque el modelo pierda.

## Comandos

```bash
pip install -r models/requirements.txt

# Prueba de flujo con tabla sintética (segundos; no mide nada real)
python models/model_1_crop_water/train.py --sample

# Entrenamiento real: tabla de /data-pipeline con varios valles
python models/model_1_crop_water/train.py --table <tabla.parquet> --test-valley diamond_valley_nv
```

Cada corrida real escribe en `backend/artifacts/<modelo>/`:

- `model.ubj` (XGBoost) o `model.onnx` (modelo 3), y
- `metrics.json` con la métrica, la línea base y la partición.

La API los carga sola al arrancar. Sin `metrics.json`, o si viene de una
corrida `--sample`, el modelo se queda en respaldo. Las corridas `--sample`
escriben en `models/_smoke/` (ignorado por git).

## Antes de entrenar

- **Tabla con al menos dos valles.** Con uno solo los guiones se detienen: no
  se puede medir en un valle no visto. La columna `valley` viene del GeoJSON de
  parcelas de `/data-pipeline`.
- **Modelo 1: `kc_monthly.csv` está vacío.** Una persona debe llenarlo con los
  coeficientes de FAO-56 por cultivo y mes (`HUMANO.md` H-04). Sin él, el
  guion se detiene: no hay línea base inventada.

## Después de entrenar

1. Llena `models/<modelo>/CARD.md` (plantilla en `CARD_TEMPLATE.md`).
2. Sube `backend/artifacts/<modelo>/` al repositorio si pesa poco (MB, no GB).
3. Corte del domingo 8:00: el modelo sin métrica sale y queda su respaldo.

## Reglas

- Los artefactos corren en CPU. Sin modelos fundacionales geoespaciales.
- Nada de entrenar en las laptops de 8 GB con tablas reales.
- El modelo 2 es observacional: nunca causa, nunca ahorro de agua.
- El modelo 4 es contexto regional de 9 km.
