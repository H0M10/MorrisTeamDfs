# HUMANO.md — Acciones que requieren a una persona

Regla 11 de `AGENTS.md`: Todo lo que requiera intervención humana (cuentas, llaves, pagos, decisiones, polígonos, pruebas con cámara o lector de pantalla) se registra aquí con responsable, fecha límite y qué bloquea. Los agentes no simulan estos pasos ni inventan datos.

> **Seguimiento evolutivo en vivo:** Los cambios de estado y decisiones aquí anotados se reflejan también en `docs/status.json` (`python scripts/sync_board.py`) para verse en GitHub Pages (`https://h0m10.github.io/MorrisTeamDfs/`).

| Prioridad | Acción humana | Responsable | Para cuándo | Qué bloquea | Estado |
| --- | --- | --- | --- | --- | --- |
| **P0 (Crítico)** | Crear/verificar cuentas del equipo: proyecto **Google Earth Engine (`luca-497507`)** habilitado de uso no comercial, **Colab** y acceso a **OpenET** | `@Checo-coder` + `@H0M10` | Sáb mañana | Tareas D-01 a D-05 | **Completado (`luca-497507` habilitado por `@H0M10`)** |
| **P0 (Crítico)** | Crear proyectos en **Railway** (`https://morristeamdfs-production.up.railway.app`), **Vercel** (`https://morris-team-dfs.vercel.app/`) y **Supabase** (`evaluations`/`reviews` con RLS sin políticas, `supabase_configured: true`) | Hanniel (`@H0M10`) | Sáb 10:00 | Despliegue API, frontend en vivo y enlaces compartibles | **Completado** |
| **P1 (Alto)** | Elegir y dibujar las **2 o 3 zonas de riego** similares a Diamond Valley en Nevada, Idaho y Utah (pivote, alfalfa, granos, papa, maíz) para entrenamiento por valle | `@Checo-coder` | Sáb 13:00 | D-02, D-05 y partición correcta por valle en Modelos 1-4 | Pendiente |
| **P1 (Alto)** | Ejecutar extracción de **Diamond Valley** (`luca-497507`, 36 meses HLS, POWER, OpenET, CDL, SMAP, SSURGO, SRTM) → primer `.parquet` real (`D-03`) | `@H0M10` | Sáb 12:30–14:00 | Compuerta Sábado 14:00 ("un dato real en pantalla") | En curso (`luca-497507` + `--local-dir` listos) |
| **P1 (Alto)** | Decidir si se **renta una máquina en la nube con mucha RAM/GPU** (solo si Colab gratuito de ~12 GB RAM no alcanza para las tablas) | `@H0M10` + `@Checo-coder` | Sáb mediodía | Entrenamiento de Modelos 1-4 fuera de laptops de 8 GB | Pendiente |
| **P1 (Alto)** | Definir el **nombre del proyecto** (confirmar si queda "Field Shift") y el **público principal** en inglés y español | Equipo (4) | Sáb 10:00 | Textos de cabecera, `/docs/project_page.md`, pitch y guion | Pendiente |
| **P1 (Alto)** | Definir el **polígono exacto de la parcela de Querétaro** (San Juan del Río / Pedro Escobedo, `--unlabeled`) y verificar cifra de acuíferos **CONAGUA** contra publicación oficial | `@Checo-coder` | Sáb 15:00 | Caso real `unlabeled` de Querétaro (D-04) | Pendiente |
| **P2 (Medio)** | Conseguir a un **agrónomo o agricultor** que revise la hoja de evidencia y el lenguaje llano de `/tool` | `@Gicarrillo` + Equipo | Sáb tarde - Dom mañana | Validación de utilidad real, riesgos locales y pitch | Pendiente |
| **P2 (Medio)** | Dirección visual de `/showcase`, animaciones con IA (cero cifras inventadas) y **prueba de gestos con cámara** bajo iluminación real (con respaldo por teclado) | Alexis (`@alexishal8`) | Sáb 18:00 y Dom 11:00 | Pista local (`/showcase`) y tomas del video | Pendiente |
| **P2 (Medio)** | Grabar **video de respaldo** (Sábado 23:00) y **video final de 30 s** + redactar la **página del proyecto en inglés** (`/docs/project_page.md`, cero cifras `fixture`) | Alexis (`@alexishal8`) + `@Gicarrillo` | Sáb 23:00 / Dom 15:00 | Entrega global oficial (Dom 20:00 / 23:59) | Pendiente |
| **P2 (Medio)** | Ejecutar **prueba manual con lector de pantalla** (NVDA/VoiceOver) y teclado sobre `/tool` | `@Gicarrillo` | Dom 11:00 | Requisito obligatorio de accesibilidad (§9 de `AGENTS.md`) | Pendiente |
| **P2 (Medio)** | Preparar logística de demo local: laptop a corriente con GPU dedicada, pestañas precargadas y **red propia desde teléfono** por si falla el Wi-Fi de la sede | Equipo (4) | Dom 17:00 | Plan anti-fallos de demo en vivo (`PISTAS_PARALELAS.md`) | Pendiente |

---

## Pasos exactos anotados por Claude (constructor)

Cada paso dice qué hacer y qué desbloquea. Los agentes no los simulan.

### H-01. Subir a `H0M10/MorrisTeamDfs`, invitar al equipo y activar GitHub Pages (`@H0M10`) — **Completado**

Ya ejecutado y verificado:
1. Rama `main` conectada y sincronizada en `https://github.com/H0M10/MorrisTeamDfs.git`.
2. Invitaciones de colaboradores enviadas en GitHub (`checo-coder`, `Gicarrillo`, `AlexisHal8`). Solo falta que cada integrante acepte la invitación en su cuenta.
3. GitHub Pages activo desde `main` (`/docs`) y respondiendo en `https://h0m10.github.io/MorrisTeamDfs/`.

### H-02. Desplegar la API de ejemplo en Railway (`@H0M10`, compuerta del sábado 10:00) — **Completado**

Ya ejecutado y verificado:
- URL pública en vivo: `https://morristeamdfs-production.up.railway.app`
- `/health` respondió `"status": "ok"`, `"data_mode": "fixture"`, `"contract_version": "0.1.1"`, `"supabase_configured": false` y los cuatro modelos en `"fallback"`.
- `/docs` abierto en `https://morristeamdfs-production.up.railway.app/docs#/`.
- Cuando termines `H-06` y `H-07`, solo agrega `SUPABASE_URL`, `SUPABASE_ANON_KEY` y tu dominio final de Vercel en `CORS_ORIGINS`.

### H-03. Revisar la tabla de rasgos de cultivo (agrónomo o quien conozca el campo)

Archivo: `backend/app/engine/crop_traits.py`. La escribió un agente como supuesto. Decide si cada rotación pasa o no por maquinaria y comprador. Revisar: qué equipo pide cada cultivo, qué cultivos se venden, y si la cosecha de grano se supone contratada. Mientras no se revise, toda cifra que dependa de ella es `assumed`.

### H-04. Transcribir y verificar la tabla Kc de FAO-56 (`@Checo-coder` o `@H0M10`) — **Completado (Banco ampliado v1)**

Ya poblados con referencias de **FAO Irrigation and Drainage Paper 56 (Allen et al., 1998, Tabla 12 pp. 110–114, Tabla 22 y Cap. 11)**:
- [models/kc_monthly.csv](models/kc_monthly.csv): 11 grupos de cultivo × 12 meses (132 filas únicas).
- [models/fao56_crop_bank.csv](models/fao56_crop_bank.csv): banco ampliado de **24 cultivos/coberturas** (alfalfa, cebada, avena, trigos, maíz, sorgo, frijol, garbanzo, lenteja, soya, girasol, canola, algodón, papa, cebolla, tomate, chile, ajo, brócoli, trébol/avena-veza/triticale de cobertura, barbecho) + 8 alias de fixtures, con códigos USDA CDL, $K_c$, $Z_r$ y $p$.

Queda sujeto únicamente a validación agronómica local de `sown/sold/machinery` y fechas de siembra regional (`H-03`).

### H-05. Decidir las dos inconsistencias de los fixtures — **Completado por Argon (v0.1.1)**

Resuelto en `contracts/CHANGELOG.md` v0.1.1: `diamond_valley.json` amplía `planting_window` a octubre (`3..10`) para cubrir la siembra otoñal de trigo de invierno, `no_viable_options.json` corrige `current.constraint_evaluation.calendar_ok` a `true` (alfalfa ya establecida; sigue descartada por agua y maquinaria), y `KNOWN_FIXTURE_DIVERGENCES` en `backend/tests/test_constraints.py` quedó vacío.

### H-06. Crear el proyecto de Supabase y aplicar la migración (`@H0M10`, sábado) — **Completado**

Ya ejecutado y verificado:
- Migración [supabase/migrations/20261114000000_init.sql](supabase/migrations/20261114000000_init.sql) aplicada; tablas `evaluations` y `reviews` con **RLS enabled** y sin políticas.
- Variables cargadas en Railway y Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY` con `sb_publishable_...`, nunca `service_role`).
- `GET https://morristeamdfs-production.up.railway.app/health` respondió `"supabase_configured": true` y `https://morris-team-dfs.vercel.app/tool/retrato` cargó la tira de parcela con **"Datos de ejemplo"** sin error de conexión.

*(Recordatorio de seguridad para el cierre del reto: rotar la contraseña de la base de datos y la llave `service_role` que quedaron pegadas en el chat de trabajo en Supabase → Project Settings → API Keys.)*

### H-07. Desplegar el frontend en Vercel (`@H0M10` o `@Gicarrillo`, sábado) — **Completado**

Ya ejecutado:
- URL pública en vivo: `https://morris-team-dfs.vercel.app/`
- Framework Preset `Next.js`, `Root Directory = frontend`, variables `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas.
- **Comprobación rápida:** añade `https://morris-team-dfs.vercel.app` en `CORS_ORIGINS` de Railway (separado por coma) y abre `https://morris-team-dfs.vercel.app/tool/retrato` para confirmar que muestra la tira y el aviso "Datos de ejemplo" sin error de conexión al servidor.

### H-08. Decisiones visuales, animaciones IA y pruebas con cámara de `/showcase` (`@alexishal8`)

El agente dejó un lienzo de prueba y un botón que solo pide permiso de cámara. Falta que `@alexishal8` decida, mirando la pantalla (recordando que Extras #4 cultivo/lluvia IMERG y #5 `/remote` QR quedaron recortados):

- **Dirección visual de la landing:** paleta oscura exacta, tipografía de títulos, cuánto texto lleva y la frase de apertura (la misma del pitch y el video).
- **Globo (Extra #2):** textura (por ejemplo Blue Marble de la NASA), nivel de detalle, órbitas y transición a Diamond Valley / Querétaro.
- **Animaciones con IA y Video 30 s:** generar clips cortos de transición satelital / explicación visual sin superponer cifras inventadas ni usar datos `fixture`. Respetar `prefers-reduced-motion`.
- **Gestos (Extra #1):** umbral del pellizco, sensibilidad del giro, mano izquierda o derecha, y qué se ve en pantalla cuando la cámara está encendida.
- **Descargar el modelo de manos:** `hand_landmarker.task` y los archivos WASM de `@mediapipe/tasks-vision` (están en `frontend/node_modules/@mediapipe/tasks-vision/wasm/`) deben copiarse a `frontend/public/mediapipe/`. El modelo se baja de la página de MediaPipe Hand Landmarker de Google. No está en el repositorio.
- **Prueba con cámara real** en la laptop de la demo y con la luz de la sede. La prueba automática usa una cámara falsa: solo comprueba que el permiso se pide con el botón.
- **Movimiento reducido:** revisar a ojo que nada gire ni se mueva con esa preferencia activa.

### H-09. Decisiones visuales de `/tool` (`@Gicarrillo`)

- Cómo se dibuja el calendario de las tres rotaciones y qué trama lleva cada `palette_token`.
- La etiqueta "Datos de ejemplo": hoy es una banda color Paja con borde rayado. Confirmar o cambiar.
- Estilo del mapa base de MapLibre (hace falta una fuente de teselas; las gratuitas piden atribución y algunas, cuenta).
- Redacción final en lenguaje llano, revisada por un agricultor o un agrónomo (ya anotado arriba).
- Las unidades llegan del contrato en inglés (`mm/yr`, `days/yr`). Decidir si el contrato las trae traducidas o si la interfaz las traduce; hoy se muestran tal cual.

### H-10. El puerto 8000 está ocupado en la laptop de Hanniel (`@H0M10`)

Un proceso del sistema llamado "Manager" escucha en el puerto 8000, así que la API no puede arrancar ahí (`error while attempting to bind`). El repositorio usa **8010** por omisión. Si alguien copió un `.env` viejo con 8000, que lo cambie.

### H-11. Datos: reparto 50/50 de parcelas y exportaciones GEE (`@H0M10` y `@Checo-coder`, sábado)

El proyecto de Google Earth Engine **`luca-497507`** ya quedó habilitado y configurado por omisión en `ee_common.py`, `.env.example` y el cuaderno de Colab. Las exportaciones de parcelas individuales pueden descargarse directo por HTTP con `--local-dir exports_dv` (sin pasar por Drive; el cómputo pesado sigue en Earth Engine):
- **`@H0M10` (Prioridad G2 14:00):** correr con Python local o Colab el polígono de **Diamond Valley** (`data-pipeline/parcels/diamond_valley.geojson`) usando `--project luca-497507 --local-dir exports_dv` para tener el primer `.parquet` real en `backend/data/`.
- **`@Checo-coder` (Prioridad G3 19:00):** autenticarse en GEE (o pedir acceso a `luca-497507`), dibujar los **2-3 valles vecinos (NV/ID/UT)** para entrenamiento multi-valle y el **polígono de Querétaro (`--unlabeled`)** + verificar cifra CONAGUA.

**Cuentas:**
- **Earth Engine (Completado para `@H0M10`):** proyecto **`luca-497507`** habilitado y fijado por defecto en el repositorio.
- **Google Drive:** solo hace falta si exportas muchas parcelas sin `--local-dir` (`fieldshift_exports`).
- **NASA POWER:** no pide cuenta ni llave.
- **Earthdata Login** solo hace falta si se usa `earthaccess` para algo fuera de Earth Engine (hoy no).

**Parcelas reales (decisión de una persona):** `data-pipeline/parcels/diamond_valley.geojson` trae un rectángulo de ejemplo. Hay que dibujar los pivotes reales de Diamond Valley (por ejemplo en geojson.io, mirando la imagen), cada uno con `parcel_id` y `valley: "diamond_valley_nv"`. Lo mismo para las dos o tres zonas de Nevada, Idaho y Utah, con su propio `valley`. Sin al menos dos valles no se puede entrenar.

**Comandos, en orden (Python local / máquina rentada para pocas parcelas con `--local-dir`, o Colab `data-pipeline/notebooks/field_shift_pipeline.ipynb`):**

```bash
pip install -r data-pipeline/requirements.txt          # 1 a 2 GB si instalas todo; para D-03 local basta earthengine-api geopandas pandas pyarrow numpy httpx
earthengine authenticate                               # en Colab: ee.Authenticate()
cd data-pipeline

# 1. Cobertura. RAM: < 1 GB. Lee la salida antes de fijar años (`luca-497507` va por omisión).
python ee_coverage.py --parcels parcels/diamond_valley.geojson --project luca-497507

# 2. Descarga directa sin pasar por Drive (para pocas parcelas). RAM: < 1 GB.
python ee_export.py --parcels parcels/diamond_valley.geojson --start-year <A> --end-year <B> --project luca-497507 --local-dir exports_dv

# 3. Tabla final. RAM: < 1 GB con decenas de parcelas. Pide POWER por internet.
python build_table.py --parcels parcels/diamond_valley.geojson --exports exports_dv --out ../backend/data/diamond_valley.parquet
```

Querétaro: los mismos pasos con `--unlabeled` en 1 y 2, cuando exista su polígono.

**Lo que no se pudo comprobar sin la cuenta:** los identificadores de colección de `data-pipeline/config.py` y los nombres de banda (HLS, OpenET `et_ensemble_mad`, SMAP `sm_surface` y `sm_rootzone`, SoilGrids). El paso 1 los imprime. Si algo sale `NO ENCONTRADA`, corrige `config.py` y anótalo en `PLAN.md`.

### H-12. Modelos: entrenamiento 50/50 fuera de la laptop (`@H0M10` + `@Checo-coder`, tras H-11)

- **`@H0M10`:** entrena en Colab **Modelo 1** (`model_1_crop_water`, XGBoost ET vs FAO-56) y **Modelo 4** (`model_4_moisture_cqr`, CQR 90% vs SMAP).
- **`@Checo-coder`:** entrena en Colab **Modelo 3** (`model_3_crop_history_gru`, GRU PyTorch -> ONNX) y, solo si sobra tiempo antes del Dom 08:00, **Modelo 2** (`model_2_prior_crop_effect`).

```bash
pip install -r models/requirements.txt      # con PyTorch: unos 3 GB de disco

python models/model_1_crop_water/train.py        --table <tabla>.parquet --test-valley diamond_valley_nv   # CPU, < 2 GB RAM
python models/model_4_moisture_cqr/train.py      --table <tabla>.parquet --test-valley diamond_valley_nv   # CPU, < 1 GB RAM
python models/model_3_crop_history_gru/train.py  --table <tabla>.parquet --test-valley diamond_valley_nv   # PyTorch, unos 3 GB RAM; GPU opcional
python models/model_2_prior_crop_effect/train.py --table <tabla>.parquet --test-valley diamond_valley_nv   # CPU, < 1 GB RAM (solo si sobra tiempo)
```

- No piden ninguna cuenta ni token: solo la tabla de H-11 con al menos dos valles.
- Colab gratuito (unos 12 GB de RAM) alcanza para los cuatro con decenas de miles de filas. La máquina rentada solo hace falta si la tabla pasa de unos millones de filas: es la decisión de pago ya anotada arriba.
- El modelo 1 se detiene si `models/kc_monthly.csv` está vacío (H-04).
- El guion del modelo 3 **no se ha ejecutado nunca** (PyTorch no se instala en la laptop). Pruébalo primero con `--sample`.
- Al terminar: llena `models/<modelo>/CARD.md` y sube `backend/artifacts/<modelo>/` (`model.ubj` u `.onnx` más `metrics.json`).

### H-13. Poner datos reales en la API (Hanniel o Checo, tras H-11)

1. Copia el `.parquet` de `build_table.py` a `backend/data/` (debe traer 36 meses consecutivos de la parcela).
2. Escribe `backend/data/<parcel_id>.meta.json` con el nombre de la parcela y **las restricciones que declare el agricultor** (formato en `backend/README.md`). Un agente no puede inventarlas. En Querétaro agrega `declared_history`: no hay CDL.
3. Prueba en local: `DATA_MODE=real uv run uvicorn app.main:app --port 8010` y abre `/api/v1/pilots`.
4. Sube los dos archivos y pon `DATA_MODE=real` en Railway.

### H-14. Verificación humana visual de la tabla FAO-56 (Hanniel)

Claude auditó `models/fao56_crop_bank.csv` contra la tabla 12 en línea de FAO-56 (`PLAN.md`, hallazgo C-01) y Argon corrigió las 6 diferencias detectadas (`trigo_invierno`, `garbanzo`, `soya`, `girasol`, `papa`, `trebol_cobertura`) sincronizando `backend/app/engine/data/fao56_crop_bank.csv`. Solo falta que una persona confirme visualmente la tabla original en `fao.org/4/x0490e/x0490e0b.htm` (la columna de Kc inicial es una imagen) y registre su nombre como verificador. Mientras tanto, la API sigue declarando esas cifras como `assumed`.

### H-15. Llaves gratuitas para datos de apoyo (Hanniel o Checo)

Verificado el 2026-11-14: estas APIs responden "no autorizado" sin llave. Cada una se pide con un registro gratuito; la llave va en `.env` y en Railway, nunca en el repositorio.

- **USDA NASS QuickStats** (superficie y rendimiento por condado): registro en quickstats.nass.usda.gov/api.
- **OpenET** (ET real por campo): cuenta en etdata.org. Alternativa sin llave: la colección de OpenET en Earth Engine.
- **USDA AMS MyMarketNews** (precios): registro en mymarketnews.ams.usda.gov.
- **Earthdata Login** (ECOSTRESS por AppEEARS, si se usa).

Sin llave funcionan: NASA POWER, CropScape (CDL), Soil Data Access (SSURGO) y la API nueva de agua de USGS.

### H-16. Decidir cómo se sabe qué se siembra en Querétaro (equipo)

Ningún recurso de la lista del reto dice qué se cultiva en México. Opciones: (a) lo declara el agricultor, con FAO GAEZ como aptitud; (b) usar estadística oficial mexicana (SIAP), saliendo de la lista y declarándolo en la página del proyecto. Detalle en `data-pipeline/PLAN_DE_DATOS.md` §5.
