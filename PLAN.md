# PLAN.md — Field Shift (equipo The CSC)

**Coordinación:** ARGON (orquestador/auditor) y Claude (CLI constructor) se coordinan exclusivamente vía `/contracts/`, `PLAN.md`, `HUMANO.md` y `AGENTS.md`.
**Hito de las 9:00 AM (Sábado 14):** Al recibir el "stack" del organizador, ARGON y Hanniel revisan compatibilidad antes de congelar `/contracts/schema.json` a las **10:00 AM**. Ninguna función pesada ni modelo se entrena localmente en laptops de 8 GB.

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

## Pista 1 — Datos (`/data-pipeline`) — Dueño: Persona 1 (Global)
*Trabaja en pareja con Persona 2 el sábado por la mañana; cómputo pesado solo en GEE / Colab / máquina rentada.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| D-01 | Confirmar en catálogo GEE los años exactos cubiertos por HLS, OpenET, USDA CDL, SMAP, SSURGO, SoilGrids y SRTM antes de generar tablas | Persona 1 | G1 (Sáb 10:00) | Bloqueado por `HUMANO.md` (cuentas GEE/OpenET) |
| D-02 | Elegir 2-3 zonas de riego similares a Diamond Valley en NV, ID y UT (pivote, alfalfa, granos) y exportar muestra de verificación | Persona 1 | G2 (Sáb 14:00) | Bloqueado por `HUMANO.md` |
| D-03 | Script GEE/Colab para extraer serie de 36 meses de Diamond Valley (HLS RGB/índices, POWER, OpenET, CDL, SMAP 9 km, SSURGO, SRTM) y generar artefacto compacto en JSON/Parquet | Persona 1 | G2 (Sáb 14:00) | Pendiente |
| D-04 | Script de extracción para la parcela de Querétaro (sin CDL ni OpenET; SoilGrids 250 m + POWER + HLS + SMAP 9 km + SRTM) tras recibir polígono | Persona 1 | G3 (Sáb 19:00) | Bloqueado por `HUMANO.md` (polígono Qro.) |
| D-05 | Exportación completa multi-valle (NV, ID, UT) para entrenamiento de Modelos 1-4 en la nube | Persona 1 | G3 (Sáb 19:00) | Pendiente |

---

## Pista 2 — Modelos (`/models`) — Dueño: Persona 2 (Global)
*Ningún modelo llega al agricultor sin métrica medida por valle y archivo `CARD.md`. Respaldos obligatorios si no cumplen.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| M-01 | Definir esqueleto de `CARD.md` (datos, partición por valle, último año fuera, métrica vs línea base, límites) para los 4 modelos | Persona 2 | G1 (Sáb 10:00) | Pendiente |
| M-02 | Entrenar y validar **Modelo 1** (XGBoost consumo de agua vs tabla FAO-56 en valle no visto; respaldo: tabla FAO-56 declarada) | Persona 2 | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-03 | Entrenar y validar **Modelo 2** (XGBoost observacional efecto cultivo anterior vs modelo sin cultivo anterior; nunca causal ni ahorro de agua) | Persona 2 | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-04 | Entrenar, validar y exportar a ONNX **Modelo 3** (GRU ligera con atención temporal, Macro F1 por clase en valle no visto) | Persona 2 | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-05 | Calibrar y validar **Modelo 4** (Balance FAO-56 + residual + CQR 90% a escala SMAP 9 km; cobertura real reportada) | Persona 2 | G4 (Dom 08:00) | Bloqueado por D-05 |
| M-06 | Corte de modelos (Domingo 08:00): empaquetar solo artefactos con métrica validada y activar respaldos en los demás | Persona 2 + ARGON | G4 (Dom 08:00) | Pendiente |

---

## Pista 3 — Motor y API (`/contracts`, `/backend`, `/supabase`, `/frontend/src/lib`) — Dueño: Hanniel (Global)

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| A-01 | Crear estructura del repo, `CLAUDE.md`, `contracts/schema.json`, 3 fixtures y `CHANGELOG.md` v0.1.0 | ARGON | Madrugada Sáb | Completado |
| A-02 | **Orden #1 Claude:** Esqueleto FastAPI en `/backend` sirviendo los 3 fixtures con validación Pydantic v2, `/health`, `/evaluate`, `/ask` (enrutador por reglas) + tipos TypeScript y cliente en `/frontend/src/lib` + `.env.example` | Hanniel / Claude | G1 (Sáb 10:00) | Backend completado; `/frontend/src/lib` va en el bloque 3 |
| A-03 | Revisar stack del organizador (09:00 AM) y congelar `/contracts/schema.json` a las 10:00 AM; desplegar API fixture en Railway | Hanniel | G1 (Sáb 10:00) | Pendiente (09:00 AM) |
| A-04 | Migraciones SQL y políticas RLS por token en `/supabase/migrations/` (`evaluations` y `reviews` sin PII) + degradación elegante si Supabase falla | Hanniel / Claude | G2 (Sáb 14:00) | Bloqueado por `HUMANO.md` (proyecto Supabase) |
| A-05 | Motor físico determinista `/backend/app/engine/`: evaluador de restricciones **primero** (`has_viable_options: false` si aplica), FAO-56 mensual, heladas/calor POWER, índices HLS (sin NDRE en Landsat, sin CAI) y filtro exponencial raíz | Hanniel / Claude | G2 (Sáb 14:00) | Funciones puras completadas y probadas; falta conectarlas a datos reales (A-06) |
| A-06 | Integración de datos reales de Diamond Valley + 3 rotaciones comparables (actual, menos agua, más suelo) y soporte modo `unlabeled` (Querétaro) | Hanniel / Claude | G3 (Sáb 19:00) | Pendiente |
| A-07 | Integración de artefactos ONNX/XGBoost aprobados en corte de modelos (o activación explícita de respaldos) | Hanniel / Claude | G4 (Dom 08:00) | Pendiente |

---

## Pista 4 — La Herramienta (`/frontend/src/app/tool`) — Dueño: Persona 4 (Global)
*Aislada de `/showcase`, `/engineer` y `/remote`. Sin Three.js ni MediaPipe. Accesibilidad AA obligatoria.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| T-01 | Esqueleto Next.js + Tailwind con paleta oficial (`#FFFFFF`, `#000000`, `#1247B8`, `#E9B824`, `#5A4632`, `#2F7D32`) y Atkinson Hyperlegible Next (>=18 px) + banner visible "Datos de ejemplo" cuando `data_status === "fixture"` | Persona 4 / Claude | G1 (Sáb 10:00) | Pendiente tras A-02 |
| T-02 | Flujo completo conectado a API fixture: parcela, mapa MapLibre con tamaño real de píxel por fuente, tira HLS de 36 meses (+ tabla accesible alternativa), restricciones y caso `has_viable_options: false` | Persona 4 | G2 (Sáb 14:00) | Pendiente |
| T-03 | Comparación de 3 rotaciones en calendario 36 meses con tramas además de color, ficha de evidencia completa (fuente/fecha/escala/tipo) y guardado en `localStorage` | Persona 4 | G3 (Sáb 19:00) | Pendiente |
| T-04 | Flujo de revisión de técnico (`reviews` en Supabase), hoja compartible imprimible (PDF) + enlace por token, voz Web Speech API con alternativa en texto | Persona 4 | G5 (Dom 12:00) | Pendiente |
| T-05 | Auditoría automática con `axe` en CI + prueba manual de teclado, zoom 200% y lector de pantalla | Persona 4 + ARGON | G5 (Dom 12:00) | Pendiente |

---

## Pista 5 — Landing y Control Remoto (`/frontend/src/app/showcase`, `/frontend/src/app/remote`) — Dueño: Persona 5 (Local)
*Solo lee la API. Extras se cortan de abajo hacia arriba si falta tiempo. Nadie del núcleo ayuda antes de Sábado 19:00.*

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| L-01 | Esqueleto `/showcase` y `/remote` leyendo fixtures de `/lib`, con banner "Datos de ejemplo", controles de teclado y respeto a `prefers-reduced-motion` | Persona 5 | G1 (Sáb 10:00) | Pendiente tras A-02 |
| L-02 | Extra 1: Gestos con la mano (`@mediapipe/tasks-vision`, cámara activada solo con botón) + alternativa por teclado | Persona 5 | G3 (Sáb 19:00) | Pendiente |
| L-03 | Extra 2: Zoom del globo a la parcela con órbitas de satélites | Persona 5 | G5 (Dom 12:00) | Pendiente |
| L-04 | Extra 4: Terreno 3D con cultivo y partículas de lluvia (IMERG si disponible) | Persona 5 | G5 (Dom 12:00) | Pendiente |
| L-05 | Extra 5: Control remoto desde teléfono vía QR + Supabase Realtime Broadcast (`/remote`) | Persona 5 | G5 (Dom 12:00) | Bloqueado por proyecto Supabase |

---

## Pista 6 — Modo Ingeniero y Entrega (`/frontend/src/app/engineer`, `/docs`) — Dueño: Persona 6 (Ambas pistas)

| ID | Tarea | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| E-01 | Esqueleto `/engineer` leyendo métricas de modelos y pesos de atención de la API | Persona 6 | G2 (Sáb 14:00) | Pendiente tras A-02 |
| E-02 | Extra 3: Visualización de red en vivo con pesos reales del Modelo 3 (ocultar automáticamente si Modelo 3 no está entrenado) | Persona 6 | G5 (Dom 12:00) | Depende de M-04 / G4 |
| E-03 | Borrador de `/docs/project_page.md` (en inglés, sin cifras fixture) y `/docs/video_script.md` (30 s, guion compartido) | Persona 6 | G3 (Sáb 19:00) | Pendiente |
| E-04 | Grabar video de respaldo sábado 23:00 y video final domingo tras congelar funciones (con datos reales, cero `fixture`) | Persona 6 + Equipo | Dom 15:00 | Bloqueado por datos reales |
| E-05 | Revisión final de `AI_USAGE.md`, `README.md` raíz, enlace público del repo y ensayo del pitch | Persona 6 + Equipo | G6 (Dom 20:00) | Pendiente |

---

## Bitácora de construcción (Claude)

Estado de la orden de la madrugada del sábado. Cada bloque cierra con un commit.

| Bloque | Qué | Estado |
| --- | --- | --- |
| 0 | Base del repositorio: `.gitignore`, `.editorconfig`, `.env.example`, `README.md`, CI por carpeta (`.github/workflows/`), `contracts/sync.py` | Completado |
| 1 | Motor y API (`/backend`): FastAPI, modelos Pydantic generados, restricciones, FAO-56, índices, clima, POWER, cargador de modelos, rutas `/api/v1`, `DATA_MODE`, CORS. 126 pruebas | Completado |
| 2 | Base de datos (`/supabase`) | Pendiente |
| 3 | Frontend, solo esqueleto (`/frontend`) | Pendiente |
| 4 | Guiones de datos y modelos (`/data-pipeline`, `/models`) | Pendiente |

### Notas para Argon y Hanniel

- **Copias del contrato.** Railway despliega solo `/backend` y Vercel solo `/frontend`, así que cada uno guarda una copia de `schema.json` y de los fixtures (`backend/app/contract_data/`, `frontend/src/lib/contract/`). La fuente de verdad sigue en `/contracts`. Tras cualquier cambio: `python contracts/sync.py`. La CI falla si las copias difieren.
- **Python 3.11.** La laptop solo tiene 3.13 y 3.14; el backend usa `uv`, que descarga 3.11 y fija versiones en `uv.lock`.
- **Dos banderas de los fixtures no cuadran con su propia ventana de siembra.** El motor aplica la regla "toda siembra dentro del horizonte cae en la ventana" y difiere del fixture en dos casos. Están fijados en `backend/tests/test_constraints.py` (`KNOWN_FIXTURE_DIVERGENCES`); si se corrigen los fixtures esa prueba avisa. Pedido para Argon o Hanniel antes de congelar a las 10:00:
  1. `diamond_valley.json`, rotación `more_soil`: siembra trigo de invierno en octubre de 2023 con ventana de marzo a septiembre, y aun así dice `calendar_ok: true`. Con las mismas restricciones `/evaluate` la da por viable y `/simulate` la descarta. Arreglo sugerido: ventana de marzo a octubre.
  2. `no_viable_options.json`, rotación `current`: dice `calendar_ok: false` por "ventana de corte", pero la alfalfa ya está establecida y no hay ninguna siembra en los 36 meses. El motor da `calendar_ok: true` (la rotación sigue descartada por agua y maquinaria). Arreglo sugerido: poner `calendar_ok: true` y quitar la frase del corte.
- **`/evaluate` en modo fixture ignora las restricciones** que mande el cliente (sirve el fixture tal cual). Para recalcular con restricciones se usa `/simulate`.
- **Enlaces compartibles por RPC.** El backend no usa la llave `service_role`: llama a dos funciones de Postgres (`create_shared_evaluation`, `get_shared_evaluation`) con la llave anónima. Las define la migración del bloque 2.
- **Respaldo del modelo 1 incompleto.** El cargador ya reporta `fallback`, pero la tabla de coeficientes de cultivo (Kc) de FAO-56 no está cargada: la debe transcribir y verificar una persona (ver `HUMANO.md`).
