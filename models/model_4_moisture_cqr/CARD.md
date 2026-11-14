# Ficha del modelo: 4. Humedad con intervalo

> **Estado: ENTRENADO Y MEDIDO CON AVISO DE COBERTURA (2026-11-14).** Artefacto en `backend/artifacts/model_4_moisture_cqr/` (`model.ubj` + `metrics.json`). Supera a la línea base histórica (`58.3 %` vs `22.9 %`), pero queda debajo del objetivo de `90 %` (`-31.7` puntos). Ver Límites.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Estima la humedad del suelo de la zona con un intervalo que debe contener el valor real 9 de cada 10 veces.

## Datos

- **Etiqueta:** Humedad en zona de raíces de SMAP L4 (`smap_sm_rootzone`, `9 km`).
- **Entradas:** `month_num`, `et0_mm`, `rain_mm`, `tmax_c`, `tmin_c`, `ndvi`, `root_zone_index`.
- **Tabla:** `data-pipeline/exports/multi_valley_us.parquet` promediado por valle y mes (`144` filas de zona: `3` valles × `48` meses `2021-01` a `2024-12`).
- **Fuentes y escala nativa:** SMAP L4 (`9 km`, `modeled`), NASA POWER (`cerca de 50 km`, `modeled`), Landsat/HLS (`30 m`, `observed`).

## Partición

- **Por valle:** ajustado y calibrado en `millard_ut` + `snake_river_id` (`96` meses de zona); medido en `diamond_valley_nv` (`48` meses de zona).
- **Último año fuera:** `2024` (`24` meses de zona) reservado para calibración conformal (`conformal_q = 0.03594`).
- Ninguna fila de `diamond_valley_nv` se usó para ajustar ni calibrar.

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`, 48 meses) | Ancho medio |
| --- | --- | --- |
| **Modelo** (balance FAO-56 + residual con árboles + CQR al 90 %) | **58.3333 %** (`58.3 %`) | **0.13434 m³/m³** |
| **Línea base** (balance FAO-56 con rango histórico p5–p95) | **22.9167 %** (`22.9 %`) | **0.07638 m³/m³** |

- **Métrica:** cobertura real del intervalo al 90 % en un valle no visto, y su ancho medio.
- **¿Gana a la línea base?** **Sí** frente al rango histórico simple (`58.3 %` vs `22.9 %`), aunque **no alcanza la meta de 90 %** (brecha de `-31.7` puntos porcentuales respecto al objetivo).

## Límites

- **Es contexto regional de 9 km.** Se valida a escala de zona y nunca se muestra como humedad de la parcela.
- **AVISO OBLIGATORIO DE COBERTURA:** la cobertura real en el valle no visto (`58.3 %`) se aleja más de 10 puntos del objetivo (`90 %`). La garantía conformal supone intercambiabilidad entre calibración y prueba; aquí existen cambios de distribución entre valles (altitud `1808 m` en Diamond Valley vs `~715 m` en Snake River / `~1400 m` en Millard) y solo `n_calibration = 24` puntos en `2024`.
- El índice del balance usa una capacidad de agua supuesta (`150.0 mm`).

## Cómo se reproduce

```bash
python -m uv --directory backend run --no-sync python ../models/model_4_moisture_cqr/train.py --table ../data-pipeline/exports/multi_valley_us.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: `@H0M10` / ARGON. Dónde: CPU local sobre tablas exportadas de Google Earth Engine (`luca-497507`).
