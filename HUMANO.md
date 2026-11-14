# HUMANO.md — Acciones que requieren a una persona

Regla 11 de `AGENTS.md`: Todo lo que requiera intervención humana (cuentas, llaves, pagos, decisiones, polígonos, pruebas con cámara o lector de pantalla) se registra aquí con responsable, fecha límite y qué bloquea. Los agentes no simulan estos pasos ni inventan datos.

| Prioridad | Acción humana | Responsable | Para cuándo | Qué bloquea | Estado |
| --- | --- | --- | --- | --- | --- |
| **P0 (Crítico)** | Confirmar por escrito con el organizador que no hay revisión el sábado y podemos avanzar desde ya (Gustavo Cruz Zarraga confirmó en WhatsApp oficial: *"nosotros sólo hacemos la evaluación del reto el día domingo, no se hace ninguna revisión el día sábado"*) | Hanniel / Capitán | Sáb madrugada | Luz verde para construir funciones completas desde el sábado | **Completado** |
| **P0 (Crítico)** | Revisar el "stack" oficial si el organizador lo entrega a las 09:00 AM y validar compatibilidad antes del congelamiento | Hanniel + ARGON | Sáb 09:00 | Congelamiento del contrato (Sáb 10:00) | Pendiente (09:00 AM) |
| **P0 (Crítico)** | Crear/verificar cuentas de los 6 integrantes: **Earthdata Login** (y generar token para HLS/SMAP), proyecto **Google Earth Engine** de uso no comercial, y acceso a **OpenET** | Los 6 (coordina Persona 1) | Madrugada / Sáb 08:30 | Tareas D-01 a D-05 (sin GEE/Earthdata no hay datos reales ni modelos) | Pendiente |
| **P0 (Crítico)** | Crear proyectos en **Vercel**, **Railway** y **Supabase**, obtener URLs/llaves y cargar `.env` locales + variables de entorno en la nube (sin subir secretos a Git) | Hanniel | Sáb 09:30 | Despliegue API ejemplo (Sáb 10:00), RLS `/supabase`, Broadcast `/remote` | Pendiente |
| **P1 (Alto)** | Elegir las **2 o 3 zonas de riego** similares a Diamond Valley en Nevada, Idaho y Utah (pivote, alfalfa, granos) para entrenamiento y validación por valle | Persona 1 + Persona 2 | Sáb 09:30 | D-02, D-05 y partición correcta por valle en Modelos 1-4 | Pendiente |
| **P1 (Alto)** | Lanzar las **exportaciones de Earth Engine de Diamond Valley** (36 meses HLS, POWER, OpenET, CDL, SMAP, SSURGO, SRTM) y vigilar que terminen sin llenar la RAM local | Persona 1 | Sáb 10:30 | Compuerta Sábado 14:00 ("un dato real en pantalla") y 19:00 | Pendiente |
| **P1 (Alto)** | Decidir si se **renta una máquina en la nube con mucha RAM/GPU** (ej. RTX 3090/A5000, >=64 GB RAM por unas horas) para el cruce pesado y entrenamiento | Hanniel / Persona 2 | Sáb 10:00 | Entrenamiento de Modelos 1-4 fuera de laptops de 8 GB | Pendiente |
| **P1 (Alto)** | Definir el **nombre del proyecto** (confirmar si queda "Field Shift") y el **público principal** en inglés y español | Equipo completo | Sáb 10:00 | Textos de cabecera, `/docs/project_page.md`, pitch y guion | Pendiente |
| **P1 (Alto)** | Definir el **polígono exacto de la parcela de Querétaro** (San Juan del Río / Pedro Escobedo) y verificar cualquier cifra de acuíferos **CONAGUA** contra publicación oficial (anotando fecha y fuente) | Persona 1 / Equipo | Sáb 13:00 | Caso real `unlabeled` de Querétaro (D-04) | Pendiente |
| **P2 (Medio)** | Conseguir a un **agrónomo o agricultor** que revise la hoja de evidencia y el lenguaje llano de `/tool` | Persona 4 / Equipo | Sáb tarde - Dom mañana | Validación de utilidad real, riesgos locales y pitch | Pendiente |
| **P2 (Medio)** | Dirección visual y ajuste fino de `/showcase`, terreno 3D y **prueba de gestos con cámara** bajo iluminación real (y verificar respaldo por teclado) | Persona 5 | Sáb 18:00 y Dom 11:00 | Pista local (`/showcase`) y tomas del video | Pendiente |
| **P2 (Medio)** | Grabar **video de respaldo** (Sábado 23:00) y **video final de 30 s** + redactar la **página del proyecto en inglés** (`/docs/project_page.md`, cero cifras `fixture`) | Persona 6 + Equipo | Sáb 23:00 / Dom 15:00 | Entrega global oficial (Dom 20:00 / 23:59) | Pendiente |
| **P2 (Medio)** | Ejecutar **prueba manual con lector de pantalla** (NVDA/VoiceOver) y teclado sobre `/tool` | Persona 4 | Dom 11:00 | Requisito obligatorio de accesibilidad (§9 de `AGENTS.md`) | Pendiente |
| **P2 (Medio)** | Preparar logística de demo local: laptop a corriente con GPU dedicada, pestañas precargadas y **red propia desde teléfono** por si falla el Wi-Fi de la sede | Equipo | Dom 17:00 | Plan anti-fallos de demo en vivo (`PISTAS_PARALELAS.md`) | Pendiente |

---

## Pasos exactos anotados por Claude (constructor)

Cada paso dice qué hacer y qué desbloquea. Los agentes no los simulan.

### H-01. Subir el repositorio a GitHub (Hanniel, antes de que el equipo clone)

El repositorio existe solo en la laptop (`git init` hecho, rama `main`, sin remoto).

1. Crea un repositorio **vacío** en GitHub (sin README ni licencia). Debe ser público para la entrega.
2. En la raíz del proyecto:
   ```bash
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   ```
3. Abre la pestaña **Actions** y confirma que `backend` termina en verde.

Desbloquea: que los compañeros clonen y que corra la integración continua.

### H-02. Desplegar la API de ejemplo en Railway (Hanniel, compuerta del sábado 10:00)

1. En railway.com: **New Project → Deploy from GitHub repo** y elige el repositorio.
2. En el servicio: **Settings → Source → Root Directory** = `backend`.
3. **Variables**: `DATA_MODE=fixture` y, cuando exista el dominio de Vercel, `CORS_ORIGINS=https://<tu-app>.vercel.app,http://localhost:3000`. No hace falta ninguna llave.
4. **Settings → Networking → Generate Domain**.
5. Comprueba: `https://<dominio>/health` debe responder `"status":"ok"` y `https://<dominio>/docs` debe abrir.
6. Si la compilación falla porque no reconoce el constructor, cambia `"builder": "RAILPACK"` por `"NIXPACKS"` en `backend/railway.json` y vuelve a desplegar. No se pudo probar sin la cuenta.

Desbloquea: la compuerta "API de ejemplo desplegada" y `NEXT_PUBLIC_API_URL` para el frontend.

### H-03. Revisar la tabla de rasgos de cultivo (agrónomo o quien conozca el campo)

Archivo: `backend/app/engine/crop_traits.py`. La escribió un agente como supuesto. Decide si cada rotación pasa o no por maquinaria y comprador. Revisar: qué equipo pide cada cultivo, qué cultivos se venden, y si la cosecha de grano se supone contratada. Mientras no se revise, toda cifra que dependa de ella es `assumed`.

### H-04. Transcribir y verificar la tabla Kc de FAO-56 (Persona 2 o Hanniel)

El respaldo del modelo 1 es la "tabla FAO-56, declarada". Hay que copiar de la publicación (FAO Irrigation and Drainage Paper 56, tabla 12) los coeficientes inicial, medio y final de: alfalfa, cebada, avena, trigo de invierno, maíz, sorgo y frijol, con la página consultada y la fecha. Un agente no debe escribirlos de memoria.

Desbloquea: cifras de agua reales cuando el modelo 1 no esté entrenado.

### H-05. Decidir las dos inconsistencias de los fixtures — **Completado por Argon (v0.1.1)**

Resuelto en `contracts/CHANGELOG.md` v0.1.1: `diamond_valley.json` amplía `planting_window` a octubre (`3..10`) para cubrir la siembra otoñal de trigo de invierno, `no_viable_options.json` corrige `current.constraint_evaluation.calendar_ok` a `true` (alfalfa ya establecida; sigue descartada por agua y maquinaria), y `KNOWN_FIXTURE_DIVERGENCES` en `backend/tests/test_constraints.py` quedó vacío.

### H-06. Crear el proyecto de Supabase y aplicar la migración (Hanniel, sábado 09:30)

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
5. **Project Settings → API**: copia **Project URL** y la llave **anon public**. No copies `service_role` a ningún lado.
6. Ponlas en:
   - `backend/.env` y variables de Railway: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
   - `frontend/.env.local` y variables de Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. Comprueba: `GET /health` de la API debe decir `"supabase_configured": true`, y `POST /api/v1/share` con un fixture debe devolver un token.

Desbloquea: enlaces compartibles (A-04), revisión del técnico (T-04) y el teléfono como control (L-05). Realtime Broadcast viene activo por omisión; no requiere tabla.

### H-07. Desplegar el frontend en Vercel (Hanniel o Persona 4, sábado en la mañana)

1. En vercel.com: **Add New → Project**, importa el repositorio.
2. **Root Directory** = `frontend`. El marco (Next.js) se detecta solo.
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` = dominio de Railway (H-02), y cuando existan, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (H-06).
4. Despliega. Abre `/tool/retrato`: debe verse la tira y la etiqueta "Datos de ejemplo" **sin** el aviso de "No hay conexión con el servidor". Si aparece ese aviso, revisa `NEXT_PUBLIC_API_URL` y que `CORS_ORIGINS` en Railway incluya el dominio de producción (las vistas previas `*.vercel.app` ya están permitidas).

### H-08. Decisiones visuales y pruebas con cámara de `/showcase` (Persona 5)

El agente dejó un lienzo de prueba y un botón que solo pide permiso de cámara. Falta que una persona decida, mirando la pantalla:

- **Dirección visual de la landing:** paleta oscura exacta, tipografía de títulos, cuánto texto lleva y la frase de apertura (la misma del pitch y el video).
- **Globo:** textura (por ejemplo Blue Marble de la NASA, que hay que descargar), nivel de detalle, qué satélites y órbitas se dibujan y con qué datos.
- **Terreno 3D:** exageración vertical de SRTM, cómo se representa el cultivo creciendo, cámara inicial y ritmo de las animaciones.
- **Lluvia en partículas:** cantidad y estilo; solo con datos reales.
- **Gestos:** umbral del pellizco, sensibilidad del giro, mano izquierda o derecha, y qué se ve en pantalla cuando la cámara está encendida.
- **Descargar el modelo de manos:** `hand_landmarker.task` y los archivos WASM de `@mediapipe/tasks-vision` (están en `frontend/node_modules/@mediapipe/tasks-vision/wasm/`) deben copiarse a `frontend/public/mediapipe/`. El modelo se baja de la página de MediaPipe Hand Landmarker de Google. No está en el repositorio.
- **Prueba con cámara real** en la laptop de la demo y con la luz de la sede. La prueba automática usa una cámara falsa: solo comprueba que el permiso se pide con el botón.
- **Movimiento reducido:** revisar a ojo que nada gire ni se mueva con esa preferencia activa.

### H-09. Decisiones visuales de `/tool` (Persona 4)

- Cómo se dibuja el calendario de las tres rotaciones y qué trama lleva cada `palette_token`.
- La etiqueta "Datos de ejemplo": hoy es una banda color Paja con borde rayado. Confirmar o cambiar.
- Estilo del mapa base de MapLibre (hace falta una fuente de teselas; las gratuitas piden atribución y algunas, cuenta).
- Redacción final en lenguaje llano, revisada por un agricultor o un agrónomo (ya anotado arriba).
- Las unidades llegan del contrato en inglés (`mm/yr`, `days/yr`). Decidir si el contrato las trae traducidas o si la interfaz las traduce; hoy se muestran tal cual.

### H-10. El puerto 8000 está ocupado en la laptop de Hanniel

Un proceso del sistema llamado "Manager" escucha en el puerto 8000, así que la API no puede arrancar ahí (`error while attempting to bind`). El repositorio usa **8010** por omisión. Si alguien copió un `.env` viejo con 8000, que lo cambie.

### H-11. Datos: cuentas, parcelas y exportaciones (Persona 1, sábado en la mañana)

Nada de esto corre en la laptop. Usa Colab.

**Cuentas (cada quien la suya):**
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

### H-12. Modelos: entrenamiento fuera de la laptop (Persona 2, tras H-11)

```bash
pip install -r models/requirements.txt      # con PyTorch: unos 3 GB de disco

python models/model_1_crop_water/train.py        --table <tabla>.parquet --test-valley diamond_valley_nv   # CPU, < 2 GB RAM
python models/model_2_prior_crop_effect/train.py --table <tabla>.parquet --test-valley diamond_valley_nv   # CPU, < 1 GB RAM
python models/model_4_moisture_cqr/train.py      --table <tabla>.parquet --test-valley diamond_valley_nv   # CPU, < 1 GB RAM
python models/model_3_crop_history_gru/train.py  --table <tabla>.parquet --test-valley diamond_valley_nv   # PyTorch, unos 3 GB RAM; GPU opcional
```

- No piden ninguna cuenta ni token: solo la tabla de H-11 con al menos dos valles.
- Colab gratuito (unos 12 GB de RAM) alcanza para los cuatro con decenas de miles de filas. La máquina rentada solo hace falta si la tabla pasa de unos millones de filas: es la decisión de pago ya anotada arriba.
- El modelo 1 se detiene si `models/kc_monthly.csv` está vacío (H-04).
- El guion del modelo 3 **no se ha ejecutado nunca** (PyTorch no se instala en la laptop). Pruébalo primero con `--sample`.
- Al terminar: llena `models/<modelo>/CARD.md` y sube `backend/artifacts/<modelo>/` (`model.ubj` u `.onnx` más `metrics.json`).
