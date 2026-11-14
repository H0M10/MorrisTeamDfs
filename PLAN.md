# PLAN.md — Field Shift (equipo The CSC)

**Coordinación:** ARGON (orquestador/auditor) y Claude (CLI constructor) se coordinan vía `/contracts/`, `PLAN.md`, `HUMANO.md`, `AGENTS.md` y el tablero visual `docs/status.json` (`python scripts/sync_board.py` -> `docs/index.html` en GitHub Pages). Ninguna función pesada ni modelo se entrena localmente en laptops de 8 GB.
**Equipo nominal de 4 y recortes (Sáb 09:50):** Dupla Backend/Datos (`@H0M10` Hanniel + `@Checo-coder` Checo) y Dupla Frontend/Visuales/Entrega (`@Gicarrillo` + `@alexishal8` Alexis). Se recortan preventivamente Extras #4 (`L-04`) y #5 (`L-05`) per `AGENTS.md` §8. Todo cambio de estado/decisión debe reflejarse en `docs/status.json` + `python scripts/sync_board.py`.

---

## Compuertas oficiales (`AGENTS.md` §11)

| Compuerta | Cuándo | Condición de paso | Estado |
| --- | --- | --- | --- |
| G1 | Sábado 10:00 | Contrato congelado; API de ejemplo desplegada | En curso |
| G2 | Sábado 14:00 | Un dato real en pantalla: `/tool` consume la API real para una parcela | Pendiente |
| G3 | Sábado 19:00 | Tres rotaciones comparables del caso real | Pendiente |
| G4 | Domingo 8:00 | Corte de modelos: el que no tenga métrica sale y entra su respaldo | Pendiente |
| G5 | Domingo 12:00 | Se congelan las funciones | Pendiente |
| G6 | Domingo 20:00 | Entregado (límite oficial domingo 23:59) | Pendiente |

---

## Pista 1 — Datos (`/data-pipeline`) — Dueño: Checo (`@Checo-coder` · Dupla Backend/Datos, Global)
*Todo cómputo pesado corre en GEE / Colab / máquina rentada, nunca en laptops de 8 GB.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| D-01 | Confirmar en catálogo GEE los años exactos cubiertos por HLS, OpenET, USDA CDL, SMAP, SSURGO, SoilGrids y SRTM antes de generar tablas | `@Checo-coder` | G1 (Sáb 10:00) | **Completado:** Todas las colecciones OK (2015-2024 en común; ventana 2022-2024 seleccionada) |
| D-02 | Elegir 2-3 zonas de riego similares a Diamond Valley en NV, ID y UT (pivote, alfalfa, granos) y exportar muestra de verificación | `@Checo-coder` | G2 (Sáb 14:00) | **Completado** (18 parcelas reales verificadas en CDL: NV, ID, UT) |
| D-03 | Script GEE/Colab para extraer serie de 36 meses de Diamond Valley (HLS RGB/índices, POWER, OpenET, CDL, SMAP 9 km, SSURGO, SRTM) y generar artefacto compacto en JSON/Parquet | `@Checo-coder` | G2 (Sáb 14:00) | **Completado** (`multi_valley.parquet`, 648 filas, 2022–2024) |
| D-04 | Script de extracción para la parcela de Querétaro (sin CDL ni OpenET; SoilGrids 250 m + POWER + HLS + SMAP 9 km + SRTM) tras recibir polígono | `@Checo-coder` | G3 (Sáb 19:00) | **Completado** (`queretaro.parquet`, 36 filas, 0% nulos en HLS/SMAP/POWER/SoilGrids) |
| D-05 | Exportación completa multi-valle (NV, ID, UT) para entrenamiento de Modelos 1-4 en la nube | `@Checo-coder` | G3 (Sáb 19:00) | **Completado** (648 filas, 18 parcelas en 3 valles) |

---

## Pista 2 — Modelos (`/models`) — Dueño: Checo (`@Checo-coder` · Dupla Backend/Datos, Global)
*Ningún modelo llega al agricultor sin métrica medida por valle y archivo `CARD.md`. Orden estricto de entrenamiento: Modelo 1 → Modelo 4 → Modelo 3 → Modelo 2 (solo si sobra tiempo). Respaldos obligatorios si no cumplen.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| M-01 | Definir esqueleto de `CARD.md` (datos, partición por valle, último año fuera, métrica vs línea base, límites) para los 4 modelos | `@Checo-coder` / Claude | G1 (Sáb 10:00) | Completado (`models/*/CARD.md` como plantilla por llenar) |
| M-02 | **Prioridad 1 · Modelo 1:** entrenar y validar (XGBoost consumo de agua vs tabla FAO-56 en valle no visto; respaldo: tabla FAO-56 declarada tras llenar `kc_monthly.csv`) | `@Checo-coder` | G4 (Dom 08:00) | **Completado** (MAE 11.68 mm vs 45.11 mm FAO-56; `CARD.md` lleno) |
| M-03 | **Prioridad 4 (solo si sobra tiempo) · Modelo 2:** entrenar y validar (XGBoost observacional efecto cultivo anterior vs modelo sin cultivo anterior; nunca causal ni ahorro de agua; respaldo: `"Sin evidencia local"`) | `@Checo-coder` | G4 (Dom 08:00) | **Completado en fallback** (-10.39 % vs sin cultivo anterior; `CARD.md` lleno como `"Sin evidencia local"`) |
| M-04 | **Prioridad 3 · Modelo 3:** entrenar, validar y exportar a ONNX (GRU ligera con atención temporal, Macro F1 por clase en valle no visto) | `@Checo-coder` | G4 (Dom 08:00) | **Completado** (ONNX exportado y verificado en CPU; F1 macro 0.125; `CARD.md` lleno) |
| M-05 | **Prioridad 2 · Modelo 4:** calibrar y validar (Balance FAO-56 + residual + CQR 90% a escala SMAP 9 km; cobertura real reportada) | `@Checo-coder` | G4 (Dom 08:00) | **Completado** (Cobertura 80.56 % vs 25.0 % histórico; `CARD.md` lleno) |
| M-06 | Corte de modelos (Domingo 08:00): empaquetar solo artefactos con métrica validada y activar respaldos en los demás | `@Checo-coder` + `@H0M10` + ARGON | G4 (Dom 08:00) | Pendiente |

---

## Pista 3 — Motor y API (`/contracts`, `/backend`, `/supabase`, `/frontend/src/lib`) — Dueño: Hanniel (`@H0M10`, Global)

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| A-01 | Crear estructura del repo, `CLAUDE.md`, `contracts/schema.json`, 3 fixtures y `CHANGELOG.md` v0.1.0 | ARGON | Madrugada Sáb | Completado |
| A-02 | **Orden #1 Claude:** Esqueleto FastAPI en `/backend` sirviendo los 3 fixtures con validación Pydantic v2, `/health`, `/evaluate`, `/ask` (enrutador por reglas) + tipos TypeScript y cliente en `/frontend/src/lib` + `.env.example` | `@H0M10` / Claude | G1 (Sáb 10:00) | Completado (Backend + `/frontend/src/lib`) |
| A-03 | Conectar `H0M10/MorrisTeamDfs`, congelar `/contracts/schema.json` a las 10:00 AM; desplegar API fixture en Railway | `@H0M10` | G1 (Sáb 10:00) | En curso (`H-01` conectado; falta `H-02`) |
| A-04 | Migraciones SQL y políticas RLS por token en `/supabase/migrations/` (`evaluations` y `reviews` sin PII) + degradación elegante si Supabase falla | `@H0M10` / Claude | G2 (Sáb 14:00) | Migración escrita y API con 503 claro; falta aplicarla (`HUMANO.md` H-06) |
| A-05 | Motor físico determinista `/backend/app/engine/`: evaluador de restricciones **primero** (`has_viable_options: false` si aplica), FAO-56 mensual, heladas/calor POWER, índices HLS (sin NDRE en Landsat, sin CAI) y filtro exponencial raíz | `@H0M10` / Claude | G2 (Sáb 14:00) | Funciones puras completadas y probadas; falta conectarlas a datos reales (A-06) |
| A-06 | Integración de datos reales de Diamond Valley + 3 rotaciones comparables (actual, menos agua, más suelo) y soporte modo `unlabeled` (Querétaro) | `@H0M10` + `@Checo-coder` / Claude | G3 (Sáb 19:00) | Pendiente |
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

- **Orden #2 (`@H0M10` Hanniel + apoyo `@Checo-coder` / Claude · `/backend` y `/data-pipeline`):** Construir `backend/app/services/table_to_contract.py` (convierte salida Parquet de `build_table.py` en payload del contrato con `data_status="real"`, `awc_mm_m` y `organic_matter_pct` declarados), corregir `S-01` (`experimental: True` en Modelo 3 cuando `region_mode == "unlabeled"`) y normalizar pesos de atención a suma `1.0`.
- **Orden #3 (`@Gicarrillo` / Claude · `/frontend/src/app/tool`):** Sustituir los `<Pending>` de `/tool`: estado compartido de simulación (`/api/v1/simulate`), formulario accesible de `/tool/restricciones`, calendario 36m con tramas además de color en `/tool/rotaciones`, tarjeta completa de métricas + consulta `/ask` por voz (Web Speech API) y texto en `/tool/evidencia`, vista de escalas reales en `/tool` / `/tool/retrato`, y flujo de enlace compartible + revisión de técnico en `/tool/compartir` (degradando elegante si `supabase_configured === false`).
- **Orden #4 (`@alexishal8` / Claude · `/frontend/src/app/engineer` y `/docs`):** Completar `/engineer` leyendo métricas, intervalos CQR y atención de la API (ocultando red en vivo si `model_3_crop_history_gru.status !== "trained"`), generar animaciones IA / clips de apoyo (sin cifras `fixture`) y crear plantillas limpias de `/docs/project_page.md` (en inglés, cero cifras `fixture`) y `/docs/video_script.md` (30 s, guion compartido).
