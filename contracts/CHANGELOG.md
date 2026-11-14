# CHANGELOG — Contrato de Field Shift (`/contracts`)

Regla de gobernanza: El contrato se congela el **sábado 14 de noviembre de 2026 a las 10:00 AM**. Después de esa hora, **ningún cambio entra sin aprobación explícita de Hanniel** y su registro aquí.

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
