# /showcase — Landing para los jueces

Dueño: Alexis (`@alexishal8` — Landing, Globo, Gestos y Animaciones IA).
Entrega: landing con zoom del globo, terreno 3D y control por gestos, con
alternativa de teclado y respeto a `prefers-reduced-motion`.

## Qué hay hoy

- `page.tsx`: lee la evaluación (API o copia local) y la pinta en crudo, con la
  etiqueta "Datos de ejemplo". Botones y flechas izquierda/derecha recorren los meses.
- `_components/Scene.tsx`: lienzo de `@react-three/fiber` con un cuadro plano
  del color real del mes elegido. Es el único archivo que importa three y llega
  al navegador con carga diferida. Con movimiento reducido no gira.
- `_components/GestureButton.tsx`: activa la cámara y carga MediaPipe solo tras
  pulsar el botón. Un pellizco avanza un mes; el botón vuelve a apagar la cámara.

Nada de esto es el diseño final. Las animaciones se ajustan mirando y las
dirige una persona: las decisiones visuales abiertas están en `HUMANO.md` (H-08).

## Qué construir, en orden (se corta de abajo hacia arriba)

1. **Gestos con la mano**: la cámara opt-in y el pellizco para avanzar meses ya
  están implementados. Los binarios WASM y el modelo `.task` se sirven desde
  `public/mediapipe/`; las flechas izquierda/derecha son la alternativa de teclado.
2. **Zoom del globo a la parcela** con las órbitas de los satélites.
3. (La red en vivo es de `/engineer`.)
4. **Terreno 3D** con el cultivo creciendo y lluvia en partículas. La lluvia
   solo con datos reales (IMERG o `rain_mm`); nada inventado.
5. **Teléfono como control**: ver `/remote`.

## Reglas

- Solo lee la API. No agrega campos al contrato.
- Mientras `data_status` sea `fixture`, la etiqueta se ve también aquí.
- Todo lo 3D con `next/dynamic` y `ssr: false`. `/tool` no puede importar nada
  de esta carpeta.
- La cámara solo se enciende con el botón. Los gestos nunca son la única forma
  de hacer algo.
- Puede ser oscura y densa (clase `judges`), pero el contraste AA se mantiene.
