# /tool — La herramienta del agricultor

Dueño: `@Gicarrillo` (Herramienta).
Entrega: herramienta accesible para el agricultor y su técnico: tira de 36
meses, restricciones, tres rotaciones, ficha de evidencia y hoja imprimible.

## Qué hay hoy

| Ruta | Archivo | Qué hace |
| --- | --- | --- |
| `/tool` | `page.tsx`, `_components/FieldPicker.tsx`, `_components/ParcelMap.tsx` | "¿Dónde está tu campo?": pestaña **Marcar mi campo** (mapa de satélite, ubicación del teléfono o búsqueda, pivote por tamaño o esquinas, análisis en vivo con `api.analyze`) y pestaña **Ver un campo de ejemplo** (59 pivotes de Diamond Valley y casos del reto). Guarda el campo en el dispositivo |
| `/tool/retrato` | `retrato/page.tsx`, `_components/ModelReadings.tsx` | Tira de 36 meses con tabla alternativa y "Lo que leen los modelos" (Modelo 3 y Dynamic World) |
| `/tool/restricciones` | `restricciones/page.tsx`, `_components/ConstraintControls.tsx` | Restricciones editables con los códigos del motor; lo declarado se guarda por parcela y todas las pantallas usan `/simulate` |
| `/tool/rotaciones` | `rotaciones/page.tsx`, `_components/RotationCalendar.tsx` | Tres rotaciones con calendario de 36 meses, tramas y caso sin opción viable |
| `/tool/evidencia` | `evidencia/page.tsx`, `_components/AskBox.tsx` | Fichas de evidencia y preguntas por texto o voz a `/api/v1/ask` |
| `/tool/compartir` | `compartir/page.tsx`, `_components/ShareSummary.tsx` | Hoja imprimible, lectura en voz alta y enlace con token |
| `/tool/revision` | `revision/page.tsx` | Vista del técnico: aprueba, corrige o descarta, sin datos personales |

`layout.tsx` pone los pasos, "Paso N de 6" y anterior/siguiente (la vista del
técnico no es un paso). `_components/steps.ts` define el orden.

## Pendiente

- Prueba manual con lector de pantalla y voz en teléfono (`HUMANO.md`, H-21).
- Probar "Usar mi ubicación" en un teléfono real.

## Reglas de esta carpeta

- Fondo blanco y texto negro. El color aparece solo donde hay un dato.
- Una decisión por pantalla. Lenguaje llano, sin siglas.
- Prohibido: degradados morados, fondo oscuro con neón, cuadrículas de
  tarjetas idénticas, etiquetas en mayúsculas espaciadas.
- No importes three, MediaPipe ni nada de `/showcase`, `/engineer`, `/remote`. El mapa es MapLibre GL (`src/lib/mapStyle.ts`); su worker se copia a `public/maplibre/` al compilar.
- Cada gráfico lleva texto equivalente. Texto de 18 px o más. Objetivos de 44 px.
- Corre `npm run test:a11y` antes de subir. Agrega tu pantalla a
  `tests/a11y.spec.ts` si creas una ruta nueva.
