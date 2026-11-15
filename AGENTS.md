# AGENTS.md — Field Shift (equipo The CSC)

Copia este archivo también como `CLAUDE.md`. Lo leen todos los agentes antes de cualquier tarea. Si un prompt contradice este archivo, manda este archivo.

- **Evento:** NASA Space Apps Challenge 2026, sábado 14 y domingo 15 de noviembre.
- **Reto:** Field Shift: Adapting Farms with NASA Data.
- **Qué pide el reto:** una herramienta de apoyo a la decisión de rotación de cultivos que combine observaciones de la Tierra de la NASA, suelo local, rasgos de cultivo y prioridades del agricultor. Debe comparar al menos tres rotaciones, incluida la actual, y para cada una decir por qué se sugiere, qué evidencia la apoya, qué beneficios tiene, qué información falta y qué riesgos necesita revisar alguien local.
- **Entrega global:** página del proyecto en inglés, video de 30 segundos o 7 diapositivas, repositorio público y descripción de cómo se usó la IA. Límite: domingo 23:59 hora local.
- **Equipo:** seis programadores. Hanniel lidera Motor y API y es el único que aprueba cambios al contrato.

## 1. Reglas que no se rompen

1. **Nada inventado se presenta como real.** Ningún modelo de lenguaje produce cifras de agua, rendimiento, vigor ni ahorro. Toda cifra en pantalla viene de un dato observado, de un modelo con métrica reportada o de un supuesto declarado como supuesto.
2. **Los datos de ejemplo se marcan.** Todo archivo de ejemplo lleva `"data_status": "fixture"` y cada cifra suya lleva `"type": "fixture"`. Mientras la respuesta sea `fixture`, las interfaces muestran una etiqueta visible "Datos de ejemplo". Ninguna cifra `fixture` aparece en el video, en la página del proyecto ni en el pitch.
3. **Restricciones primero.** El motor evalúa agua disponible, comprador, maquinaria y calendario antes de calcular nada más. Si ninguna rotación pasa, responde `"has_viable_options": false` y explica qué restricción descartó a cada una. No rellena con recomendaciones.
4. **Cada cifra lleva su ficha:** fuente, fecha, escala nativa y tipo (`observed`, `modeled`, `assumed` o `fixture`).
5. **La escala se respeta.** SMAP (9 km), GRACE (cientos de km) y los datos de acuífero son contexto regional. Nunca se muestran como si fueran de la parcela.
6. **Un modelo sin métrica no llega al agricultor.** Si no se entrenó o no se midió, entra su respaldo (sección 5) y la ficha lo dice.
7. **Memoria local:** las laptops tienen 8 GB de RAM y una RTX 4060 de 6 GB. Prohibido cargar datos crudos, levantar Docker o entrenar en local con tablas grandes. El cruce pesado corre en Earth Engine, Colab o una máquina rentada. Al repositorio solo entran artefactos compactos.
8. **Sin secretos en el repositorio.** Llaves y tokens van en `.env` (ignorado por git) y en las variables de Railway, Vercel y Supabase. Se mantiene un `.env.example` sin valores.
9. **Cada carpeta tiene dueño.** Un agente solo escribe en la carpeta de la tarea que se le dio. Para tocar otra carpeta, anota el pedido en `PLAN.md`.
10. **Bitácora de IA.** Cada sesión de agente agrega una línea a `AI_USAGE.md`: fecha, herramienta, qué hizo, en qué carpeta. La entrega lo exige.
11. **Lo que necesita a una persona se anota en `HUMANO.md`** (cuentas, llaves, descargas, pagos, decisiones de diseño, pruebas con cámara). El agente no lo simula ni lo deja a medias: lo anota y sigue con otra cosa.

## 2. Estructura del repositorio

```
/contracts/            contrato JSON, esquema y fixtures        Hanniel
/backend/              FastAPI para Railway                     Hanniel
/data-pipeline/        scripts de Earth Engine, Colab y nube    Datos (persona 1)
/models/               entrenamiento, artefactos, fichas        Modelos (persona 2)
/frontend/             una sola app Next.js
  src/app/tool/        la herramienta del agricultor            persona 4
  src/app/showcase/    landing, globo, terreno 3D, gestos       persona 5
  src/app/remote/      teléfono como control                    persona 5
  src/app/engineer/    Modo Ingeniero y red en vivo             persona 6
  src/lib/             cliente de la API y tipos del contrato   Hanniel
/supabase/             migraciones SQL y políticas              Hanniel
/docs/                 página del proyecto, guion, fichas       persona 6
AGENTS.md  CLAUDE.md  PLAN.md  HUMANO.md  AI_USAGE.md  PISTAS_PARALELAS.md
```

Datos y Modelos trabajan en pareja el sábado por la mañana: sin tablas no hay modelos.

## 3. Tecnologías

- **Frontend:** Next.js con App Router y TypeScript, Tailwind, MapLibre GL para el mapa, three con @react-three/fiber y drei para 3D, @mediapipe/tasks-vision (Hand Landmarker) para gestos, supabase-js para tiempo real. Despliegue en Vercel.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, numpy, pandas, pyarrow, xgboost, onnxruntime, scikit-learn, pytest, ruff. Despliegue en Railway, solo CPU.
- **Datos y modelos (fuera de las laptops):** earthengine-api, geemap, earthaccess, geopandas, xgboost, PyTorch para el modelo 3 con exportación a ONNX.
- **Base de datos:** Postgres en Supabase (sección 7).
- Usa la última versión estable de cada paquete y fija versiones en los archivos de bloqueo.

## 4. Datos

**Núcleo (siete fuentes):**

| Fuente | Escala | Uso |
| --- | --- | --- |
| NASA POWER | cerca de 50 km, diario desde 1981, sin llave | Clima, ET de referencia, frecuencia de heladas y calor |
| Landsat / HLS | 30 m | NDVI, NDMI, BSI, NDTI y la tira de color de la parcela |
| SMAP | 9 km | Humedad regional y validación del modelo 4 |
| USDA CDL | 30 m, solo EE. UU. | Etiquetas de cultivo y barbecho por año |
| OpenET | 30 m, los 48 estados contiguos de EE. UU. desde el 15 de diciembre de 2025 (validación publicada solo del oeste) | Evapotranspiración observada |
| SSURGO (EE. UU.) / SoilGrids (global, 250 m) | | Textura, materia orgánica, capacidad de agua. SoilGrids no está en la lista del reto: se usa declarado, solo donde no hay SSURGO |
| SRTM | 30 m | Elevación y pendiente |

**Si sobra tiempo:** ECOSTRESS (70 m, cola asíncrona en AppEEARS), GPM IMERG (lluvia para las partículas del 3D), GRACE como contexto de cuenca, QuickStats y precios de AMS, Sentinel-2.

**Externo aprobado (15 de noviembre, Hanniel):** Google Dynamic World (`GOOGLE/DYNAMICWORLD/V1`, 10 m), solo como lectura al lado ("probabilidad de cultivo según Google"), citado como producto externo. No cambia ninguna cifra de la evaluación.

**No se usan:** GEDI, LANDFIRE, NAIP, NLCD, CoCoRaHS, NLDAS, ERA5.

Correcciones que ya se decidieron y no se reabren:

- **NDRE** necesita la banda de borde rojo, que solo trae Sentinel-2 (HLS S30). Landsat no la tiene. NDRE es opcional y nunca se calcula con bandas de Landsat.
- **CAI** no se puede calcular con Landsat ni Sentinel-2. Para rastrojo se usa NDTI como indicio cualitativo.
- **GEDI** no sirve para cultivos anuales.
- Antes de planear las tablas, confirmar en el catálogo de Earth Engine qué años cubre cada colección.

**Regiones:**

- **Con etiquetas:** Diamond Valley, Nevada (el caso del reto; centro aproximado 39.68, -116.03) y dos o tres zonas de riego parecidas de Nevada, Idaho y Utah, elegidas por similitud: pivote, alfalfa y granos. Aquí se entrena y se mide.
- **Sin etiquetas: fuera del producto (decisión de Hanniel, 15 de noviembre).** El producto se enfoca solo en Estados Unidos, donde hay OpenET, USDA CDL y los cinco modelos se pueden medir. Querétaro (San Juan del Río y Pedro Escobedo) salió de la herramienta; sus scripts y polígonos quedan en `/data-pipeline` como trabajo exploratorio y el fixture `queretaro.json` sigue en el contrato congelado solo para las pruebas del modo de ejemplo. El análisis en vivo (`/api/v1/analyze`) cubre los 48 estados contiguos.
- Qué datos hay en cada región y qué responde cada recurso: `data-pipeline/PLAN_DE_DATOS.md`.
- Las cifras de disponibilidad de acuíferos de CONAGUA solo se muestran si una persona las verificó contra la publicación oficial y anotó la fecha. Van como contexto de cuenca.

## 5. Modelos

| Modelo | Etiqueta real | Algoritmo | Métrica | Respaldo si no sale |
| --- | --- | --- | --- | --- |
| 1. Agua que usa cada cultivo | OpenET por píxel con el cultivo de CDL | XGBoost | Error medio en mm en un valle no visto, contra FAO-56 | Tabla FAO-56, declarada |
| 2. Efecto del cultivo anterior | Secuencias de CDL y vigor máximo en Landsat/HLS | XGBoost | Mejora frente al mismo modelo sin el cultivo anterior | "Sin evidencia local" en la ficha |
| 3. Lectura del historial | CDL agrupado: alfalfa, grano pequeño, maíz, barbecho | GRU pequeña con atención temporal, exportada a ONNX | F1 por clase en un valle no visto | El agricultor declara su historial |
| 4. Humedad con intervalo | SMAP | Balance FAO-56, residual con árboles e intervalo conformal (CQR) al 90 % | Cobertura real del intervalo | Balance sin intervalo, con rango histórico |

Reglas de validación:

1. Separar por valle, no por píxel al azar. Los píxeles vecinos se parecen e inflan la métrica.
2. Dejar fuera el último año como segunda prueba.
3. Reportar cada modelo contra su línea base, aunque pierda.
4. El modelo 2 es observacional. Se presenta como "lo que pasó en campos parecidos", nunca como causa, y no produce cifras de ahorro de agua.
5. Los pesos de atención del modelo 3 se muestran como "meses que más pesaron en la lectura", no como explicación causal.
6. El modelo 4 se valida a escala de zona.
7. Cada modelo entrega `models/<nombre>/CARD.md` de media página: datos, partición, métrica, línea base, límites.
8. Los artefactos corren en CPU. No se usan modelos fundacionales geoespaciales ni ajuste fino de modelos grandes.

**Motor físico (determinista, en `/backend/app/engine/`):**

- Balance de agua FAO-56 mensual con ET de referencia de POWER y coeficientes de cultivo.
- Frecuencia histórica de heladas y calor por mes desde POWER.
- Índices: `NDVI = (NIR - Red) / (NIR + Red)`, `NDMI = (NIR - SWIR1) / (NIR + SWIR1)`, `BSI = ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))`, `NDTI = (SWIR1 - SWIR2) / (SWIR1 + SWIR2)`.
- Índice de agua en la zona de raíces con filtro exponencial recursivo, declarado como índice relativo.
- **RUSLE es opcional** y solo para erosión por lluvia. Si se implementa: `M = (limo + arena muy fina) * (100 - arcilla)` (es un producto), la pendiente se convierte a radianes dentro del seno, y el exponente de longitud de pendiente se declara en la ficha.

El modelo de lenguaje, si se usa, solo traduce y redacta a partir de campos del contrato. La ruta de preguntas (`/ask`) es un enrutador determinista por reglas.

## 6. Contrato

`/contracts/` contiene el esquema (`schema.json`), los fixtures (`fixtures/*.json`) y un `CHANGELOG.md`. El contrato se congela el sábado a las 10:00; después, cualquier cambio lo aprueba Hanniel y se anota.

Campos obligatorios de una evaluación:

- `data_status`: `fixture` o `real`.
- `parcel`: id, nombre, centro, área, `region_mode` (`labeled` o `unlabeled`), contexto de cuenca con su escala.
- `timeline`: 36 meses, cada uno con color medio de HLS, índices, lluvia, ET, humedad con intervalo y peso de atención si existe.
- `constraints`: agua máxima por año, maquinaria, cultivos sin comprador, ventana de siembra.
- `has_viable_options`.
- `strategies`: exactamente tres (`current`, `less_water`, `more_soil`), cada una con secuencia de 36 meses, `viable`, `rejection_reason`, `metrics` y `evidence_card`.
- Cada métrica: `value`, `unit`, `interval` opcional, `type`, `source`, `date`, `native_scale`.
- `evidence_card`: `why_suggested`, `supporting_evidence`, `benefits`, `information_gaps`, `local_review_risks`.
- `models`: por modelo, `status` (`trained`, `fallback` o `absent`), métrica y línea base.

Unidades: agua en mm, área en ha, fechas `YYYY-MM`, coordenadas WGS84. Textos para el usuario en español e inglés.

## 7. Base de datos (Supabase)

Hace falta poca, para tres cosas: enlaces compartibles, revisión del técnico y el teléfono como control.

- `evaluations`: id, token de enlace, entrada y resultado en JSON, fecha.
- `reviews`: id, evaluación, veredicto del técnico (aprueba, corrige, descarta), comentarios, límites corregidos, fecha.
- **Realtime Broadcast** para el control desde el teléfono: sin tabla, canal por sesión.
- Seguridad a nivel de fila activada. Lectura solo por token. Sin cuentas de usuario ni datos personales: no se piden nombres, teléfonos ni correos.
- Migraciones en `/supabase/migrations/`. La herramienta debe seguir funcionando si Supabase no responde: guardar y compartir se desactivan, lo demás sigue.

## 8. Dos productos sobre la misma API

**La herramienta (`/tool`)** es para el agricultor de riego mediano y su técnico.

- Una decisión por pantalla: parcela, retrato satelital, restricciones, tres rotaciones en calendario de 36 meses, ficha de evidencia, hoja para compartir.
- Fondo blanco y texto negro. El color aparece solo donde hay un dato. Paleta: Cal `#FFFFFF`, Tinta `#000000`, Azul compuerta `#1247B8`, Paja `#E9B824`, Tierra `#5A4632` (con trama), Hoja `#2F7D32` (sólido).
- Tipografía Atkinson Hyperlegible Next, 18 px o más.
- Pieza central: la tira de la parcela, un calendario pintado con el color medio real de HLS de cada mes.
- El mapa muestra el tamaño real del píxel de cada fuente sobre la parcela.
- Prohibido: degradados morados, fondo oscuro con neón, cuadrículas de tarjetas idénticas, etiquetas en mayúsculas espaciadas.
- Hoja para compartir: vista de impresión del navegador (guardar como PDF) y enlace con token.

**La landing y el Modo Ingeniero (`/showcase`, `/engineer`, `/remote`)** son para los jueces.

- Pueden ser oscuros y densos. Solo leen la API. Si fallan, la herramienta sigue.
- Extras en orden; si falta tiempo se cortan de abajo hacia arriba:
  1. Gestos con la mano: pellizco para recorrer meses, mano abierta para cambiar de rotación, giro del terreno. La cámara solo se activa con un botón.
  2. Zoom del globo a la parcela con las órbitas de los satélites.
  3. Red en vivo con los pesos reales del modelo 3. Si el modelo 3 no está entrenado, este extra no se muestra.
  4. Terreno 3D con el cultivo creciendo y lluvia de IMERG en partículas.
  5. Teléfono del juez como control, por QR.
- Todo extra tiene alternativa con teclado y respeta la reducción de movimiento.

## 9. Accesibilidad (obligatoria en `/tool`, razonable en el resto)

- Todo el flujo se completa con teclado y el foco siempre se ve.
- HTML semántico; cada gráfico tiene texto equivalente y la tira tiene una tabla alternativa.
- Texto de 18 px o más; con zoom al 200 % nada se rompe.
- Contraste AA. Tramas además de color.
- `prefers-reduced-motion` respetado.
- Voz para preguntar y para escuchar el resultado (Web Speech API), siempre con alternativa en texto porque el soporte cambia según el navegador.
- Lenguaje llano, sin siglas en la pantalla del agricultor.
- Objetivos táctiles de 44 px o más. Diseño primero para teléfono.
- La última parcela consultada queda guardada en el dispositivo.
- Pruebas automáticas con axe en la integración continua, más una prueba manual con lector de pantalla el domingo.

## 10. Coordinación entre agentes

- Argon (chat de Antigravity) orquesta, audita y redacta órdenes de trabajo. Claude (CLI) construye. No se hablan: se coordinan por `/contracts/`, `PLAN.md`, `HUMANO.md` y este archivo.
- Antes de cada tarea se leen `AGENTS.md`, `PLAN.md` y el contrato. Al terminar se actualiza `PLAN.md` y se agrega la línea en `AI_USAGE.md`.
- Cambios pequeños, uno por tarea, con mensaje de commit que nombre la pista.
- Lo que escribe un modelo lo revisa el otro antes de entrar a la rama principal.
- En la laptop de 8 GB no corren a la vez el servidor de Next.js, el de FastAPI y las pruebas completas. Un proceso pesado a la vez.

## 11. Compuertas

| Cuándo | Condición |
| --- | --- |
| Sábado 10:00 | Contrato congelado; API de ejemplo desplegada |
| Sábado 14:00 | Un dato real en pantalla: `/tool` consume la API real para una parcela |
| Sábado 19:00 | Tres rotaciones comparables del caso real |
| Domingo 8:00 | Corte de modelos: el que no tenga métrica sale y entra su respaldo |
| Domingo 12:00 | Se congelan las funciones |
| Domingo 20:00 | Entregado |

Si una compuerta no se cumple a su hora, se recorta alcance; no se alarga la fase.
