# PLAN_DOMINGO.md — De herramienta que funciona a herramienta que gana

Domingo 15 de noviembre, redactado a las 03:20. Complementa `PLAN.md`; no lo reemplaza. Manda `AGENTS.md`.

- **Congelación de funciones:** 12:00. Lo que no esté en verde a esa hora se corta **de abajo hacia arriba** en este archivo.
- **Entrega:** 20:00 (límite oficial 23:59).
- **Regla de oro de este plan:** cada idea tiene que servirle de verdad a un agricultor, con datos reales o con el hueco declarado. Nada se agrega solo para la demo.
- Dueños sugeridos según `PLAN.md`: `/tool` @Gicarrillo, `/showcase` `/engineer` `/docs` @alexishal8, backend y `/frontend/src/lib` @H0M10 (Hanniel), datos @Checo-coder. Claude construye por encargo de cada dueño.

---

## 1. Qué harán los otros equipos y qué no ven

Somos unos 20 equipos globales con este reto, más los locales. Lo más probable:

| Lo que casi todos harán | Por qué es débil | Lo que hacemos nosotros |
| --- | --- | --- |
| Un chatbot con un modelo de lenguaje que "recomienda" cultivos | Inventa cifras; el juez no puede verificar nada | El modelo de lenguaje solo **enseña a usar la herramienta**; las cifras vienen del contrato con su ficha |
| Un clasificador entrenado con el dataset de Kaggle "crop recommendation" (N, P, K, pH, lluvia) | No usa datos de la NASA de la parcela; no es una rotación | Modelos medidos por valle, con línea base, incluido el que pierde |
| Mapa de NDVI y gráficas de POWER en un panel oscuro | Bonito, pero no responde "¿qué siembro y por qué?" | Una decisión por pantalla y tres rotaciones lado a lado |
| Tres tarjetas con un "puntaje" de pesos inventados | El agricultor no sabe de dónde sale el número | Orden según **sus** prioridades, sin puntaje inventado |
| Solo inglés, solo laptop | El agricultor está en el campo, con el teléfono y a pleno sol | Bilingüe, diseño para teléfono, modo sol |

**Lo que casi nadie va a resolver (y es real):**

1. **Las restricciones van antes que la recomendación.** Sin agua asignada, sin comprador o sin maquinaria, la rotación no existe. *Ya lo tenemos.* Hay que mostrarlo mejor.
2. **El año de transición.** La alfalfa es perenne; cambiarla tiene un momento y un costo. Debe aparecer como "información que falta", no esconderse.
3. **Quién decide.** El técnico o extensionista revisa y corrige. *Ya lo tenemos* (`/tool/revision`).
4. **Lo que el agricultor ya sabe.** Puede corregir su historial de cultivos en vez de aceptar lo que dice el satélite.
5. **Qué hacer después.** Una hoja impresa para llevar a la oficina local del USDA (NRCS) o al técnico, con las prácticas de conservación relacionadas.
6. **Quién usa la herramienta.** Gran parte de quienes trabajan el campo en EE. UU. habla español. Necesitan lenguaje llano, voz y letra grande.
7. **La incertidumbre a la vista.** "Rango probable" y "no lo sabemos" son información, no un defecto.

**La frase del pitch:** *"La herramienta que te dice lo que no sabe y te enseña a usarla."*

---

## 2. Prioridades (de más a menos importante)

**Avance (04:40):** P0-1, P0-2 y P0-3 **hechos** en `/tool/rotaciones` (calendario real desde `sequence_36m`, tabla con ficha por cifra, prioridades con orden lexicográfico; 47 pruebas en verde, 320 px sin desbordes). Límite conocido: varios cultivos comparten color y trama en el contrato (por ejemplo, tres cultivos verdes lisos); la tabla alternativa los distingue. Siguen P0-4 y P0-5.

Las prioridades P0 y P1 son el producto. P2 exprime lo ya construido. P3 es para los jueces y corre en paralelo (Alexis); es lo primero que se corta.

### P0 — Núcleo del reto y credibilidad (meta: 09:00)

| ID | Qué | Por qué | Cómo (real) | Dueño · carpeta | Listo cuando |
| --- | --- | --- | --- | --- | --- |
| **P0-1** | **Calendario real de 36 meses** | Hoy `RotationCalendar.tsx` pinta "Descanso Invernal / Cultivo Activo" fijo e igual para las tres rotaciones. **Es un dato falso en pantalla (rompe la regla 1)** y es la pieza central del reto | Leer `strategy.sequence_36m`; 36 celdas en 3 filas de 12 (un año por fila); color por familia de cultivo con la paleta y trama de Tierra en barbecho; las tres rotaciones alineadas mes con mes; tabla alternativa; textos de i18n | @Gicarrillo / Claude · `/tool` | Cada celda viene del contrato; axe en verde; se lee en un teléfono de 360 px |
| **P0-2** | **Tabla comparativa** de las tres rotaciones | El juez debe ver la comparación en 10 segundos | Filas: agua por año, diferencia frente a la actual, meses con suelo cubierto, días de helada y calor, efecto del cultivo anterior ("sin evidencia local" si así viene). Cada celda con su ficha (fuente, fecha, escala, tipo). La descartada aparece con su motivo, sin beneficios | @Gicarrillo / Claude · `/tool/rotaciones` | Todas las métricas de `metrics` visibles; en teléfono se ve como tarjetas apiladas |
| **P0-3** | **Prioridades del agricultor** ("¿Qué te importa más?") | El reto lo pide explícitamente y hoy falta | Ver §4. Solo frontend: ordena y resalta con métricas que ya existen; no hay puntaje inventado | @Gicarrillo / Claude · `/tool/restricciones` + `/tool/rotaciones` | Cambiar la prioridad reordena las rotaciones y explica por qué; queda guardada en el dispositivo y entra en la hoja para compartir |
| **P0-4** | **Suelo desnudo y meses vulnerables** | El reto lo nombra explícitamente; el dato ya está en el timeline (`ndvi`, `bsi`, `frost_days`, `heat_days`) | Ver §5. Marcas en la tira de la parcela y una frase resumen calculada por código | @Gicarrillo / Claude · `/tool/retrato` | Umbral declarado como supuesto; los íconos llevan texto y trama además del color |
| **P0-5** | **`/tool` responsivo** (teléfono primero) | Hoy `globals.css` solo tiene `@media` de movimiento e impresión | Barra de pasos compacta ("Paso 2 de 6" y un menú) por debajo de 640 px; tablas que se apilan o con desplazamiento horizontal y primera columna fija; mapa a 60vh; botones a todo lo ancho; agregar un viewport de 390×844 a las pruebas de Playwright con axe | @Gicarrillo / Claude · `/tool`, `globals.css`, `/frontend/tests` | Sin desplazamiento horizontal de página a 360 px ni con zoom al 200 % |

### P1 — Inclusión y la Guía (meta: 11:00)

| ID | Qué | Por qué | Cómo | Dueño · carpeta | Listo cuando |
| --- | --- | --- | --- | --- | --- |
| **P1-1** | **Perfil de accesibilidad** en la primera visita: "¿Cómo prefieres usar Field Shift?" | Inclusión real y configurable, no solo cumplir axe | Ver §6. Cinco interruptores guardados en el dispositivo y aplicados con atributos en `<html>`. Botón permanente "Ajustes de lectura" en el encabezado | Claude · `/frontend/src/lib` (Hanniel aprueba) + `globals.css` | Cada ajuste cambia la página entera; se puede saltar; funciona con teclado y lector de pantalla |
| **P1-2** | **Guía, capa 1 (sin IA):** recorrido por la pantalla y glosario | Es la base del agente y funciona aunque la IA falle o no haya señal | Cada elemento importante lleva `data-guide-id`; un registro por pantalla con la explicación llana en es/en escrita por el equipo; botón "Enséñame esta pantalla" que mueve el foco y resalta elemento por elemento; "¿Qué es esto?" junto a cada término (evapotranspiración, NDVI, humedad del suelo, intervalo, píxel) | Claude · `/tool/_components`, `/frontend/src/lib/i18n` | Recorrido completo en las 6 pantallas, con teclado, voz y movimiento reducido |
| **P1-3** | **Guía, capa 2: agente tutorial con modelo de lenguaje** | Diferenciador: no es un chatbot de cultivos, es un **maestro de la interfaz** que actúa sobre la pantalla | Ver §3. Ruta nueva `POST /api/v1/guide` en el backend; la llave solo en Railway | Hanniel / Claude · `/backend`, `/tool/_components` | Responde, resalta y lleva a la pantalla correcta; si falla o se acaba la cuota, cae a la capa 1 sin que el usuario note un error |
| **P1-5** | **Unidades de EE. UU.** (pulgadas, acres, acre-pies) | Un agricultor de Nevada no piensa en mm ni en ha | Ver §6.5. Conversión en el frontend, sin cambiar el contrato | Claude · `/frontend/src/lib` | Cada cifra de agua y área cambia con el interruptor y su ficha dice "convertido de mm" |
| **P1-6** | **Voz completa:** preguntar, escuchar y llenar los límites hablando | Mucha gente prefiere hablar que escribir; también sirve a quien no ve o no puede escribir | Ver §6.6. El número dictado tiene que estar en la transcripción y se confirma antes de aplicarlo | Claude · `/tool/_components`, `/backend` | Se completa el paso de límites solo con la voz, con confirmación |
| **P1-4** | **Portada real en `/`**, quitar `/remote`, página `/accesibilidad` | La portada es lo primero que ve el juez; `/remote` es un volcado de JSON que confunde | Portada: la frase, un botón grande "Analiza tu campo" y uno secundario "Ver presentación". `/remote` sale de la portada (L-05 ya estaba recortado). `/accesibilidad`: declaración de conformidad WCAG 2.2 AA, qué se probó (axe, teclado, lector de pantalla), límites conocidos y cómo reportar un problema | Claude · `/frontend/src/app` | Lighthouse de accesibilidad en 100 en las tres páginas |

### P2 — Exprimir lo que ya construimos (meta: 12:00)

| ID | Qué | Por qué sirve de verdad | Cómo | Dueño |
| --- | --- | --- | --- | --- |
| **P2-1** | **"¿Y si me recortan el agua?"**: control deslizante del agua asignada | El reto sugiere "scenario sliders"; en Diamond Valley el recorte de agua es un riesgo real | Mueve `max_water_mm_year` y llama a `/simulate`, que ya existe. Muestra qué rotación se cae y por qué. Lleva la etiqueta "Escenario" | @Gicarrillo / Claude · `/tool/restricciones` |
| **P2-2** | **"Siguiente paso"** en la ficha de "Más suelo" | Convierte la sugerencia en una acción | Texto fijo, sin cifras: "Esta rotación se parece a las prácticas de conservación de NRCS *Conservation Crop Rotation* (código 328) y *Cover Crop* (código 340). Pregunta en tu oficina local del USDA si calificas para apoyo." Enlace a la página de la práctica. Se verifica el código antes de publicar | Claude · `/tool/evidencia` |
| **P2-3** | **Lo que sembraron tus vecinos** | Comunidad con datos reales y sin datos personales | Porcentaje de cada cultivo por año en los 59 pivotes de Diamond Valley según USDA CDL (ya están en el backend). Para un campo en vivo, los campos de cultivo dentro de 5 km según CDL. Se presenta como "lo que pasó cerca", nunca como recomendación | Hanniel / Claude · `/backend` + `/tool/retrato` |
| **P2-4** | **"¿Es correcto tu historial?"** | El agricultor conoce su campo mejor que el satélite; lo coloca como experto | Muestra la lectura del Modelo 3 por año, con botones "Sí" o "Corregir"; la corrección se usa como historial declarado (el respaldo del Modelo 3 ya existe) y queda en la hoja para el técnico | @Gicarrillo / Claude · `/tool/retrato` |
| **P2-5** | **Hoja para compartir mejorada** | Es lo que el agricultor imprime y lleva a la reunión | Agrega las prioridades, la tabla comparativa, los meses vulnerables, un QR al enlace y la fecha de los datos | Claude · `/tool/compartir` |
| **P2-6** | **Si se cae la señal** | En el campo la señal falla | Guardar en el dispositivo la última evaluación completa (no solo el id). Si la API no responde, mostrarla con el aviso "Sin conexión: último análisis del <fecha>". Sin service worker; no se promete que funcione sin red desde cero | Claude · `/frontend/src/lib` |

### P3 — Para los jueces, en paralelo (Alexis). Lo primero que se corta

| ID | Qué | Nota |
| --- | --- | --- |
| **P3-1** | Landing con historia que avanza con el scroll: espacio → satélite → valle → tu campo → tira de 36 meses → tres rotaciones → ficha → "un técnico lo revisa" | Los clips de Higgsfield solo como fondo, con la etiqueta "Ilustración". Las cifras salen de la API |
| **P3-2** | Red neuronal "pensando": entran los 36 colores reales → GRU → la atención se enciende mes por mes → probabilidad por clase | Mejor versión: correr el ONNX del Modelo 3 en el navegador con `onnxruntime-web`. Los nodos se etiquetan como esquema; los pesos de atención como reales y no causales |
| **P3-3** | Precio de referencia del mercado (NASS QuickStats) por cultivo | **Cambio de contrato: lo aprueba Hanniel.** Solo el precio publicado con su ficha; nunca ganancia estimada. Si no se aprueba antes de las 10:00, la prioridad "Vender lo que siembro" muestra "información que falta" |
| Cortado | Terreno 3D (L-04) y control remoto por teléfono (L-05) | Ya recortados el sábado |

**Después de las 12:00:** video de 30 s (grabación real de la pantalla para los datos; Higgsfield solo como fondo; subtítulos obligatorios), 7 diapositivas, `docs/project_page.md` en inglés, sección "Cómo usamos la IA" (la Guía y su barandilla son el mejor ejemplo), prueba con lector de pantalla (H-21) y ensayo del pitch.

---

## 3. La Guía: diseño del agente tutorial (P1-2 y P1-3)

**Qué es:** un maestro de la interfaz. Explica qué es cada cosa, por qué importa y cómo usarla, y **actúa sobre la pantalla**: resalta, mueve el foco, cambia de paso. **No es** un asesor de cultivos ni produce cifras.

**Cómo encaja con las reglas:** `AGENTS.md` §5 permite que el modelo de lenguaje "solo traduzca y redacte a partir de campos del contrato". La Guía explica la interfaz y los términos, y lee campos del contrato que le pasa el código. `/ask` sigue siendo el enrutador determinista para las preguntas sobre datos.

**Arquitectura:**

1. **Capa 1, determinista (siempre disponible):** el registro de `data-guide-id` por pantalla, más textos llanos escritos y revisados por el equipo. Recorrido paso a paso y glosario.
2. **Capa 2, modelo de lenguaje:** `POST /api/v1/guide` con `{screen, visible_guide_ids, profile, question, lang, parcel_id}`. El backend arma el contexto con los textos de la capa 1 de esa pantalla y los campos del contrato visibles, y pide una respuesta **estructurada**:
   ```json
   { "answer": "…", "highlight": ["strip", "legend-bare"], "go_to_step": null, "terms": ["ndvi"] }
   ```
   El frontend ejecuta las acciones: resaltar, mover el foco, ofrecer "Ir a Rotaciones", abrir el término del glosario.
3. **Enrutado:** si la pregunta es sobre datos ("¿cuánta agua usa la alfalfa?"), se manda a `/ask`. Si es sobre uso o significado ("¿qué es esta barra amarilla?"), va a `/guide`.

**Barandillas (no negociables):**

- **Cifras:** el prompt prohíbe números. Un validador en el backend revisa la respuesta: si contiene un número que no está literalmente en los campos enviados, se descarta y se responde con la capa 1. Las cifras que se mencionan las pinta el frontend desde el contrato, con su ficha.
- **Consejo agronómico:** no recomienda rotaciones ni dosis; remite a la ficha de evidencia y al técnico.
- **`highlight` y `go_to_step`:** solo se aceptan ids que existen en la pantalla (lista blanca).
- **Llave del modelo:** solo en la variable de Railway (`GUIDE_LLM_API_KEY`), nunca `NEXT_PUBLIC_`. Se agrega a `.env.example` sin valor.
- **Fallos:** tiempo máximo de 8 s, límite de peticiones por sesión, caché por pantalla y pregunta normalizada. Si se acaba la cuota o falla, la capa 1 responde sin mostrar error.
- **Privacidad:** las preguntas no se guardan en la base de datos y no se piden datos personales.
- **Perfil:** si está activo "lenguaje sencillo", la respuesta usa frases cortas y sin siglas. Si está activo "leer en voz alta", se lee con Web Speech API. La entrada por voz reutiliza la de `AskBox`.
- **Accesibilidad del resaltado:** el foco se mueve al elemento, se anuncia en `aria-live`, Esc cierra la Guía y el resaltado no se anima si se pidió reducir el movimiento.

**Proveedor:** Gemini u otro, lo decide Hanniel (H-24). Con cualquiera vale el mismo contrato de respuesta y las mismas barandillas.

---

## 4. Prioridades del agricultor (P0-3)

La pantalla "Restricciones" pasa a llamarse **"Tus límites y lo que te importa"**: primero los límites (descartan) y después las prioridades (ordenan).

El agricultor elige hasta tres prioridades, en orden:

| Prioridad | Métrica del contrato que usa | Si no hay dato |
| --- | --- | --- |
| Ahorrar agua | `annual_water_mm`, `water_delta_vs_current_mm` | — |
| Cuidar el suelo | `soil_cover_months_36m` | — |
| Menos riesgo de helada y calor | `frost_risk_days_year` + `heat_risk_days_year` | — |
| Lo que pasó en campos parecidos | `prior_crop_vigor_delta_pct` | "Sin evidencia local" (Modelo 2 pierde: −6.3 %) |
| Vender lo que siembro | precio de NASS si se aprueba P3-3 | "Información que falta: consulta a tu comprador" |

**Orden:** primero las rotaciones viables y después las descartadas, con su motivo. Entre las viables, se ordena por la primera prioridad; si empatan, por la segunda. **No hay puntaje combinado ni pesos inventados.**

**Por qué este método (decisión técnica, domingo 03:40):** es un orden lexicográfico, un método clásico de decisión con varios criterios. Lo elegimos frente a una suma con pesos por tres razones:
- **Se explica en una frase:** "va primero porque elegiste agua".
- **No obliga a inventar** cuánto vale un mes de suelo cubierto en milímetros de agua.
- **El agricultor lo controla:** cambia el orden y ve el efecto al momento.

La limitación (una mejora mínima en la primera prioridad gana a una enorme en la segunda) se compensa mostrando siempre la tabla completa al lado.

**Explicación visible:** "Va primero porque elegiste *Ahorrar agua*: usa <X> mm menos que tu rotación actual (OpenET y FAO-56, modelado)". La cifra sale del contrato con su ficha. Cada rotación lleva insignias de texto, por ejemplo "Mejor en suelo".

Las prioridades se guardan en el dispositivo, entran en la hoja para compartir y el técnico las ve en la revisión.

---

## 5. Suelo desnudo y meses vulnerables (P0-4)

Datos: `timeline[]` ya trae `ndvi`, `bsi`, `frost_days` y `heat_days` por mes. **No hace falta cambiar el contrato.**

- **Suelo desnudo:** un mes cuenta como sin cobertura si `ndvi < 0.2` **y** `bsi > 0` (umbral declarado en pantalla como supuesto, con una nota para el técnico). Esos meses se marcan en la tira con trama de Tierra y una etiqueta de texto.
- **Helada y calor:** ícono con texto ("3 días de helada") en los meses con `frost_days > 0` o `heat_days > 0`, con la nota "dato regional de NASA POWER, unos 50 km" (regla 5: escala).
- **Frase resumen, calculada por código:** "Tu campo estuvo sin cobertura 9 de 36 meses, sobre todo de noviembre a marzo. Los días de calor se concentran en julio, cuando tu cultivo actual está en el campo."
- **En el calendario de rotaciones (P0-1):** los meses sin cultivo de cada rotación con la misma trama, para comparar a simple vista con `soil_cover_months_36m`.
- **Alternativa accesible:** la tabla de la tira suma las columnas "Cobertura" y "Helada o calor".

---

## 6. Accesibilidad real: con qué navega la gente hoy y qué hacemos para cada caso

Es una base del proyecto y del pitch. No inventamos adaptaciones: la página tiene que funcionar con las **tecnologías de apoyo que la gente ya usa**. Nosotros no reemplazamos esas herramientas; las respetamos.

### 6.1 Tecnologías de apoyo que existen y cómo cumplimos con cada una

| Persona | Qué usa hoy (real) | Qué tiene que hacer nuestra página | Cómo lo probamos |
| --- | --- | --- | --- |
| Ciega | Lectores de pantalla: **NVDA** (gratis, Windows), **JAWS** (Windows), **VoiceOver** (iPhone, Mac), **TalkBack** (Android), Narrador (Windows) | HTML semántico, encabezados en orden, nombres accesibles, `aria-live` en los cambios, tabla alternativa de cada gráfico, foco que no se pierde al cambiar de paso | NVDA + Chrome en la laptop; TalkBack o VoiceOver en un teléfono real (H-21) |
| Baja visión | Zoom del navegador, lupa del sistema (ZoomText, Lupa de Windows, Zoom de iOS), modo de alto contraste de Windows, letra grande del sistema | Diseño que fluye con zoom al 400 % (WCAG 1.4.10), unidades `rem`, respeto a `forced-colors`, contraste AA, modo sol propio | Zoom 200 % y 400 %; Windows con contraste alto activado |
| Daltonismo | Ninguna herramienta; depende de la página | Nada se comunica solo con color: tramas (ya las da el contrato: `solid`, `hatch`, `dots`, `stripe`) y texto | Chrome DevTools → Rendering → "Emulate vision deficiencies" |
| Motora (temblor, una mano, guantes de trabajo) | Teclado, **Switch Access** (Android), **Control por botón** (iOS), joysticks, punteros de cabeza | Todo con teclado, orden de tabulación lógico, objetivos de 44 px o más, nada que dependa de arrastrar (el mapa tiene alternativa con botones o búsqueda) | Recorrer `/tool` completo solo con Tab, Enter y flechas |
| Motora o sin manos | Control por voz: **Voice Access** (Windows 11 y Android), **Control por voz** (iOS y macOS), Dragon | La etiqueta visible de cada botón coincide con su nombre accesible (WCAG 2.5.3, "Label in Name"), para que "haz clic en Siguiente" funcione | Voice Access de Windows 11 diciendo los nombres de los botones |
| Sorda o con hipoacusia | Subtítulos, transcripción en vivo del sistema (Live Caption de Android y Chrome) | Nada solo por audio; toda respuesta de voz también aparece en texto; el video lleva subtítulos | Revisar que cada respuesta hablada tenga su texto |
| Cognitiva, dislexia, baja alfabetización | Lectores en voz alta (Seleccionar para pronunciar, Lector inmersivo de Edge), lenguaje sencillo | Modo lenguaje sencillo, frases cortas, una decisión por pantalla, íconos con texto, tipografía **Atkinson Hyperlegible** (diseñada por el Braille Institute para baja visión), sin límites de tiempo | El Lector inmersivo de Edge lee la página sin basura |
| Vestibular, epilepsia | Ajuste "reducir movimiento" del sistema | `prefers-reduced-motion` respetado y un interruptor propio; nada parpadea más de 3 veces por segundo | Activar "reducir movimiento" en el sistema |
| Uso en el campo (no es discapacidad, pero limita igual) | Teléfono, sol directo, mala señal | Modo sol, diseño para teléfono, último análisis guardado | Teléfono real afuera |

### 6.2 Herramientas y repositorios que usamos para llegar ahí

- **Ya en el proyecto:** `@axe-core/playwright` (Deque) en la integración continua.
- **Agregar hoy (gratis):**
  - `eslint-plugin-jsx-a11y`: detecta errores de accesibilidad mientras se escribe el código.
  - Lighthouse (Chrome) y **Accessibility Insights for Web** (Microsoft): su "Assessment" guía las pruebas manuales.
  - **WAVE** (WebAIM): revisión visual rápida.
- **Para el agente que construye:** Deque publica **axe MCP Server** (`github.com/dequelabs/axe-mcp-server-public`), que analiza páginas y propone arreglos desde Claude Code. **Requiere una suscripción de pago a Axe DevTools.** Si nadie del equipo la tiene, nos quedamos con axe en Playwright, que ya cubre el análisis automático.
- **Componentes:** los patrones del W3C (*WAI-ARIA Authoring Practices Guide*) para el diálogo del perfil, las pestañas y el menú de pasos. No se agrega una biblioteca nueva a estas horas.

### 6.3 Por qué importa (datos para el pitch, con fuente)

- **Idioma de quienes trabajan el campo:** según la National Agricultural Workers Survey 2019–2020 del Departamento de Trabajo, el 62 % prefiere hablar en español y el 25 % en inglés. Un 10 % se identifica como indígena y un 1 % prefiere una lengua indígena ([NCFH, NAWS](https://ncfh.org/naws-fact-sheet.html)).
- **La norma es ley para quien adoptaría la herramienta:** la regla de la ADA Título II (Departamento de Justicia, 2024) exige WCAG 2.1 AA en la web de gobiernos estatales y locales, y eso incluye a las universidades públicas que dan extensión agrícola. En abril de 2026 la primera fecha se pasó a abril de 2027 para entidades de 50 000 habitantes o más ([Venable](https://www.venable.com/insights/publications/2026/04/ada-title-ii-website-accessibility-regulations), [UNC SOG](https://www.sog.unc.edu/blogs/coates-canons/understanding-new-ada-web-accessibility-requirements-state-and-local-governments-1)). Nosotros apuntamos a WCAG 2.2 AA, un nivel más alto.
- **Lo que no prometemos:** traducción a lenguas indígenas (mixteco, zapoteco, triqui). No tenemos traducciones verificadas y no las vamos a inventar con IA. Lo declaramos como "información que falta" y lo cubren parcialmente la voz y los íconos.

### 6.4 Idiomas y lenguaje sencillo

- **Español e inglés** en toda la interfaz (ya existe), con el cambio de idioma visible en el encabezado y recordado en el dispositivo.
- **Lenguaje sencillo** como interruptor del perfil: cada texto de i18n puede tener una versión `plain` corta. Se escribe a mano siguiendo las guías federales de lenguaje llano (plainlanguage.gov): frases de menos de 15 palabras, voz activa, la acción primero.
- **Sin siglas en la pantalla del agricultor** (`AGENTS.md` §9): "agua que usó tu campo, medida por satélite" en vez de "ET de OpenET". Las siglas solo aparecen en la ficha de la fuente.

### 6.5 Unidades del agricultor de EE. UU. (P1-5, nuevo)

El contrato usa mm y ha, pero un agricultor de Nevada piensa en **pulgadas de agua, acres y acre-pies** (los derechos de agua de Nevada se expresan en acre-pies). Mostrar solo mm es una barrera real.

- Interruptor "Unidades: EE. UU. / métricas", recordado en el dispositivo. Por defecto: EE. UU. si el idioma es inglés, métricas si es español; se puede cambiar.
- Conversión exacta en el frontend: 1 pulgada = 25.4 mm; 1 ha = 2.4711 acres; agua por año en acre-pies por acre = pulgadas ÷ 12. El valor original y su ficha no cambian; la ficha dice "convertido de mm".
- **No cambia el contrato.**

### 6.6 Voz: preguntar, escuchar y llenar con la voz

Mucha gente prefiere hablar que escribir. La voz es una forma completa de usar la herramienta, no un adorno:

1. **Preguntar por voz:** botón de micrófono grande en la Guía y en "Pregunta" (Web Speech API, que ya se usa en `AskBox`). Lo que se oyó se muestra en texto antes de enviarlo.
2. **Escuchar la respuesta:** toda respuesta se puede leer en voz alta, y en el perfil se puede activar que se lea sola. Siempre queda también en texto.
3. **Llenar con la voz:** "Tengo 24 pulgadas de agua al año y no tengo comprador de papa". La Guía responde con una acción estructurada `set_constraint` (por ejemplo, agua máxima: 24 pulgadas).
   - **Barandilla:** el número tiene que aparecer en lo que dijo la persona (se compara con la transcripción); el modelo no puede poner un número propio.
   - **Confirmación:** antes de aplicarlo, "Escuché: agua máxima 24 pulgadas al año. ¿Lo aplico?" con los botones Sí y Corregir (y respuesta por voz).
   - **Es un dato declarado** por el agricultor, no inventado: entra a `/simulate` como cualquier restricción.
4. **Navegar con la voz:** "siguiente", "atrás", "léeme esto". Frases fijas, sin IA, para que funcione aunque falle la llave.
5. **Soporte:** Web Speech API funciona en Chrome, Edge y Safari, pero no igual en todos. Si no hay soporte, el botón de micrófono no aparece y todo sigue por texto (`AGENTS.md` §9).

### 6.7 Diseño para este público (lo que dice la práctica, aplicado)

- **Teléfono primero**, con una mano: acciones principales abajo, al alcance del pulgar.
- **Al aire libre:** contraste alto y nada de grises claros para texto.
- **Guantes y manos ocupadas:** objetivos grandes y botones con separación.
- **Señal mala:** pantallas ligeras; el mapa 3D y la cámara nunca son obligatorios.
- **Confianza:** decir de dónde sale cada cifra, en una línea y en palabras llanas, con el detalle a un toque ("Ver de dónde sale").
- **El agricultor manda:** puede corregir su historial, sus límites y sus prioridades; el técnico revisa. La herramienta sugiere, no decide.

### 6.8 Perfil de accesibilidad (P1-1)

Aparece en la primera visita como un diálogo que se puede saltar, y queda siempre en "Ajustes de lectura".

| Ajuste | Para quién | Efecto |
| --- | --- | --- |
| Letra más grande (18 → 22 → 26 px) | Baja visión, adultos mayores | Escala la tipografía base; el diseño no se rompe (es la misma prueba que el zoom al 200 %) |
| Modo sol / alto contraste | Baja visión, **uso al aire libre** | Negro sobre blanco puro, bordes de 2 px, tramas más marcadas, sin grises claros |
| Lenguaje sencillo | Baja alfabetización, discapacidad cognitiva, segunda lengua | Usa los textos cortos de i18n (`plain`) y oculta los detalles técnicos detrás de "Ver más" |
| Leer en voz alta | Ceguera, baja alfabetización | Botón "Escuchar esta pantalla" en cada paso; la Guía responde con voz |
| Menos movimiento | Vestibular, epilepsia, distracción | Fuerza el modo de movimiento reducido aunque el sistema no lo pida |

Para personas sordas: nada se comunica solo por sonido, y el video lleva subtítulos. Para discapacidad motora: teclado completo, objetivos de 44 px y voz para preguntar (ya existen). Todo se documenta en `/accesibilidad`.

---

## 7. Lo que no se hace

- Ninguna cifra de ganancia, rendimiento ni ahorro producida por un modelo de lenguaje.
- Ningún chatbot que recomiende cultivos.
- Ningún puntaje combinado con pesos inventados.
- Nada de mostrar los clips de Higgsfield como si fueran datos.
- Ningún dato `fixture` en el video, la página del proyecto ni el pitch.
- Que `/showcase` no se coma tiempo de P0 ni de P1.

---

## 8. Pedidos para personas (pasar a `HUMANO.md`)

- **H-24 (Hanniel, antes de las 08:00):** decidir el proveedor de la Guía, conseguir la llave y ponerla en Railway como `GUIDE_LLM_API_KEY`. Sin llave, P1-3 se queda en la capa 1 y no pasa nada.
- **H-25 (Hanniel, antes de las 10:00):** aprobar o descartar el cambio de contrato para el precio de NASS (P3-3) y conseguir la llave gratuita de QuickStats si se aprueba.
- **H-26 (alguien del equipo):** verificar los códigos de práctica de NRCS (328 y 340) y sus enlaces antes de publicar P2-2.
- **H-21 (ya existe):** prueba con lector de pantalla. Agregar: prueba en un teléfono real, al sol, con el modo sol.

---

## 9. Horario propuesto

| Hora | Qué |
| --- | --- |
| 03:30–05:30 | P0-1 calendario real y P0-2 tabla comparativa (lo primero: quita el dato falso) |
| 05:30–07:00 | P0-4 suelo desnudo y meses vulnerables, P0-3 prioridades |
| 07:00–08:30 | P0-5 responsivo y pruebas con viewport de teléfono |
| 08:30–10:30 | P1-1 perfil, P1-2 Guía capa 1, P1-4 portada y `/accesibilidad` |
| 10:00–11:30 | P1-3 Guía capa 2 (si H-24 está listo) |
| 11:00–12:00 | P2 en orden; a las 12:00 se corta lo que falte |
| En paralelo | Alexis: P3-1 y P3-2 en `/showcase` y `/engineer` |
| 12:00–20:00 | Video, diapositivas, página del proyecto, IA, lector de pantalla, ensayo |

Un proceso pesado a la vez en las laptops de 8 GB: no corren a la vez Next.js, FastAPI y las pruebas completas.
