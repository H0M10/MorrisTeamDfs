# PISTAS_PARALELAS.md — Jueces locales y jueces globales

Trabajamos para dos públicos al mismo tiempo. Los dos ven el mismo proyecto y la misma API, pero cada uno lo juzga por un medio distinto. Este archivo dice qué se construye para cada uno, quién lo lleva y qué pasa cuando compiten por tiempo.

## Los dos públicos

| | Jueces locales | Jueces globales |
| --- | --- | --- |
| Cómo nos ven | En persona, con demo en vivo y pitch | Solo por la página del proyecto, el video o las diapositivas y el repositorio |
| Idioma | Español | Inglés (el video puede ir en español con subtítulos en inglés) |
| Qué los mueve | Lo que se ve y se toca: 3D, gestos, su propio teléfono controlando la pantalla | Impacto, creatividad, validez, relevancia y presentación |
| Riesgo principal | Que la demo falle frente a ellos | Que el proyecto parezca igual a cientos de otros o no se sostenga científicamente |
| Qué decide | Pasar de la sede a la nominación global | Quedar entre los finalistas y ganadores |

Sin pasar el filtro local no hay evaluación global. Sin sustancia, pasar el filtro local no sirve de nada. Por eso son dos pistas y ninguna se abandona.

## Pista global: la sustancia

Qué se entrega:

- `/tool` funcionando con un caso real: una parcela de Diamond Valley, tres rotaciones, ficha de evidencia y la opción de "ninguna es viable".
- El caso de Querétaro en modo sin etiquetas, que muestra qué sabe y qué no sabe la herramienta fuera de EE. UU.
- Modelos con métrica contra su línea base y su ficha (`models/*/CARD.md`).
- Accesibilidad real en `/tool`, probada.
- Página del proyecto en inglés (`/docs/project_page.md`): problema, qué hace, datos usados con su escala, cómo se validó, límites, uso de IA.
- Video de 30 segundos (`/docs/video_script.md`).
- Repositorio público con `README.md` y `AI_USAGE.md`.

Quién: Datos, Modelos, Motor y API, Herramienta. La persona 6 escribe la página y dirige el video.

Qué la distingue de los demás equipos:

1. Aprende de lo que pasó en campos reales (OpenET con CDL), no solo de tablas.
2. Cada cifra dice de dónde viene, de cuándo, a qué escala y si es observada, modelada o supuesta.
3. Puede decir que no hay opción viable.
4. Incluye la revisión del técnico local como parte del flujo.
5. Reporta sus métricas aunque pierdan contra la línea base.

## Pista local: el espectáculo

Qué se entrega:

- `/showcase`: zoom del globo a la parcela, terreno 3D, gestos con la mano.
- `/engineer`: red en vivo con los pesos reales del modelo 3, métricas e intervalos.
- `/remote`: el teléfono del juez como control, por QR.
- Pitch en español con demo en vivo y video de respaldo.

Quién: persona 5 (landing, 3D, gestos, control remoto) y persona 6 (Modo Ingeniero, pitch).

Orden de los extras; se cortan de abajo hacia arriba:

1. Gestos con la mano.
2. Zoom del globo a la parcela.
3. Red en vivo (solo si el modelo 3 está entrenado).
4. Terreno 3D con cultivo y lluvia.
5. Teléfono como control.

## Reglas entre las dos pistas

1. **La pista local solo lee la API.** No agrega campos al contrato después del sábado a las 10:00 sin aprobación de Hanniel.
2. **Si la pista local se cae, la herramienta sigue.** `/tool` no importa nada de `/showcase`, `/engineer` ni `/remote`, y no carga three ni MediaPipe.
3. **Todo lo que se muestra es real.** Ningún extra anima datos inventados. Mientras la API esté en modo de ejemplo, la etiqueta "Datos de ejemplo" se ve también en la landing.
4. **Nadie del núcleo se presta a la pista local antes de la compuerta del sábado a las 19:00.** Después, solo si su pista ya cumplió.
5. **Si el domingo a las 8:00 falta algo de la pista global**, las personas 5 y 6 dejan los extras como estén y ayudan con accesibilidad, textos en inglés y video.
6. **Todo extra tiene alternativa con teclado** y respeta la reducción de movimiento. Los gestos nunca son la única forma de hacer algo.

## Lo que una pista le da a la otra

| De | Para | Qué |
| --- | --- | --- |
| Local | Global | Las tomas del video salen de `/showcase` y `/engineer`. Un extra bien hecho cuenta en creatividad y presentación |
| Global | Local | Las métricas y fichas de modelos son el contenido del Modo Ingeniero. La ficha de evidencia es la respuesta a "¿y eso es real?" |
| Ambas | Ambas | La misma frase de apertura y el mismo caso (la parcela de Diamond Valley) en el pitch, el video y la página |

## Demo local: plan para que no falle

- Laptop conectada a corriente, navegador con la GPU dedicada, pestañas ya abiertas.
- Red propia desde un teléfono por si falla la de la sede.
- La última evaluación queda guardada en el dispositivo, así `/tool` abre aunque la API tarde.
- Video de respaldo grabado el sábado a las 23:00 y otra vez el domingo tras congelar.
- Gestos: probar con la luz del lugar. Si la cámara falla, se usa el teclado sin comentarlo.
- Una persona maneja la demo y otra habla.

## Guion compartido (borrador, lo ajusta la persona 6)

1. El problema en una frase, con el caso del reto.
2. La parcela desde el satélite: la tira de 36 meses.
3. Las restricciones del agricultor y las tres rotaciones.
4. Una cifra y su ficha: de dónde viene y a qué escala.
5. El momento visual: gestos o el teléfono del juez.
6. Qué no sabemos y quién lo revisa.

Para el video global son 30 segundos: pasos 1, 2, 3 y 4, con una toma del paso 5.

## Estado

| Entregable | Pista | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| Contrato y fixtures v0.1.1 + API fixture | Global | Hanniel / Argon / Claude | Sábado 10:00 | Listo en local (falta desplegar Railway, H-02) |
| Caso real en `/tool` | Global | Hanniel, persona 4 | Sábado 14:00 | Esqueleto `/tool` listo (31 tests axe); faltan controles y datos reales |
| Tres rotaciones comparables | Global | Hanniel | Sábado 19:00 | Motor físico y evaluador listos; falta convertidor tabla→contrato |
| Modelos con métrica | Global | Personas 1 y 2 | Domingo 8:00 | Guiones GEE/XGBoost/ONNX/CQR listos; sin correr en nube (H-11, H-12) |
| Accesibilidad probada | Global | Persona 4 | Domingo 12:00 | Base axe en verde; falta flujo completo y lector de pantalla |
| Página en inglés | Global | Persona 6 | Domingo 15:00 | Pendiente |
| Video de 30 segundos | Ambas | Persona 6 | Domingo 15:00 | Pendiente |
| Gestos | Local | Persona 5 | Sábado 19:00 | Botón cámara en crudo; falta bajar MediaPipe y lógica (H-08) |
| Globo y terreno 3D | Local | Persona 5 | Domingo 12:00 | Lienzo diferido en crudo; falta escena 3D |
| Red en vivo | Local | Persona 6 | Domingo 12:00 | `/engineer` en crudo; depende de Modelo 3 |
| Teléfono como control | Local | Persona 5 | Domingo 12:00 | Guía Broadcast lista; bloqueado por Supabase (H-06) |
| Pitch ensayado | Local | Equipo | Domingo 18:00 | Pendiente |

Argon actualiza esta tabla junto con `PLAN.md`.
