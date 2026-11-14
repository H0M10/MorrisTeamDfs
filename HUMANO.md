# HUMANO.md — Acciones que requieren a una persona

Regla 11 de `AGENTS.md`: Todo lo que requiera intervención humana (cuentas, llaves, pagos, decisiones, polígonos, pruebas con cámara o lector de pantalla) se registra aquí con responsable, fecha límite y qué bloquea. Los agentes no simulan estos pasos ni inventan datos.

> **Seguimiento evolutivo en vivo:** Los cambios de estado y decisiones aquí anotados se reflejan también en `docs/status.json` (`python scripts/sync_board.py`) para verse en GitHub Pages (`https://h0m10.github.io/MorrisTeamDfs/`).

| Prioridad | Acción humana | Responsable | Para cuándo | Qué bloquea | Estado |
| --- | --- | --- | --- | --- | --- |
| **P0 (Crítico)** | Crear/verificar cuentas del equipo: proyecto **Google Earth Engine** de uso no comercial, **Colab** y acceso a **OpenET** (Earthdata Login solo si se usa `earthaccess` fuera de GEE) | `@Checo-coder` + `@H0M10` | Sáb mañana | Tareas D-01 a D-05 (sin GEE/OpenET no hay datos reales ni modelos) | Pendiente |
| **P0 (Crítico)** | Crear proyectos en **Railway** (**Completado**: `https://morristeamdfs-production.up.railway.app`), **Vercel** (**Completado**: `https://morris-team-dfs.vercel.app/`) y **Supabase** (proyecto + llaves listos; falta ejecutar `20261114000000_init.sql` en SQL Editor) | Hanniel (`@H0M10`) | Sáb 12:00 | Enlaces compartibles (`/api/v1/share`) y RLS `/supabase` | En curso (solo falta `Run` SQL) |
| **P1 (Alto)** | Elegir las **2 o 3 zonas de riego** similares a Diamond Valley en Nevada, Idaho y Utah (pivote, alfalfa, granos) para entrenamiento y validación por valle | `@Checo-coder` + `@H0M10` | Sáb mañana | D-02, D-05 y partición correcta por valle en Modelos 1-4 | Pendiente |
| **P1 (Alto)** | Lanzar las **exportaciones de Earth Engine de Diamond Valley** (36 meses HLS, POWER, OpenET, CDL, SMAP, SSURGO, SRTM) en Colab | `@Checo-coder` | Sáb 11:00–13:30 | Compuerta Sábado 14:00 ("un dato real en pantalla") y 19:00 | Pendiente |
| **P1 (Alto)** | Decidir si se **renta una máquina en la nube con mucha RAM/GPU** (solo si Colab gratuito de ~12 GB RAM no alcanza para las tablas) | `@H0M10` + `@Checo-coder` | Sáb mediodía | Entrenamiento de Modelos 1-4 fuera de laptops de 8 GB | Pendiente |
| **P1 (Alto)** | Definir el **nombre del proyecto** (confirmar si queda "Field Shift") y el **público principal** en inglés y español | Equipo (4) | Sáb 10:00 | Textos de cabecera, `/docs/project_page.md`, pitch y guion | Pendiente |
| **P1 (Alto)** | Definir el **polígono exacto de la parcela de Querétaro** (San Juan del Río / Pedro Escobedo) y verificar cualquier cifra de acuíferos **CONAGUA** contra publicación oficial (anotando fecha y fuente) | `@Checo-coder` + `@H0M10` | Sáb 13:00 | Caso real `unlabeled` de Querétaro (D-04) | Pendiente |
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

### H-04. Transcribir y verificar la tabla Kc de FAO-56 (`@Checo-coder` o `@H0M10`)

El respaldo del modelo 1 es la "tabla FAO-56, declarada". Hay que copiar de la publicación (FAO Irrigation and Drainage Paper 56, tabla 12) los coeficientes inicial, medio y final de: alfalfa, cebada, avena, trigo de invierno, maíz, sorgo y frijol, con la página consultada y la fecha. Un agente no debe escribirlos de memoria.

Desbloquea: cifras de agua reales cuando el modelo 1 no esté entrenado.

### H-05. Decidir las dos inconsistencias de los fixtures — **Completado por Argon (v0.1.1)**

Resuelto en `contracts/CHANGELOG.md` v0.1.1: `diamond_valley.json` amplía `planting_window` a octubre (`3..10`) para cubrir la siembra otoñal de trigo de invierno, `no_viable_options.json` corrige `current.constraint_evaluation.calendar_ok` a `true` (alfalfa ya establecida; sigue descartada por agua y maquinaria), y `KNOWN_FIXTURE_DIVERGENCES` en `backend/tests/test_constraints.py` quedó vacío.

### H-06. Crear el proyecto de Supabase y aplicar la migración (`@H0M10`, sábado)

1. En supabase.com: **New project**. Región cercana (us-west o us-east). Guarda la contraseña de la base en tu gestor, no en el repositorio.
2. **SQL Editor → New query**: pega completo `supabase/migrations/20261114000000_init.sql` y pulsa **Run**. Debe terminar sin errores.
   (Alternativa con la CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.)
3. Comprueba en el mismo editor:
   ```sql
   select public.create_shared_evaluation(
     'prueba-token-0123456789', '{}'::jsonb,
     '{"contract_version":"0.1.0","data_status":"fixture","strategies":[]}'::jsonb);
   select * from public.get_shared_evaluation('prueba-token-0123456789');
   select public.submit_review('prueba-token-0123456789', 'approve', 'prueba', null);
   select * from public.get_reviews('prueba-token-0123456789');
   delete from public.evaluations where share_token = 'prueba-token-0123456789';
   ```
   Las cuatro primeras deben devolver una fila. Si alguna falla, copia el error en `PLAN.md`: la migración solo pasó un analizador sintáctico, no se ha corrido en una base real.
4. **Table Editor**: `evaluations` y `reviews` deben decir "RLS enabled" y no tener políticas.
5. **Project Settings → API Keys**: copia el **Project URL** y la llave pública **`Publishable`** (`sb_publishable_...`, o la `anon public` si usas Legacy API Keys). **Nunca** copies la llave JWT con `"role": "service_role"` ni `sb_secret_...` a ningún lado.
6. Ponlas en:
   - `backend/.env` y variables de Railway: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (= la `sb_publishable_...`; el backend solo envía `Authorization: Bearer` si recibe un JWT clásico).
   - `frontend/.env.local` y variables de Vercel: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, el cliente acepta ambas).
7. Comprueba: `GET /health` de la API debe decir `"supabase_configured": true`, y `POST /api/v1/share` con un fixture debe devolver un token.

Desbloquea: enlaces compartibles (A-04) y revisión del técnico (T-04). (Extra #5 `/remote` quedó recortado preventivamente por equipo de 4).

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

### H-11. Datos: cuentas, parcelas y exportaciones (`@Checo-coder`, sábado en Colab)

Nada de esto corre en la laptop. Usa Colab.

**Cuentas:**
- **Earth Engine:** en code.earthengine.google.com/register crea o elige un proyecto de Google Cloud y regístralo para uso no comercial. El id del proyecto es lo que piden los guiones (`--project` o `EE_PROJECT`).
- **Google Drive:** las exportaciones caen en la carpeta `fieldshift_exports` del Drive de quien las lanza.
- **NASA POWER:** no pide cuenta ni llave.
- **Earthdata Login** solo hace falta si se usa `earthaccess` para algo fuera de Earth Engine (hoy no).

**Parcelas reales (decisión de una persona):** `data-pipeline/parcels/diamond_valley.geojson` trae un rectángulo de ejemplo. Hay que dibujar los pivotes reales de Diamond Valley (por ejemplo en geojson.io, mirando la imagen), cada uno con `parcel_id` y `valley: "diamond_valley_nv"`. Lo mismo para las dos o tres zonas de Nevada, Idaho y Utah, con su propio `valley`. Sin al menos dos valles no se puede entrenar.

**Comandos, en orden (cuaderno `data-pipeline/notebooks/field_shift_pipeline.ipynb` en Colab, o a mano):**

```bash
pip install -r data-pipeline/requirements.txt          # 1 a 2 GB de disco en Colab
earthengine authenticate                               # en Colab: ee.Authenticate()
cd data-pipeline

# 1. Cobertura. RAM: < 1 GB. Lee la salida antes de fijar años.
python ee_coverage.py --parcels parcels/diamond_valley.geojson --project <proyecto-ee>

# 2. Exportación a Drive. RAM: < 1 GB (el cruce corre en Earth Engine). De minutos a una hora.
python ee_export.py --parcels parcels/diamond_valley.geojson --start-year <A> --end-year <B> --project <proyecto-ee> --wait

# 3. Tabla final. RAM: < 1 GB con decenas de parcelas. Pide POWER por internet.
python build_table.py --parcels parcels/diamond_valley.geojson --exports <carpeta-de-drive> --out <salida>.parquet
```

Querétaro: los mismos pasos con `--unlabeled` en 1 y 2, cuando exista su polígono.

**Lo que no se pudo comprobar sin la cuenta:** los identificadores de colección de `data-pipeline/config.py` y los nombres de banda (HLS, OpenET `et_ensemble_mad`, SMAP `sm_surface` y `sm_rootzone`, SoilGrids). El paso 1 los imprime. Si algo sale `NO ENCONTRADA`, corrige `config.py` y anótalo en `PLAN.md`.

### H-12. Modelos: entrenamiento fuera de la laptop (`@Checo-coder`, tras H-11)

Orden estricto por tiempo (`Modelo 1 → Modelo 4 → Modelo 3 → Modelo 2` solo si sobra tiempo antes del Dom 08:00):

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
