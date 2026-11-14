# Ficha del modelo: 4. Humedad con intervalo

> **Estado: PENDIENTE.** Este modelo no se ha entrenado ni medido. Mientras
> esta ficha no tenga cifras reales, la API usa su respaldo: balance FAO-56 sin intervalo, con el rango histórico.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Estima la humedad del suelo de la zona con un intervalo que debe contener el valor real 9 de cada 10 veces.

## Datos

- **Etiqueta:** Humedad de SMAP (9 km).
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
| **Modelo** (balance FAO-56 + residual con árboles + CQR al 90 %) | <valor> | <valor> |
| **Línea base** (balance FAO-56 con el rango histórico) | <valor> | <valor> |

- **Métrica:** cobertura real del intervalo al 90 % en un valle no visto, y su ancho medio.
- **¿Gana a la línea base?** <sí o no; se reporta aunque pierda>

## Límites

- **Es contexto regional de 9 km.** Se valida a escala de zona y nunca se muestra como humedad de la parcela.
- La garantía del intervalo conformal supone datos intercambiables; entre valles distintos puede no cumplirse: por eso se reporta la cobertura medida.
- El índice del balance usa una capacidad de agua supuesta (150 mm).
- <otros límites vistos al entrenar>

## Cómo se reproduce

```bash
python models/model_4_moisture_cqr/train.py --table <tabla.parquet> --test-valley <valle>
```

Fecha de entrenamiento: <AAAA-MM-DD>. Quién lo corrió: <persona>. Dónde: <Colab o máquina>.
