// Copia el worker de MapLibre a public/ antes de compilar o desarrollar.
// MapLibre 6 busca su worker junto a su propio archivo; dentro del paquete de Next ese
// archivo no existe y las capas GeoJSON (figuras, contornos, puntos) no se dibujan.
// Se sirve desde /maplibre/ y mapStyle.ts lo indica con setWorkerUrl. La copia se
// genera de node_modules, así siempre corresponde a la versión instalada (no va en git).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
const to = join(root, "public", "maplibre", "maplibre-gl-worker.mjs");
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log("Worker de MapLibre copiado a public/maplibre/");
