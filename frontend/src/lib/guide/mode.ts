"use client";
// Estado de la Guía en este dispositivo: abierta, minimizada o apagada.
// Sin nada guardado (primera visita) aparece abierta y saluda.
import { useCallback, useEffect, useState } from "react";

export type GuideMode = "open" | "min" | "off";
const KEY = "fieldshift:guide";
export const GUIDE_MODE_EVENT = "fieldshift:guide-mode";

function read(): GuideMode | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "open" || value === "min" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

/** [modo, cambiar, ya se leyó el dispositivo, es la primera visita] */
export function useGuideMode(): [GuideMode, (next: GuideMode) => void, boolean, boolean] {
  const [mode, setModeState] = useState<GuideMode>("open");
  const [loaded, setLoaded] = useState(false);
  const [first, setFirst] = useState(false);

  useEffect(() => {
    const stored = read();
    // Lectura única de localStorage tras hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(stored ?? "open");
    setFirst(stored === null);
    setLoaded(true);
    const onChange = (event: Event) => setModeState((event as CustomEvent<GuideMode>).detail);
    window.addEventListener(GUIDE_MODE_EVENT, onChange);
    return () => window.removeEventListener(GUIDE_MODE_EVENT, onChange);
  }, []);

  const setMode = useCallback((next: GuideMode) => {
    setModeState(next);
    setFirst(false);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // sin almacenamiento: vale solo en esta visita
    }
    window.dispatchEvent(new CustomEvent(GUIDE_MODE_EVENT, { detail: next }));
  }, []);

  return [mode, setMode, loaded, first];
}
