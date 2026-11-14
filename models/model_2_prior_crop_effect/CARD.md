# Ficha del modelo: 2. Efecto del cultivo anterior

> **Estado: ENTRENADO Y MEDIDO — SIN EVIDENCIA DE MEJORA (2026-11-14).** Artefacto en `backend/artifacts/model_2_prior_crop_effect/` (`model.ubj` + `metrics.json`). En la prueba sobre un valle no visto **pierde frente a la línea base (`-6.3 %`)**: se reporta íntegro conforme a `AGENTS.md` §5 y no debe presentarse como evidencia de ganancia causal.

Media página. Llénala con la salida de `train.py` y el `metrics.json` que
escribe. No copies cifras de una corrida con `--sample`: son sintéticas.

## Qué hace

Describe cómo fue el vigor máximo de un cultivo según qué se sembró antes, en campos parecidos.

## Datos

- **Etiqueta:** Secuencias de cultivo de USDA CDL (`crop_group`, `prev_crop_group`) y vigor máximo anual (`ndvi` máximo mensual) de Landsat/HLS.
- **Entradas:** `crop_code`, `et0_season_mm`, `rain_year_mm`, `elevation_m`, `clay_pct`, `prev_crop_code`.
- **Tabla:** `data-pipeline/exports/multi_valley_us.parquet` agregado por parcela y año (`39` parcela-años dentro de `CROP_GROUPS`: `30` en entrenamiento, `9` en prueba), `2021–2024` (usando CDL `2020` para `prev_crop_group` de `2021`).
- **Fuentes y escala nativa:** USDA CDL (`30 m`), Landsat/HLS (`30 m`), NASA POWER (`cerca de 50 km`), SRTM (`30 m`), SoilGrids (`250 m`).

## Partición

- **Por valle:** entrenado en `millard_ut` + `snake_river_id` (`30` parcela-años); medido en `diamond_valley_nv` (`9` parcela-años).
- **Último año fuera:** `2024` dentro de los valles de entrenamiento (`MAE` con cultivo anterior `0.0570` vs sin él `0.0566`).
- Ninguna fila de `diamond_valley_nv` se usó para entrenar ni para ajustar.

## Métrica contra la línea base

| | Valle no visto (`diamond_valley_nv`, `n = 9`) | Último año (`2024`, entrenamiento) |
| --- | --- | --- |
| **Modelo** (XGBoost con `prev_crop_code`) | `0.1541` MAE NDVI (`-6.3 %` de mejora) | `0.0570` MAE NDVI |
| **Línea base** (XGBoost sin cultivo anterior) | `0.1450` MAE NDVI | `0.0566` MAE NDVI |

- **Métrica:** reducción del error (MAE de vigor máximo anual) al agregar el cultivo anterior, en un valle no visto: **`-6.3 %`** (empeora ligeramente frente al modelo sin cultivo anterior).
- **¿Gana a la línea base?** **No** (`-6.3 %` en `diamond_valley_nv`; también pierde levemente en el último año). Conforme a `AGENTS.md` §5, se reporta el resultado negativo tal cual y se concluye **"sin evidencia local"** de mejora predictiva en esta muestra.

## Límites

- **Es observacional.** Se presenta como "lo que pasó en campos parecidos", nunca como causa.
- **No produce cifras de ahorro de agua.**
- No existe fuera de EE. UU. (no hay CDL): ahí el estado es `absent`.
- Muestra pequeña (`39` parcela-años en `15` parcelas): varias combinaciones (`corn` tras `alfalfa`, `small_grain` tras `fallow`) tienen `count = 1` en entrenamiento (`metrics.json` → `observed_peak_ndvi_by_sequence`), insuficiente para generalizar entre valles.

## Cómo se reproduce

```bash
python -m uv --directory backend run --no-sync python ../models/model_2_prior_crop_effect/train.py --table ../data-pipeline/exports/multi_valley_us.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-14. Quién lo corrió: `@H0M10` / ARGON. Dónde: CPU local sobre tablas exportadas de Google Earth Engine (`luca-497507`).
