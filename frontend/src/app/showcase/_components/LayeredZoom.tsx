"use client";

import type { KeyboardEvent } from "react";
import { SHOWCASE_CONFIG } from "../_lib/showcaseConfig";

export function LayeredZoom({
  activeIndex,
  onChange,
  cameraAnimating,
  cameraDistance,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
  cameraAnimating: boolean;
  cameraDistance: number;
}) {
  const layers = SHOWCASE_CONFIG.layers;
  const activeLayer = layers[activeIndex] ?? layers[0];

  function changeBy(amount: number) {
    onChange(Math.max(0, Math.min(layers.length - 1, activeIndex + amount)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const zoomIn = ["ArrowRight", "ArrowUp", "+", "="].includes(event.key);
    const zoomOut = ["ArrowLeft", "ArrowDown", "-"].includes(event.key);
    if (!zoomIn && !zoomOut) return;
    event.preventDefault();
    changeBy(zoomIn ? 1 : -1);
  }

  return (
    <section
      aria-labelledby="zoom-title"
      aria-keyshortcuts="ArrowRight ArrowUp + ArrowLeft ArrowDown -"
      data-testid="zoom-controls"
      data-zoom-controls
      data-camera-animating={cameraAnimating}
      data-camera-distance={cameraDistance}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <h2 id="zoom-title">Zoom del globo a la parcela</h2>
      <p>
        Cambia entre escalas de fuente. El movimiento de cámara es conceptual:
        no desplaza un mapa real ni cambia la resolución de los datos.
      </p>
      <div role="group" aria-label="Controles de zoom">
        <button
          type="button"
          onClick={() => changeBy(-1)}
          disabled={activeIndex === 0}
          aria-label="Alejar una capa"
          aria-keyshortcuts="ArrowLeft ArrowDown -"
        >
          − Alejar
        </button>{" "}
        <button
          type="button"
          onClick={() => changeBy(1)}
          disabled={activeIndex === layers.length - 1}
          aria-label="Acercar una capa"
          aria-keyshortcuts="ArrowRight ArrowUp +"
        >
          + Acercar
        </button>
      </div>
      <ol aria-label="Capas disponibles">
        {layers.map((layer, index) => (
          <li key={layer.id}>
            <button
              type="button"
              aria-pressed={index === activeIndex}
              onClick={() => onChange(index)}
            >
              {layer.name} · {layer.nativeScale}
            </button>
          </li>
        ))}
      </ol>
      {activeLayer && (
        <div aria-live="polite" data-testid="active-layer">
          <h3>{activeLayer.name}</h3>
          <p>
            <strong>Escala nativa:</strong> {activeLayer.nativeScale}
          </p>
          <p>
            <strong>Fuente:</strong> {activeLayer.source}
          </p>
          <p>{activeLayer.description}</p>
        </div>
      )}
      <p className="note-pending" role="note" data-testid="map-data-status">
        <strong>Nota de escala:</strong>{" "}
        <span>
          Vista conceptual de resolución nativa por fuente; no reemplaza el mapa
          ni implica medición directa a nivel de parcela.
        </span>
      </p>
      <p
        className="visually-hidden"
        role="status"
        aria-live="polite"
        data-testid="camera-motion-status"
      >
        {cameraAnimating
          ? "Transición de cámara en curso"
          : "Cámara en posición"}
      </p>
    </section>
  );
}
