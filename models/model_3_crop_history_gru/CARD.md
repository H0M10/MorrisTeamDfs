# Ficha del modelo: 3. Lectura del historial de cultivos

> **Estado: PENDIENTE.** Este modelo no se ha entrenado ni medido. Mientras
> esta ficha no tenga cifras reales, la API usa su respaldo: el agricultor declara su historial.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Lee 12 meses de índices satelitales de una parcela y dice qué grupo de cultivo hubo ese año.

## Datos

- **Etiqueta:** CDL agrupado: alfalfa, grano pequeño, maíz, barbecho.
- **Entradas:** <columnas usadas, de `metrics.json` → `extra.features`>
- **Tabla:** <archivo, número de filas, valles, años>
- **Fuentes y escala nativa:** <por ejemplo OpenET 30 m, POWER cerca de 50 km>

## Partición

- **Por valle:** entrenado en <valles>; medido en <valle no visto>.
- **Último año fuera:** <año>, como segunda prueba.
- Ninguna fila del valle de prueba se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto | Último año |
| --- | --- | --- |
| **Modelo** (GRU pequeña con atención temporal, en ONNX) | <valor> | <valor> |
| **Línea base** (decir siempre la clase más frecuente) | <valor> | <valor> |

- **Métrica:** F1 por clase y F1 macro en un valle no visto.
- **¿Gana a la línea base?** <sí o no; se reporta aunque pierda>

## Límites

- Los pesos de atención son "meses que más pesaron en la lectura", no una explicación causal.
- En Querétaro no hay etiquetas para medirlo: aparece como **experimental** y no sustituye la declaración del agricultor.
- Solo conoce cuatro clases; cualquier otro cultivo queda mal leído.
- <otros límites vistos al entrenar>

## Cómo se reproduce

```bash
python models/model_3_crop_history_gru/train.py --table <tabla.parquet> --test-valley <valle>
```

Fecha de entrenamiento: <AAAA-MM-DD>. Quién lo corrió: <persona>. Dónde: <Colab o máquina>.
