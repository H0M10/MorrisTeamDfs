# CHANGELOG — Contrato de Field Shift (`/contracts`)

Regla de gobernanza: El contrato se congela el **sábado 14 de noviembre de 2026 a las 10:00 AM**. Después de esa hora, **ningún cambio entra sin aprobación explícita de Hanniel** y su registro aquí.

## API (sin cambio al contrato de evaluación) - 2026-11-15 madrugada
### Agregado
- `GET /api/v1/predictions/{parcel_id}`: `crop_reading` (Modelo 3, grupo de cultivo por año con probabilidad y comparación con USDA CDL) y `dynamic_world` (probabilidad de cultivo por año de Google Dynamic World, externo). No cambia cifras de la evaluación.
- `strategies[].metrics.annual_water_mm` de las alternativas ahora puede venir del Modelo 1 (fuente "Modelo 1 …", ajustado con OpenET de la parcela). Mismo esquema.
- `POST /api/v1/analyze` con `{lat, lon}`: análisis en vivo de un círculo de 250 m (Earth Engine + NASA POWER + motor y modelos). Devuelve una evaluación normal con `parcel.id` = `live-…`, que después sirve en `/evaluate`, `/simulate`, `/ask` y `/share`. Errores: 422 `outside_coverage` (fuera de los 48 estados contiguos), 422 `not_cropland`, 503 `live_unavailable`. `schema.json` no cambia.

## API (sin cambio al contrato de evaluación) - 2026-11-14 noche
### Agregado
- `POST /api/v1/share/{token}/reviews` y `GET /api/v1/share/{token}/reviews` (revisión del técnico: `verdict` `approve` | `correct` | `discard`, `comments` hasta 2000 caracteres, `corrected_limits` con la forma de `constraints` de `/simulate`). Usan las funciones `submit_review` y `get_reviews` que ya estaban en la migración. `schema.json` no cambia. Aprobado por Hanniel.

## [0.1.1] - 2026-11-14 (Auditoría pre-congelamiento)
### Corregido
- Alineación de `calendar_ok` en `fixtures/diamond_valley.json` (`planting_window.end_month: 10` para cubrir la siembra otoñal de `trigo_invierno` en `2023-10`) y en `fixtures/no_viable_options.json` (`strategies[0].constraint_evaluation.calendar_ok: true` porque la alfalfa ya está establecida y no hay nueva siembra en los 36 meses; sigue descartada por agua y maquinaria).
- Actualización de `contract_version` a `"0.1.1"` en los tres fixtures (`diamond_valley.json`, `queretaro.json`, `no_viable_options.json`) para eliminar las divergencias conocidas en `backend/tests/test_constraints.py`.

## [0.1.0] - 2026-11-14 (Madrugada)
### Agregado
- `schema.json` (JSON Schema Draft 2020-12):
  - Campos obligatorios: `contract_version`, `data_status` (`fixture` | `real`), `parcel` (`region_mode`: `labeled` | `unlabeled`, `native_pixel_footprints_m`, `soil_profile`, `climate_summary`, `basin_context`), `timeline` (exactamente 36 meses con color medio HLS, índices `ndvi`/`ndmi`/`bsi`/`ndti` + `ndre` opcional exclusivo S30, lluvia, ET, índice relativo de agua en raíces, humedad con intervalo CQR, heladas, calor y `attention_weight`), `constraints` (`evaluated_before_models: true`, agua máxima anual, maquinaria, cultivos sin comprador, ventana de siembra), `has_viable_options`, `strategies` (exactamente 3: `current`, `less_water`, `more_soil` con secuencia de 36 meses, evaluación por restricción, `rejection_reason`, métricas y `evidence_card`), y `models` (`status`, `experimental`, métrica y línea base para los 4 modelos).
  - Regla `MetricValue`: toda cifra exige `value`, `unit`, `type` (`observed` | `modeled` | `assumed` | `fixture`), `source`, `date` y `native_scale` (más `interval` opcional).
- `fixtures/diamond_valley.json`: caso `labeled` (Diamond Valley, NV) de 36 meses con tres estrategias viables y pesos de atención de ejemplo.
- `fixtures/queretaro.json`: caso `unlabeled` (San Juan del Río / Pedro Escobedo, Qro.) de 36 meses con rotación actual de maíz, dos alternativas, Modelo 3 marcado `"experimental": true`, sin OpenET/CDL y sin cifras de CONAGUA sin verificar.
- `fixtures/no_viable_options.json`: caso donde las restricciones descartan las tres estrategias y el contrato responde `"has_viable_options": false` sin rellenar recomendaciones.

### Pendiente antes del congelamiento (Sábado 10:00 AM)
- Revisar a las **9:00 AM** el "stack" que entregue el organizador para confirmar si requiere ajustes menores de campos o formato antes de congelar a las 10:00 AM.
