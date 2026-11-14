# /engineer — Modo Ingeniero

Dueño: Alexis (`@alexishal8` — Modo Ingeniero).
Entrega: panel técnico con la red en vivo (pesos reales del modelo 3), métricas
de validación por valle e intervalos conformales.

## Qué hay hoy

`page.tsx` lee la evaluación y pinta en crudo: una tabla con el estado,
algoritmo, métrica y línea base de cada modelo (`evaluation.models`) y una
tabla con el peso de atención de cada mes (`timeline[].attention_weight`).

## Qué construir, en orden

1. **Métricas contra línea base** de los cuatro modelos, con su ficha
   (`models/<nombre>/CARD.md`). Se reportan aunque pierdan.
2. **Intervalos** del modelo 4: `timeline[].soil_moisture.interval`, como
   contexto regional de 9 km, nunca de la parcela.
3. **Red en vivo** (extra 3) con los pesos reales del modelo 3. Si
   `models.model_3_crop_history_gru.status` no es `trained`, **no se muestra**.
4. Estado de la API: `GET /health` dice por qué cada modelo está en respaldo.

## Reglas

- Solo lee la API. No agrega campos al contrato.
- Los pesos de atención se presentan como "meses que más pesaron en la
  lectura", no como explicación causal.
- El modelo 2 es observacional: "lo que pasó en campos parecidos", nunca causa
  ni ahorro de agua.
- Mientras `data_status` sea `fixture`, la etiqueta "Datos de ejemplo" se ve y
  nada de esta página sale en el video.
- Las visualizaciones pesadas, con `next/dynamic`.
