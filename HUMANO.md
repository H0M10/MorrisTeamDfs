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

### H-05. Decidir las dos inconsistencias de los fixtures (Hanniel, antes de congelar a las 10:00)

Detalle en `PLAN.md`, sección "Notas para Argon y Hanniel". Son dos banderas `calendar_ok` que no cuadran con la ventana de siembra del propio fixture.

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
