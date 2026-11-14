# Ficha del modelo: 1. Agua que usa cada cultivo

> **Estado: PENDIENTE.** Este modelo no se ha entrenado ni medido. Mientras
> esta ficha no tenga cifras reales, la API usa su respaldo: la tabla FAO-56, declarada.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Estima la evapotranspiración mensual de un cultivo en una parcela a partir del clima y del vigor observado.

## Datos

- **Etiqueta:** OpenET mensual por píxel, con el cultivo de USDA CDL.
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
| **Modelo** (XGBoost) | <valor> | <valor> |
| **Línea base** (FAO-56, Kc × ET0) | <valor> | <valor> |

- **Métrica:** error medio absoluto en mm por mes en un valle no visto.
- **¿Gana a la línea base?** <sí o no; se reporta aunque pierda>

## Límites

- Solo vale donde hay OpenET para entrenar (oeste de EE. UU.). Fuera de ahí es transferencia sin verificar.
- OpenET es a su vez un modelo: el error se mide contra él, no contra un medidor en campo.
- <otros límites vistos al entrenar>

## Cómo se reproduce

```bash
python models/model_1_crop_water/train.py --table <tabla.parquet> --test-valley <valle>
```

Fecha de entrenamiento: <AAAA-MM-DD>. Quién lo corrió: <persona>. Dónde: <Colab o máquina>.
