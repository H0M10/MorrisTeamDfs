# PLAN.md — Field Shift (equipo The CSC)

**Coordinación:** ARGON (orquestador/auditor) y Claude (CLI constructor) se coordinan vía `/contracts/`, `PLAN.md`, `HUMANO.md`, `AGENTS.md` y el tablero visual `docs/status.json` (`python scripts/sync_board.py` -> `docs/index.html` en GitHub Pages). Ninguna función pesada ni modelo se entrena localmente en laptops de 8 GB.
**Equipo nominal de 4 y recortes (Sáb 09:50):** Dupla Backend/Datos (`@H0M10` Hanniel + `@Checo-coder` Checo) y Dupla Frontend/Visuales/Entrega (`@Gicarrillo` + `@alexishal8` Alexis). Se recortan preventivamente Extras #4 (`L-04`) y #5 (`L-05`) per `AGENTS.md` §8. Todo cambio de estado/decisión debe reflejarse en `docs/status.json` + `python scripts/sync_board.py`.

---

## Compuertas oficiales (`AGENTS.md` §11)

| Compuerta | Cuándo | Condición de paso | Estado |
| --- | --- | --- | --- |
| G1 | Sábado 10:00 | Contrato congelado; API de ejemplo desplegada | **Completado** (`https://morristeamdfs-production.up.railway.app`) |
| G2 | Sábado 14:00 | Un dato real en pantalla: `/tool` consume la API real para una parcela | En curso (tabla real `backend/data/diamond_valley.parquet` lista; activar `DATA_MODE=real` en Railway) |
| G3 | Sábado 19:00 | Tres rotaciones comparables del caso real | Pendiente |
| G4 | Domingo 8:00 | Corte de modelos: el que no tenga métrica sale y entra su respaldo | Pendiente |
| G5 | Domingo 12:00 | Se congelan las funciones | Pendiente |
| G6 | Domingo 20:00 | Entregado (límite oficial domingo 23:59) | Pendiente |

---

## Pista 1 — Datos (`/data-pipeline`) — Reparto 50/50: `@H0M10` (Diamond Valley + Motor) y `@Checo-coder` (Valles NV/ID/UT + Querétaro)
*Todo cómputo pesado corre en GEE / Colab / máquina rentada, nunca en laptops de 8 GB. Ver análisis completo de los 24 recursos en `docs/RECURSOS_NASA_Y_BANCO_CULTIVOS.md`.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| D-01 | Confirmar en catálogo GEE los años exactos cubiertos por HLS, OpenET, USDA CDL, SMAP, SSURGO, SoilGrids y SRTM (+ opcionales S2/IMERG/PRISM) | `@Checo-coder` | G1 (Sáb 10:00) | **Completado** (`ee_coverage.py` verificado sobre `luca-497507`: 2015–2024 en común) |
| D-02 | Dibujar 25–30 pivotes reales de 2-3 zonas vecinas en NV, ID y UT (alfalfa, granos, papa, frijol, maíz) | `@Checo-coder` | G2 (Sáb 14:00) | Pendiente (GeoJSON) |
| D-03 | Extraer serie de 36 meses de **Diamond Valley** (caso estrella para Compuerta G2) -> `.parquet` real | `@H0M10` | G2 (Sáb 14:00) | **Completado** (`backend/data/diamond_valley.parquet`, 36 meses 2022–2024 validado contra `contracts/schema.json`) |
| D-04 | Polígono real de **Querétaro** (San Juan del Río / Pedro Escobedo, `--unlabeled`) + cifra acuífero CONAGUA verificada -> `.parquet` | `@Checo-coder` | G3 (Sáb 19:00) | Pendiente (GeoJSON + PDF CONAGUA) |
| D-05 | Exportación multi-valle (NV, ID, UT) para entrenamiento en la nube | `@Checo-coder` + `@H0M10` | G3 (Sáb 19:00) | Depende de D-02 |

---

## Pista 2 — Modelos (`/models`) — Reparto 50/50: `@H0M10` (Modelos 1 y 4) y `@Checo-coder` (Modelo 3 + opcional 2)
*Ningún modelo llega al agricultor sin métrica medida por valle y archivo `CARD.md`. Banco FAO-56 (`kc_monthly.csv` y `fao56_crop_bank.csv`, 24 especies + alias) ya poblado (H-04).*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| M-01 | Definir esqueleto de `CARD.md` y poblar Banco FAO-56 (`kc_monthly.csv` + `fao56_crop_bank.csv`) | `@H0M10` / ARGON | G1 (Sáb 10:00) | **Completado** (32 códigos / 132 filas Kc; pendiente revisión agronómica H-03) |
| M-02 | **Prioridad 1 · Modelo 1:** entrenar y validar en Colab (XGBoost consumo de agua vs tabla FAO-56 en valle no visto) | `@H0M10` | G4 (Dom 08:00) | Bloqueado por D-05 (H-04 ya listo) |
| M-05 | **Prioridad 2 · Modelo 4:** calibrar y validar en Colab (Balance FAO-56 + residual + CQR 90% a escala SMAP 9 km) | `@H0M10` | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-04 | **Prioridad 3 · Modelo 3:** entrenar en Colab, validar Macro F1 y exportar a ONNX (GRU ligera con atención temporal) | `@Checo-coder` | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-03 | **Prioridad 4 (solo si sobra tiempo) · Modelo 2:** entrenar XGBoost observacional efecto cultivo anterior (respaldo: `"Sin evidencia local"`) | `@Checo-coder` | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-06 | Corte de modelos (Domingo 08:00): empaquetar solo artefactos con métrica validada y activar respaldos en los demás | `@H0M10` + `@Checo-coder` + ARGON | G4 (Dom 08:00) | Pendiente |

---

## Pista 3 — Motor y API (`/contracts`, `/backend`, `/supabase`, `/frontend/src/lib`) — Dueño: Hanniel (`@H0M10`, Global)

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| A-01 | Crear estructura del repo, `CLAUDE.md`, `contracts/schema.json`, 3 fixtures y `CHANGELOG.md` v0.1.0 | ARGON | Madrugada Sáb | Completado |
| A-02 | **Orden #1 Claude:** Esqueleto FastAPI en `/backend` sirviendo los 3 fixtures con validación Pydantic v2, `/health`, `/evaluate`, `/ask` (enrutador por reglas) + tipos TypeScript y cliente en `/frontend/src/lib` + `.env.example` | `@H0M10` / Claude | G1 (Sáb 10:00) | Completado (Backend + `/frontend/src/lib`) |
| A-03 | Conectar `H0M10/MorrisTeamDfs`, congelar `/contracts/schema.json` a las 10:00 AM; desplegar API fixture en Railway | `@H0M10` | G1 (Sáb 10:00) | **Completado** (`https://morristeamdfs-production.up.railway.app`) |
| A-04 | Migraciones SQL y políticas RLS por token en `/supabase/migrations/` (`evaluations` y `reviews` sin PII) + degradación elegante si Supabase falla | `@H0M10` / Claude | G2 (Sáb 14:00) | **Completado** (SQL aplicado, RLS activo sin políticas y `/health` con `supabase_configured: true`) |
| A-05 | Motor físico determinista `/backend/app/engine/`: evaluador de restricciones **primero** (`has_viable_options: false` si aplica), FAO-56 mensual, heladas/calor POWER, índices HLS (sin NDRE en Landsat, sin CAI) y filtro exponencial raíz | `@H0M10` / Claude | G2 (Sáb 14:00) | **Completado** — funciones probadas y conectadas a `backend/data/diamond_valley.parquet` vía `table_to_contract.py` |
| A-06 | Integración de datos reales de Diamond Valley + 3 rotaciones comparables (actual, menos agua, más suelo) y soporte modo `unlabeled` (Querétaro) | `@H0M10` + `@Checo-coder` / Claude | G3 (Sáb 19:00) | **Completado (Diamond Valley)** — `backend/data/diamond_valley.parquet` depositado y validado en `DATA_MODE=real` (activar en Railway); soporte `unlabeled` listo para Querétaro (D-04) |
| A-07 | Integración de artefactos ONNX/XGBoost aprobados en corte de modelos (o activación explícita de respaldos) | `@H0M10` + `@Checo-coder` / Claude | G4 (Dom 08:00) | Pendiente |

---

## Pista 4 — La Herramienta (`/frontend/src/app/tool`) — Dueño: `@Gicarrillo` (Dupla Frontend, Global)
*Aislada de `/showcase`, `/engineer` y `/remote`. Sin Three.js ni MediaPipe. Accesibilidad AA obligatoria.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| T-01 | Esqueleto Next.js + Tailwind con paleta oficial (`#FFFFFF`, `#000000`, `#1247B8`, `#E9B824`, `#5A4632`, `#2F7D32`) y Atkinson Hyperlegible Next (>=18 px) + banner visible "Datos de ejemplo" cuando `data_status === "fixture"` | `@Gicarrillo` / Claude | G1 (Sáb 10:00) | Completado (esqueleto); sigue `@Gicarrillo` con `tool/README.md` |
| T-02 | Flujo completo conectado a API fixture: parcela, mapa MapLibre con tamaño real de píxel por fuente, tira HLS de 36 meses (+ tabla accesible alternativa), restricciones y caso `has_viable_options: false` | `@Gicarrillo` | G2 (Sáb 14:00) | Pendiente |
| T-03 | Comparación de 3 rotaciones en calendario 36 meses con tramas además de color, micro-visuales accesibles, ficha de evidencia completa y guardado en `localStorage` | `@Gicarrillo` | G3 (Sáb 19:00) | Pendiente |
| T-04 | Flujo de revisión de técnico (`reviews` en Supabase), hoja compartible imprimible (PDF) + enlace por token, voz Web Speech API con alternativa en texto | `@Gicarrillo` | G5 (Dom 12:00) | Pendiente |
| T-05 | Auditoría automática con `axe` en CI + prueba manual de teclado, zoom 200% y lector de pantalla | `@Gicarrillo` + ARGON | G5 (Dom 12:00) | Pendiente |

---

## Pista 5 — Landing (`/frontend/src/app/showcase`, `/frontend/src/app/remote`) — Dueño: Alexis (`@alexishal8` · Dupla Frontend, Local)
*Solo lee la API. Extras se cortan de abajo hacia arriba; Extras #4 y #5 recortados preventivamente al pasar a 4 integrantes. Nadie del núcleo ayuda antes de Sábado 19:00.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| L-01 | Esqueleto `/showcase` y `/remote` leyendo fixtures de `/lib`, con banner "Datos de ejemplo", controles de teclado y respeto a `prefers-reduced-motion` | `@alexishal8` / Claude | G1 (Sáb 10:00) | Completado (esqueleto); `/remote` congelado, sigue `@alexishal8` con `showcase/README.md` |
| L-02 | Extra 1: Gestos con la mano (`@mediapipe/tasks-vision`, cámara activada solo con botón) + alternativa por teclado | `@alexishal8` | G3 (Sáb 19:00) | Pendiente |
| L-03 | Extra 2: Zoom del globo a la parcela con órbitas de satélites + animaciones visuales IA de escala (sin cifras inventadas) | `@alexishal8` | G5 (Dom 12:00) | Pendiente |
| L-04 | Extra 4: Terreno 3D con cultivo y partículas de lluvia (IMERG si disponible) | `@alexishal8` | G5 (Dom 12:00) | Recortado preventivamente (equipo de 4, AGENTS.md §8) |
| L-05 | Extra 5: Control remoto desde teléfono vía QR + Supabase Realtime Broadcast (`/remote`) | `@alexishal8` | G5 (Dom 12:00) | Recortado preventivamente (equipo de 4, AGENTS.md §8) |

---

## Pista 6 — Modo Ingeniero y Entrega (`/frontend/src/app/engineer`, `/docs`) — Dueño: Alexis (`@alexishal8` · Dupla Frontend, Ambas pistas)

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| E-01 | Esqueleto `/engineer` leyendo métricas de modelos y pesos de atención de la API | `@alexishal8` / Claude | G2 (Sáb 14:00) | Completado (en crudo); sigue `@alexishal8` con `engineer/README.md` |
| E-02 | Extra 3: Visualización de red en vivo con pesos reales del Modelo 3 (ocultar automáticamente si Modelo 3 no está entrenado) | `@alexishal8` | G5 (Dom 12:00) | Depende de M-04 / G4 |
| E-03 | Borrador de `/docs/project_page.md` (en inglés, sin cifras fixture) y `/docs/video_script.md` (30 s, guion compartido) | `@alexishal8` | G3 (Sáb 19:00) | Pendiente |
| E-04 | Generar animaciones IA de apoyo, grabar video de respaldo sábado 23:00 y video final domingo tras congelar funciones (con datos reales, cero `fixture`) | `@alexishal8` + `@Gicarrillo` | Dom 15:00 | Bloqueado por datos reales |
| E-05 | Revisión final de `AI_USAGE.md`, `README.md` raíz, enlace público del repo y ensayo del pitch | `@alexishal8` + Equipo | G6 (Dom 20:00) | Pendiente |

---

## Bitácora de construcción (Claude)

Estado de la orden de la madrugada del sábado. Cada bloque cierra con un commit.

| Bloque | Qué | Estado |
| --- | --- | --- |
| 0 | Base del repositorio: `.gitignore`, `.editorconfig`, `.env.example`, `README.md`, CI por carpeta (`.github/workflows/`), `contracts/sync.py` | Completado |
| 1 | Motor y API (`/backend`): FastAPI, modelos Pydantic generados, restricciones, FAO-56, índices, clima, POWER, cargador de modelos, rutas `/api/v1`, `DATA_MODE`, CORS. 126 pruebas | Completado |
| 2 | Base de datos (`/supabase`): migración con `evaluations`, `reviews`, RLS sin políticas y cuatro funciones por token. Analizada con `pglast`; falta ejecutarla en un proyecto real (`HUMANO.md` H-06) | Completado (sin ejecutar) |
| 3 | Frontend, solo esqueleto (`/frontend`): Next.js 16, tipos generados, cliente de API con respaldo local, textos es/en, base de accesibilidad, seis pantallas de `/tool` navegables, primera tira con tabla, `/showcase` con lienzo diferido y botón de cámara, `/engineer`, `/remote`. 31 pruebas con axe | Completado |
| 4 | Guiones de datos y modelos (`/data-pipeline`, `/models`): cobertura, exportación y tabla GeoParquet; cuaderno de Colab; un guion de entrenamiento por modelo con partición por valle y línea base; fichas `CARD.md`. Earth Engine y el modelo 3 sin ejecutar | Completado (sin ejecutar en la nube) |

### Notas para Argon y Hanniel

- **Copias del contrato.** Railway despliega solo `/backend` y Vercel solo `/frontend`, así que cada uno guarda una copia de `schema.json` y de los fixtures (`backend/app/contract_data/`, `frontend/src/lib/contract/`). La fuente de verdad sigue en `/contracts`. Tras cualquier cambio: `python contracts/sync.py`. La CI falla si las copias difieren.
- **Python 3.11.** La laptop solo tiene 3.13 y 3.14; el backend usa `uv`, que descarga 3.11 y fija versiones en `uv.lock`.
- **Dos banderas de los fixtures corregidas (v0.1.1, Argon):** se amplió `planting_window.end_month` a `10` en `diamond_valley.json`, se ajustó `calendar_ok: true` en `no_viable_options.json` (`current`), se sincronizaron copias (`contracts/sync.py`) y `KNOWN_FIXTURE_DIVERGENCES` quedó vacío.
- **`/evaluate` en modo fixture ignora las restricciones** que mande el cliente (sirve el fixture tal cual). Para recalcular con restricciones se usa `/simulate`.
- **Enlaces compartibles por RPC.** El backend no usa la llave `service_role`: llama a dos funciones de Postgres (`create_shared_evaluation`, `get_shared_evaluation`) con la llave anónima. Las define la migración del bloque 2.
- **Respaldo del modelo 1 incompleto.** El cargador ya reporta `fallback`, pero la tabla de coeficientes de cultivo (Kc) de FAO-56 no está cargada: la debe transcribir y verificar una persona (ver `HUMANO.md`).
- **Puerto local de la API: 8010.** En la laptop de Hanniel el 8000 lo ocupa un proceso del sistema.
- **Unidades en inglés en el contrato.** Los fixtures traen `mm/yr` y `days/yr`; la interfaz en español las muestra tal cual. Decidir antes de congelar si el contrato las localiza o si lo hace la interfaz (`HUMANO.md` H-09).
- **Estado compartido de `/tool`.** Hoy cada pantalla vuelve a pedir la evaluación de la parcela guardada. Cuando existan los controles de restricciones, `@Gicarrillo` debe decidir dónde vive el resultado de `/simulate` entre pantallas.
- **Convertidor tabla → contrato.** Falta el paso que toma la tabla de una parcela (`build_table.py`) y arma la evaluación real para la API. Es la tarea A-06 (Orden #2).
- **`awc_mm_m` no sale de la tabla de datos.** El contrato lo exige en `soil_profile`; hay que decidir si viene de SSURGO o de una función de pedotransferencia sobre SoilGrids, y declararlo.
- **Métricas sintéticas bloqueadas.** Los guiones de `/models` con `--sample` marcan su `metrics.json`; la API se niega a tratarlo como modelo entrenado (prueba en `backend/tests/test_models_loader.py`).

---

## Auditoría científica y de accesibilidad (Argon — Bloques 0 a 4)

### Hallazgos científicos (`AGENTS.md` §1, §4, §5)
- **S-01 (`backend/app/models/loader.py:244-245`):** cuando un modelo está en `fallback` en modo `unlabeled` (Querétaro), `_report()` fija `"experimental": False`. Para `model_3_crop_history_gru`, `AGENTS.md` §4 y `contracts/fixtures/queretaro.json` exigen `"experimental": True` en modo `unlabeled` incluso cuando corre en respaldo. Corregir en Orden #2.
- **S-02 (`data-pipeline/build_table.py:111-115` + `backend/app/services/evaluation.py`):** falta calcular y declarar `organic_matter_pct` (`soc_gkg * 0.1724`, factor Van Bemmelen declarado) y `awc_mm_m` (pedotransferencia declarada sobre `clay_pct`/`sand_pct`/`organic_matter_pct` o SSURGO en EE. UU.), además del convertidor `table_to_contract.py` para `DATA_MODE=real`. Asignado a Orden #2.
- **S-03 (`backend/app/engine/crop_traits.py:1-79`):** los rasgos (`sown`, `sold`, `machinery`) están declarados como supuesto (`assumed`), pero falta exponer su procedencia como `MetricValue` / nota de supuesto en las estrategias simuladas si cambian la viabilidad. Mantener aviso en `HUMANO.md` H-03.
- **S-04 (Correcto, sin cambios):** `indices.py` excluye NDRE y CAI correctamente; `climate.py` declara POWER 50 km regional; `constraints.py` evalúa restricciones antes de todo y devuelve `has_viable_options: false`; `loader.py` bloquea corridas `--sample`; `models/model_*.py` particionan por valle y último año fuera.

### Hallazgos de accesibilidad y producto (`frontend/src/app/tool`, `AGENTS.md` §8 y §9)
- **A11Y-01 (`frontend/src/app/tool/restricciones/page.tsx:33` y `rotaciones/page.tsx:41`):** siguen en estado `<Pending>` (solo lectura de restricciones sin sliders/checkboxes conectados a `/api/v1/simulate`, y `/rotaciones` sin la tira comparativa de 36 meses con tramas). Asignado a Orden #3.
- **A11Y-02 (`frontend/src/app/tool/page.tsx:48` y `retrato`):** falta la vista de mapa MapLibre mostrando el tamaño real del píxel por fuente (`30 m`, `250 m`, `9 km`, `50 km`) y la tabla/leyenda de escalas. Asignado a Orden #3.
- **A11Y-03 (`frontend/src/app/tool/evidencia/page.tsx`):** falta mostrar la ficha completa de todas las métricas (`annual_water_mm`, `water_delta_vs_current_mm`, `soil_cover_months_36m`, `prior_crop_vigor_delta_pct`, `frost_risk_days_year`, `heat_risk_days_year`) y falta la interfaz de preguntas por voz/texto (`Web Speech API` + `/api/v1/ask` determinista). Asignado a Orden #3.
- **A11Y-04 (`frontend/src/app/tool/compartir/page.tsx:69`):** falta el botón funcional para generar enlace compartible (`POST /api/v1/share`) y el formulario de revisión del técnico (`reviews`). Asignado a Orden #3.
- **A11Y-05 (Correcto, sin cambios):** `globals.css` respeta paleta oficial, base 18 px (`112.5%`), foco visible, objetivos `>=44 px`, `prefers-reduced-motion`, `@media print`, tramas/símbolos en estados, y tabla accesible en `ParcelStrip.tsx` (31 pruebas Playwright + axe en verde).

---

## Órdenes de trabajo autónomas para Claude (no requieren llaves ni cuentas externas)

- **Orden #2 (`@H0M10` Hanniel / Claude Fable 5.2 · `/backend` y `/data-pipeline`) — Completado:** Prompt en `docs/PROMPT_CLAUDE_ORDEN_2.md`. Claude resolvió `S-01` en `loader.py`, conectó el banco `models/fao56_crop_bank.csv` + `models/kc_monthly.csv` en `backend/app/engine/crop_bank.py` con `GET /api/v1/crops`, construyó `backend/app/services/table_to_contract.py` (`S-02` + `DATA_MODE=real`) y agregó Grupo B en `data-pipeline/config.py`. Argon cerró las 6 diferencias numéricas de `C-01`, fijó `luca-497507` por omisión en Earth Engine y agregó `--local-dir` en `ee_export.py`.
- **Orden #3 (`@Gicarrillo` / Claude · `/frontend/src/app/tool`):** Sustituir los `<Pending>` de `/tool`: estado compartido de simulación (`/api/v1/simulate`), formulario accesible de `/tool/restricciones`, calendario 36m con tramas además de color en `/tool/rotaciones`, tarjeta completa de métricas + consulta `/ask` por voz (Web Speech API) y texto en `/tool/evidencia`, vista de escalas reales en `/tool` / `/tool/retrato`, y flujo de enlace compartible + revisión de técnico en `/tool/compartir` (degradando elegante si `supabase_configured === false`).
- **Orden #4 (`@alexishal8` / Claude · `/frontend/src/app/engineer` y `/docs`):** Completar `/engineer` leyendo métricas, intervalos CQR y atención de la API (ocultando red en vivo si `model_3_crop_history_gru.status !== "trained"`), generar animaciones IA / clips de apoyo (sin cifras `fixture`) y crear plantillas limpias de `/docs/project_page.md` (en inglés, cero cifras `fixture`) y `/docs/video_script.md` (30 s, guion compartido).

---

## Orden #2 — resultado y auditoría de Claude (rama `pista/motor-api`)

**Hecho y probado (pytest):**
- **S-01 resuelto.** `loader.py` marca `experimental: true` para `model_3_crop_history_gru` en regiones sin etiquetas aunque esté en respaldo.
- **S-02 resuelto.** `table_to_contract.py` calcula `organic_matter_pct = soc_gkg × 0.1724` (Van Bemmelen, declarado) y `awc_mm_m` desde SSURGO si la tabla trae la columna, o por pedotransferencia de Saxton y Rawls (2006) con `type: "modeled"`.
- **Banco de cultivos conectado.** `python contracts/sync.py` copia `models/fao56_crop_bank.csv` y `models/kc_monthly.csv` a `backend/app/engine/data/`; `crop_bank.py` los lee; `crop_traits.py` se construye desde el banco (32 códigos); `GET /api/v1/crops` lo expone con `type: "assumed"`.
- **`DATA_MODE=real` conectado.** Lee los `.parquet` de `DATA_DIR` (por omisión `backend/data/`). Sin tabla: 503 `real_data_unavailable`. Tabla incompleta (menos de 36 meses consecutivos o sin columnas): 503 `real_data_incomplete`.
- **Grupo B.** `data-pipeline/config.py` lista `gpm_imerg` y `prism` como opcionales y agrega `EXTENDED_CDL_GROUPS` sin tocar las cuatro clases del modelo 3.

**Hallazgos de auditoría (para Hanniel; no toqué `/models` ni `/contracts`):**
- **C-01. El banco FAO-56 no está verificado por una persona y tiene diferencias con la tabla 12.** Lo cotejé contra la publicación en línea (fao.org/4/x0490e/x0490e0b.htm). Diferencias en `models/fao56_crop_bank.csv`: `garbanzo` Kc medio 1.05 (FAO: 1.00); `soya` Kc inicial 0.35 (leguminosas: 0.40); `girasol` Kc inicial 0.30 (oleaginosas: 0.35); `papa` Kc inicial 0.45 (raíces y tubérculos: 0.50); `trebol_cobertura` 0.45/1.10/1.05 (trébol henificado promedio: 0.40/0.90/0.85); `trigo_invierno` dice "suelo no helado" con Kc inicial 0.40, pero 0.40 es el valor para suelo helado (no helado: 0.70). **[Actualización Argon 13:26]:** ya se corrigieron los 6 valores y la nota de `trigo_invierno` en `models/fao56_crop_bank.csv` y `backend/app/engine/data/fao56_crop_bank.csv`; todo sigue servido como `type: "assumed"` mientras una persona firma `H-14` tras revisar visualmente la tabla original.
- **C-02. La curva mensual de Kc es por grupo y por mes del calendario del hemisferio norte**, no por fecha real de siembra. Para Querétaro (maíz de mayo a octubre) puede no coincidir. Declarado en `crop_bank.py` y en `/api/v1/crops`.
- **C-03. Las rotaciones alternativas en modo real son plantillas supuestas** (`TEMPLATES` en `table_to_contract.py`): una para sistemas de alfalfa y otra para grano de verano. Llevan `type: "assumed"` y cada ficha lo dice. Las debe revisar un agrónomo (H-03).
- **C-04. El agua en modo real sale siempre del respaldo FAO-56**, aunque el modelo 1 esté entrenado: falta conectar el modelo a rotaciones alternativas (no hay vigor observado de un cultivo que no se sembró). Es parte de A-07.
- **C-05. Sin restricciones declaradas no se descarta nada.** Si no existe `<parcel_id>.meta.json` con las restricciones del agricultor, `/evaluate` devuelve las tres rotaciones como viables, con el límite de agua en `null` y una nota en "información que falta". `/simulate` sí evalúa con lo que mande el cliente.
- **C-06. Un mes sin imagen HLS** sale con índices `null` y el color gris `#BDBDBD` (el esquema congelado exige un color). La interfaz debe pintarlo como "sin dato".
- **C-07. Tipos.** POWER, SMAP L4, SoilGrids y OpenET se marcan `modeled` (son reanálisis, asimilación o predicción); HLS y SRTM, `observed`.
- **C-08. `test_health` fallaba en `main`** desde que el contrato pasó a 0.1.1 (la prueba tenía la versión escrita a mano). Corregido.
- **C-09. El banco de cultivos y las plantillas de rotación se eligieron antes de mirar los datos.** El censo de CDL del condado de Eureka (2021–2024, `data-pipeline/crop_census.py`) muestra que en la zona solo se siembran alfalfa, otro heno, cebada, trigos, triticale y barbecho por encima de 100 acres. "Otro heno" (CDL 37), segundo cultivo del condado, no está en el banco. Plan completo, recurso por recurso: `data-pipeline/PLAN_DE_DATOS.md`. Pendiente: censo por valle y rotaciones observadas en GEE antes de cambiar banco o plantillas.
- **C-10. OpenET ya cubre los 48 estados contiguos desde el 15 de diciembre de 2025** (antes, 17 y luego 23 estados del oeste). `AGENTS.md` §4 todavía dice "oeste de EE. UU."; actualizarlo es decisión de Hanniel. La validación publicada (Nature Water, 2023) sigue siendo del oeste. Niveles de datos por región en `data-pipeline/PLAN_DE_DATOS.md` §3b.

