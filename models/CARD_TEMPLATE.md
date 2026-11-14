# Ficha del modelo: <nombre del modelo>

> **Estado: PENDIENTE.** Este modelo no se ha entrenado ni medido. Mientras
> esta ficha no tenga cifras reales, la API usa su respaldo: <respaldo de AGENTS.md sección 5>

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

<una o dos frases>

## Datos

- **Etiqueta:** <de dónde sale la verdad>
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
| **Modelo** (<algoritmo>) | <valor> | <valor> |
| **Línea base** (<línea base>) | <valor> | <valor> |

- **Métrica:** <métrica y unidad>
- **¿Gana a la línea base?** <sí o no; se reporta aunque pierda>

## Límites

- <límite principal>
- <otros límites vistos al entrenar>

## Cómo se reproduce

```bash
python models/<nombre>/train.py --table <tabla.parquet> --test-valley <valle>
```

Fecha de entrenamiento: <AAAA-MM-DD>. Quién lo corrió: <persona>. Dónde: <Colab o máquina>.
