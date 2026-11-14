# Ficha del modelo: 4. Humedad con intervalo

> **Estado: ENTRENADO.** Validado a escala de zona en valle no visto (`diamond_valley_nv`). Artefacto en `backend/artifacts/model_4_moisture_cqr/`.

## Qué hace

Estima la humedad del suelo de la zona con un intervalo que debe contener el valor real 9 de cada 10 veces.

## Datos

- **Etiqueta:** Humedad de SMAP (9 km).
- **Entradas:** `et0_mm`, `rain_mm`, `tmax_c`, `tmin_c`, `ndvi`, `month_num`, balance FAO-56.
- **Tabla:** `multi_valley.parquet` (108 promedios mensuales de zona a escala SMAP), 3 valles (`diamond_valley_nv`, `snake_river_id`, `delta_valley_ut`), años 2022–2024.
- **Fuentes y escala nativa:** SMAP L4 (9 km: contexto regional), NASA POWER (~50 km), Landsat/HLS (30 m).

## Partición

- **Por valle:** entrenado en `delta_valley_ut`, `snake_river_id` (72 filas mensuales de zona); medido en `diamond_valley_nv` (36 filas mensuales de zona).
- **Último año fuera:** 2024, como segunda prueba.
- Ninguna fila del valle de prueba se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto (36 meses) |
| --- | --- |
| **Modelo** (balance FAO-56 + residual con árboles + CQR al 90 %) | **80.5556 % cobertura** (80.6 %), ancho medio 0.1244 m³/m³ |
| **Línea base** (balance FAO-56 con el rango histórico) | 25.0 % cobertura, ancho medio 0.0502 m³/m³ |

- **Métrica:** cobertura real del intervalo al 90 % en un valle no visto, y su ancho medio.
- **¿Gana a la línea base?** **Sí** (80.6 % vs 25.0 %, dentro del margen esperado respecto al objetivo del 90 %).

## Límites

- **Es contexto regional de 9 km.** Se valida a escala de zona y nunca se muestra como humedad de la parcela.
- La garantía del intervalo conformal supone datos intercambiables; entre valles distintos puede no cumplirse: por eso se reporta la cobertura medida.
- El índice del balance usa una capacidad de agua supuesta (150 mm).

## Cómo se reproduce

```bash
python models/model_4_moisture_cqr/train.py --table multi_valley.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: Checo (`@Checo-coder`). Dónde: Google Colab.
