# Clip opcional de la presentación

Archivo: `frontend/public/clips/hf-01-orbit-valley.mp4`.
La landing lo detecta y muestra con controles, sin reproducción automática.
Sin archivo, la sección se oculta: no hay espacios vacíos ni nombres de archivo en pantalla.

## Escena para crear en Higgsfield

6–8 segundos, 16:9, 1080p, sin audio, texto, logotipos ni cifras.

Prompt sugerido:
"Cinematic scientific illustration, a continuous slow camera descent from a low Earth orbit view of the arid western United States to a generic irrigated valley with circular center-pivot fields. Natural earth tones, realistic daylight, restrained documentary cinematography. End on a wide overhead composition of fields. No readable text, no logos, no charts, no invented satellite interface, no measurable claims. This is a conceptual illustration, not documentary footage of a specific farm. Smooth slow motion, no flashing."

La etiqueta visible declara que es ilustración generada con IA y no representa la parcela consultada ni una medición. El equivalente textual describe la escena. No incorporar una narración sin añadir subtítulos/transcripción.

## Recorrido para exponer

1. Reto explícito y propósito.
2. Campo conocido: consultar API, periodo histórico y fuentes. Si la API falla, reintentar; no simular éxito.
3. Cambiar el agua y comprobar el escenario. Comparar viabilidad y abrir evidencia.
4. Selector de modelos: propósito, métricas contra la línea base y visualización propia. M3 usa red esquemática; los valores de salida y atención llegan de API.
5. Motor físico: fórmulas, supuestos y restricciones.
6. Inclusión y Guía: abrir herramienta y mostrar teclado, texto/voz y ajustes.
7. Límites, impacto buscado, validación pendiente y enlaces verificables.

La evaluación y simulación se ejecutan bajo demanda; el historial 2022–2024 no es una transmisión en directo. El modelo 5 obtiene su estado y métrica de `/health`, y sus secuencias finales del contrato; no se inventan probabilidades internas. El estado `trained` no significa que un modelo supere la línea base.

## Estructura actual: presentación orbital por rutas

- `/`: portada e índice. Sin cargar datos ni WebGL antes de entrar al caso o modelos.
- `/presentacion/reto`: propósito, respuesta al reto y los cuatro criterios de la rúbrica. No publica puntuaciones esperadas.
- `/presentacion/campo`: evaluación y escenario de agua mediante la API.
- `/presentacion/modelos/1` a `/5`: un método y una animación por ruta.
- `/presentacion/modelos/physics`: serie de ET y fórmulas FAO-56.
- `/presentacion/personas`: agricultor, accesibilidad y tutor.
- `/presentacion/evidencia`: impacto buscado, resultados, fuentes y límites.

La parcela se conserva al navegar entre capítulos de `/presentacion`.

### Animación neuronal de referencia

Se adaptó el HTML proporcionado por el usuario (referencia CodeTap), conservando sus generadores de esfera cristalina, hélice y red fractal, sus shaders de nodos/conexiones, pulsos y OrbitControls. Se redujo la paleta a tonos gris azulados y se sirve en `frontend/public/visuals/neural-reference.html`.

Las dependencias se copian de la versión bloqueada de Three.js mediante `scripts/copy-reference-vendor.mjs` en predev/prebuild; la animación no necesita CDNs ni fuentes externas. El directorio generado `public/visuals/vendor/` no se versiona.

La geometría de referencia es una ilustración interactiva: no equivale a los pesos de la GRU ni a su arquitectura exacta. Probabilidades, pesos de atención y métricas medidas se muestran por separado con la API. El perfil de movimiento reducido pausa la animación; también hay controles dentro del visor. Los demás modelos tienen animaciones SVG de su mecanismo o de series reales, con pausa y equivalente textual.

Las notas de defensa aportadas por el equipo se usan como guía de contenido, no como evidencia. No se incorporaron promesas de puntuación, afirmaciones de exclusividad, cifras de mercado o argumentos legales sin verificación independiente.
