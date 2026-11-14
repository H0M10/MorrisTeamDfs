# /tool — La herramienta del agricultor

Dueño: Persona 4 (Herramienta).
Entrega: herramienta accesible para el agricultor y su técnico: tira de 36
meses, restricciones, tres rotaciones, ficha de evidencia y hoja imprimible.

## Qué hay hoy (esqueleto navegable)

| Ruta | Archivo | Estado |
| --- | --- | --- |
| `/tool` | `page.tsx` | Elige parcela piloto y la guarda en el dispositivo. Falta el mapa |
| `/tool/retrato` | `retrato/page.tsx` | Primera versión de la tira con su tabla alternativa |
| `/tool/restricciones` | `restricciones/page.tsx` | Solo muestra las restricciones. Faltan los controles |
| `/tool/rotaciones` | `rotaciones/page.tsx` | Estado y agua de cada rotación. Falta el calendario |
| `/tool/evidencia` | `evidencia/page.tsx` | Ficha de evidencia en texto. Faltan las fichas de cada cifra |
| `/tool/compartir` | `compartir/page.tsx` | Hoja imprimible. Falta el enlace y la revisión del técnico |

`layout.tsx` pone los pasos, "Paso N de 6" y anterior/siguiente.
`_components/steps.ts` define el orden. Lo pendiente está marcado en pantalla
con `<Pending>`.

## Qué construir, en orden

1. **Restricciones editables** (`restricciones/`): agua máxima, maquinaria,
   cultivos sin comprador y ventana de siembra. Al cambiar, llama
   `api.simulate()` y guarda el resultado para las pantallas siguientes. Hay que
   decidir dónde vive ese estado compartido (contexto en `layout.tsx` o
   `sessionStorage`).
2. **Calendario de 36 meses de las tres rotaciones** (`rotaciones/`): usa
   `sequence_36m` con `palette_token` y `pattern`. Trama además de color
   (Tierra con trama, Hoja sólido). Con tabla alternativa, como la tira.
3. **Caso sin opción viable**: ya se muestra el aviso y el motivo. Revisa que
   se entienda y que no aparezca ninguna recomendación.
4. **Ficha de evidencia completa** (`evidencia/`): cada cifra con
   `<MetricCard>` (tipo, fuente, fecha, escala). Los datos de 9 km o más se
   presentan como contexto regional, nunca como de la parcela.
5. **Mapa** (`/tool`): MapLibre GL con el polígono y el tamaño real del píxel
   de cada fuente (`parcel.native_pixel_footprints_m`). Cárgalo con
   `next/dynamic`.
6. **Compartir y revisión del técnico** (`compartir/`): `api.share()` para el
   enlace; `supabase.rpc("submit_review")` y `get_reviews` para la revisión
   (ver `/supabase/README.md`). Si Supabase falla, se desactivan y queda la
   impresión.
7. **Preguntar por voz y escuchar** (Web Speech API) sobre `api.ask()`,
   siempre con la alternativa en texto.
8. **Guardar la última evaluación** en el dispositivo, para abrir sin red.

## Reglas de esta carpeta

- Fondo blanco y texto negro. El color aparece solo donde hay un dato.
- Una decisión por pantalla. Lenguaje llano, sin siglas.
- Prohibido: degradados morados, fondo oscuro con neón, cuadrículas de
  tarjetas idénticas, etiquetas en mayúsculas espaciadas.
- No importes three, MediaPipe ni nada de `/showcase`, `/engineer`, `/remote`.
- Cada gráfico lleva texto equivalente. Texto de 18 px o más. Objetivos de 44 px.
- Corre `npm run test:a11y` antes de subir. Agrega tu pantalla a
  `tests/a11y.spec.ts` si creas una ruta nueva.
