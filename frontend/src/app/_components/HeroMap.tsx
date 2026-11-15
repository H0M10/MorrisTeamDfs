"use client";
// Imagen real: el mapa de satélite de Diamond Valley, Nevada, con sus pivotes
// de riego. Es la misma capa que usa la herramienta; no es una ilustración.
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { BASE_STYLE } from "@/lib/mapStyle";

export default function HeroMap({ label }: { label: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: BASE_STYLE,
      center: [-115.985, 39.72],
      zoom: 12.3,
      interactive: false,
      // La atribución va en el pie de la figura: así no hay botones dentro de una imagen.
      attributionControl: false,
    });
    map.getCanvas().setAttribute("tabindex", "-1");
    return () => map.remove();
  }, []);
  return <div ref={container} className="landing-hero-map" role="img" aria-label={label} />;
}
