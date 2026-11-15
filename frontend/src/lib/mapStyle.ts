"use client";
// Mapa base común de /tool (MapLibre GL, AGENTS.md §3). Idea y primera versión de
// Checo (@Checo-coder, rama pista/datos-modelos, be08ba0); aquí se adapta al flujo
// de tres pasos y a la paleta de la herramienta.
//
// Tres vistas:
//   satellite  imagen de satélite plana (por omisión: el campo se reconoce desde arriba)
//   relief     la misma imagen sobre el terreno en 3D, exagerado e inclinado, con
//              sombreado de laderas: se ven las sierras que rodean el valle
//   map        mapa topográfico plano
import { setWorkerUrl, type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import { prefersReducedMotion } from "./a11y/motion";

// El worker se sirve desde public/maplibre/ (scripts/copy-maplibre-worker.mjs): sin él,
// las capas GeoJSON (figuras, contornos y puntos) no se dibujan.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type MapView = "satellite" | "relief" | "map";
export const MAP_VIEWS: MapView[] = ["satellite", "relief", "map"];

const DEM_TILES = [
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
];
const RELIEF_EXAGGERATION = 3;
const RELIEF_PITCH = 70;

export const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imágenes © Esri, Maxar, Earthstar Geographics",
    },
    topo: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Mapa © Esri",
    },
    // Dos fuentes con las mismas teselas: MapLibre recomienda no compartir una entre
    // el terreno 3D y el sombreado.
    "terrain-dem": {
      type: "raster-dem",
      tiles: DEM_TILES,
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 14,
      attribution: "Relieve: Terrain Tiles (AWS Open Data, SRTM y otras)",
    },
    "hillshade-dem": {
      type: "raster-dem",
      tiles: DEM_TILES,
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 14,
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    {
      id: "topo",
      type: "raster",
      source: "topo",
      layout: { visibility: "none" },
    },
    {
      id: "hillshade",
      type: "hillshade",
      source: "hillshade-dem",
      layout: { visibility: "none" },
      paint: {
        "hillshade-exaggeration": 0.45,
        "hillshade-shadow-color": "#1d1d1d",
        "hillshade-highlight-color": "#ffffff",
      },
    },
  ],
};

/** Ejecuta `fn` cuando el estilo terminó de cargar (o de inmediato si ya cargó). */
export function whenReady(map: MapLibreMap, fn: () => void): void {
  if (map.isStyleLoaded()) fn();
  else map.once("load", fn);
}

/** 0 si la persona pidió reducir el movimiento (AGENTS.md §9). */
export function motion(ms: number): number {
  if (typeof window === "undefined") return ms;
  return prefersReducedMotion() ? 0 : ms;
}

/** Cambia la vista sin rehacer el mapa. */
export function applyView(map: MapLibreMap, view: MapView): void {
  whenReady(map, () => {
    map.setLayoutProperty(
      "satellite",
      "visibility",
      view === "map" ? "none" : "visible",
    );
    map.setLayoutProperty(
      "topo",
      "visibility",
      view === "map" ? "visible" : "none",
    );
    map.setLayoutProperty(
      "hillshade",
      "visibility",
      view === "relief" ? "visible" : "none",
    );
    if (view === "relief") {
      map.setTerrain({
        source: "terrain-dem",
        exaggeration: RELIEF_EXAGGERATION,
      });
      // Un poco más lejos e inclinado: en un valle plano, el relieve está en las sierras.
      map.easeTo({
        pitch: RELIEF_PITCH,
        bearing: -25,
        zoom: Math.min(map.getZoom(), 11.8),
        duration: motion(1200),
      });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: motion(600) });
    }
  });
}
