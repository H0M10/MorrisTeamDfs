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

Quién: Hanniel (`@H0M10`, Motor/API), Checo (`@Checo-coder`, Datos + Modelos), `@Gicarrillo` (Herramienta `/tool`) y Alexis (`@alexishal8`, página en inglés, animaciones IA y video).

Qué la distingue de los demás equipos:

1. Aprende de lo que pasó en campos reales (OpenET con CDL), no solo de tablas.
2. Cada cifra dice de dónde viene, de cuándo, a qué escala y si es observada, modelada o supuesta.
3. Puede decir que no hay opción viable.
4. Incluye la revisión del técnico local como parte del flujo.
5. Reporta sus métricas aunque pierdan contra la línea base.

## Pista local: el espectáculo

Qué se entrega (ajustado a equipo de 4 personas):

- `/showcase`: zoom del globo a la parcela, gestos con la mano y animaciones visuales de apoyo con IA (sin datos inventados ni cifras `fixture`).
- `/engineer`: red en vivo con los pesos reales del modelo 3 (si queda entrenado), métricas e intervalos.
- `/remote`: congelado como esqueleto (Extra #5 recortado preventivamente).
- Pitch en español con demo en vivo y video de respaldo.

Quién: Alexis (`@alexishal8`: landing, gestos, globo, Modo Ingeniero, animaciones IA, video y pitch) en coordinación con `@Gicarrillo` (`/tool` y micro-visuales accesibles).

Orden de los extras; se cortan de abajo hacia arriba (recorte preventivo aplicado para 4 personas):

1. Gestos con la mano (se mantiene).
2. Zoom del globo a la parcela (se mantiene).
3. Red en vivo (solo si el modelo 3 está entrenado).
4. Terreno 3D con cultivo y lluvia (recortado preventivamente por equipo de 4).
5. Teléfono como control (`/remote` — recortado preventivamente por equipo de 4).

## Reglas entre las dos pistas

1. **La pista local solo lee la API.** No agrega campos al contrato después del sábado a las 10:00 sin aprobación de Hanniel.
2. **Si la pista local se cae, la herramienta sigue.** `/tool` no importa nada de `/showcase`, `/engineer` ni `/remote`, y no carga three ni MediaPipe.
3. **Todo lo que se muestra es real.** Ningún extra ni animación generada con IA anima datos inventados. Mientras la API esté en modo de ejemplo, la etiqueta "Datos de ejemplo" se ve también en la landing.
4. **Nadie del núcleo se presta a la pista local antes de la compuerta del sábado a las 19:00.** Después, solo si su pista ya cumplió.
5. **Si el domingo a las 8:00 falta algo de la pista global**, `@alexishal8` deja los extras como estén y apoya accesibilidad, textos en inglés y video.
6. **Todo extra tiene alternativa con teclado** y respeta la reducción de movimiento. Los gestos nunca son la única forma de hacer algo.

## Lo que una pista le da a la otra

| De | Para | Qué |
| --- | --- | --- |
| Local | Global | Las tomas del video salen de `/showcase` y `/engineer`. Un extra o clip visual bien hecho cuenta en creatividad y presentación |
| Global | Local | Las métricas y fichas de modelos son el contenido del Modo Ingeniero. La ficha de evidencia es la respuesta a "¿y eso es real?" |
| Ambas | Ambas | La misma frase de apertura y el mismo caso (la parcela de Diamond Valley) en el pitch, el video y la página |

## Demo local: plan para que no falle

- Laptop conectada a corriente, navegador con la GPU dedicada, pestañas ya abiertas.
- Red propia desde un teléfono por si falla la de la sede.
- La última evaluación queda guardada en el dispositivo, así `/tool` abre aunque la API tarde.
- Video de respaldo grabado el sábado a las 23:00 y otra vez el domingo tras congelar.
- Gestos: probar con la luz del lugar. Si la cámara falla, se usa el teclado sin comentarlo.
- Una persona maneja la demo y otra habla.

## Guion compartido (borrador, lo ajusta `@alexishal8`)

1. El problema en una frase, con el caso del reto.
2. La parcela desde el satélite: la tira de 36 meses.
3. Las restricciones del agricultor y las tres rotaciones.
4. Una cifra y su ficha: de dónde viene y a qué escala.
5. El momento visual: gestos con la mano, zoom del globo y animación de escala satelital.
6. Qué no sabemos y quién lo revisa.

Para el video global son 30 segundos: pasos 1, 2, 3 y 4, con una toma del paso 5.

## Estado

| Entregable | Pista | Dueño | Compuerta | Estado |
| --- | --- | --- | --- | --- |
| Contrato y fixtures v0.1.1 + API fixture | Global | `@H0M10` / Argon / Claude | Sábado 10:00 | Listo en local (falta desplegar Railway, H-02) |
| Caso real en `/tool` | Global | `@H0M10`, `@Gicarrillo` | Sábado 14:00 | Esqueleto `/tool` listo (31 tests axe); faltan controles y datos reales |
| Tres rotaciones comparables | Global | `@H0M10` + `@Checo-coder` | Sábado 19:00 | Motor físico y evaluador listos; falta convertidor tabla→contrato |
| Modelos con métrica | Global | `@Checo-coder` | Domingo 8:00 | Guiones GEE/XGBoost/ONNX/CQR listos; sin correr en nube (H-11, H-12), prioridad 1→4→3→2 |
| Accesibilidad probada | Global | `@Gicarrillo` | Domingo 12:00 | Base axe en verde; falta flujo completo y lector de pantalla |
| Página en inglés | Global | `@alexishal8` | Domingo 15:00 | Pendiente |
| Video de 30 segundos + animaciones IA | Ambas | `@alexishal8` + `@Gicarrillo` | Domingo 15:00 | Pendiente |
| Gestos | Local | `@alexishal8` | Sábado 19:00 | Botón cámara en crudo; falta bajar MediaPipe y lógica (H-08) |
| Globo a parcela | Local | `@alexishal8` | Domingo 12:00 | Lienzo diferido en crudo; falta escena 3D |
| Red en vivo | Local | `@alexishal8` | Domingo 12:00 | `/engineer` en crudo; depende de Modelo 3 |
| Terreno 3D con cultivo y lluvia (Extra #4) | Local | `@alexishal8` | Domingo 12:00 | Recortado (equipo de 4) |
| Teléfono como control (Extra #5) | Local | `@alexishal8` | Domingo 12:00 | Recortado (equipo de 4) |
| Pitch ensayado | Local | Equipo (4) | Domingo 18:00 | Pendiente |

Argon y Claude actualizan esta tabla junto con `PLAN.md` y `docs/status.json` (`python scripts/sync_board.py`).
