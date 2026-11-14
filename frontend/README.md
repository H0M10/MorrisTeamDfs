# /frontend — Una sola app Next.js

Dueños: personas 4, 5 y 6 y Hanniel, según la subcarpeta de `src/`.
Entrega: aplicación en Next.js (App Router, TypeScript, Tailwind) desplegada en
Vercel, para agricultores y para jueces.

## Arrancar

```bash
cd frontend
npm ci
npm run dev        # http://localhost:3000
```

No hace falta encender la API: sin ella las páginas leen la copia local del
fixture y lo avisan en la etiqueta "Datos de ejemplo". Para probar contra la
API, enciéndela en el puerto 8010 (ver `/backend/README.md`) y copia
`.env.example` a `frontend/.env.local`.

Antes de subir cambios (detén `npm run dev`; la laptop tiene 8 GB):

```bash
npm run lint && npm run typecheck && npm run build && npm run test:a11y
```

`test:a11y` usa Playwright con axe sobre la app compilada. La primera vez:
`npx playwright install chromium` (124 MB).

## Quién escribe dónde

| Carpeta | Dueño | Qué es |
| --- | --- | --- |
| `src/lib/` | Hanniel | Tipos del contrato, cliente de la API, textos, componentes compartidos |
| `src/app/tool/` | Persona 4 | La herramienta del agricultor |
| `src/app/showcase/` | Persona 5 | Landing, globo, terreno 3D, gestos |
| `src/app/remote/` | Persona 5 | Teléfono como control |
| `src/app/engineer/` | Persona 6 | Modo Ingeniero |
| `src/app/layout.tsx`, `globals.css`, `page.tsx` | Hanniel | Base común: tipografía, paleta, accesibilidad |

Cada carpeta tiene su `README.md` con lo que falta y en qué orden.

## Reglas que ya están puestas en el código

- **"Datos de ejemplo" siempre visible** mientras `data_status` sea `fixture`:
  usa `<EvaluationGate>` o `<DataStatusBanner>` de `src/lib/components/` en
  toda página que pinte una evaluación. También sale impresa.
- **`/tool` no carga three ni MediaPipe** ni importa nada de `/showcase`,
  `/engineer` o `/remote`. ESLint lo prohíbe (`eslint.config.mjs`) y una prueba
  revisa el JavaScript que de verdad descarga el navegador.
- **Todo lo 3D y la cámara van con carga diferida**: `next/dynamic` con
  `ssr: false`, como en `showcase/page.tsx`.
- **Español e inglés**: ningún texto fijo en los componentes. Agrega la llave en
  `src/lib/i18n/es.ts` y `en.ts` (TypeScript falla si falta en uno).
- **Accesibilidad base** en `globals.css`: 18 px, foco visible, enlace para
  saltar al contenido, objetivos de 44 px, `prefers-reduced-motion`, hoja de
  impresión. Cada página lleva `<main id="contenido" tabIndex={-1}>`.
- **Paleta** como utilidades de Tailwind: `bg-cal`, `text-tinta`,
  `bg-compuerta`, `bg-paja`, `bg-tierra`, `bg-hoja`. Paja no sirve como color
  de texto sobre blanco (no da contraste): úsala de fondo con texto negro.

## Si cambia el contrato

```bash
python contracts/sync.py      # desde la raíz
cd frontend && npm run gen:types
```

## Despliegue en Vercel

Directorio raíz `frontend`. Variables: las `NEXT_PUBLIC_*` de `.env.example`.
Pasos con la cuenta en `HUMANO.md` (H-07).
