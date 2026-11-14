# Ficha del modelo: 2. Efecto del cultivo anterior

> **Estado: PENDIENTE.** Este modelo no se ha entrenado ni medido. Mientras
> esta ficha no tenga cifras reales, la API usa su respaldo: "Sin evidencia local" en la ficha de evidencia.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Describe cómo fue el vigor máximo de un cultivo según qué se sembró antes, en campos parecidos.

## Datos

- **Etiqueta:** Secuencias de cultivo de CDL y vigor máximo anual (NDVI) de Landsat/HLS.
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
| **Línea base** (el mismo modelo sin el cultivo anterior) | <valor> | <valor> |

- **Métrica:** reducción del error al agregar el cultivo anterior, en un valle no visto.
- **¿Gana a la línea base?** <sí o no; se reporta aunque pierda>

## Límites

- **Es observacional.** Se presenta como "lo que pasó en campos parecidos", nunca como causa.
- **No produce cifras de ahorro de agua.**
- No existe fuera de EE. UU. (no hay CDL): ahí el estado es `absent`.
- <otros límites vistos al entrenar>

## Cómo se reproduce

```bash
python models/model_2_prior_crop_effect/train.py --table <tabla.parquet> --test-valley <valle>
```

Fecha de entrenamiento: <AAAA-MM-DD>. Quién lo corrió: <persona>. Dónde: <Colab o máquina>.
