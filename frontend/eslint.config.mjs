import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// /tool es para el agricultor: no carga 3D ni cámara y no depende de las
// páginas de los jueces (PISTAS_PARALELAS.md, regla 2).
const toolIsolation = {
  files: ["src/app/tool/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["three", "three/*", "@react-three/*", "@mediapipe/*"],
            message: "/tool no carga three ni MediaPipe.",
          },
          {
            group: ["**/showcase/**", "**/engineer/**", "**/remote/**"],
            message: "/tool no importa nada de /showcase, /engineer ni /remote.",
          },
        ],
      },
    ],
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  toolIsolation,
  globalIgnores([
    ".next/**",
    "out/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "src/lib/contract/types.ts",
  ]),
]);
