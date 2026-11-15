"use client";
// Perfil de accesibilidad (PLAN_DOMINGO §6.8, P1-1): cinco ajustes y las
// unidades, guardados en el dispositivo y aplicados a la página entera con
// atributos data-* en <html>. Los estilos están en lib/a11y/a11y.css.
//
//   data-text-size="1" | "2"   letra de 22 o 26 px (sin atributo: 18 px)
//   data-sun                   modo sol: negro sobre blanco puro, bordes gruesos
//   data-plain                 lenguaje sencillo
//   data-read-aloud            botón "Escuchar esta pantalla"
//   data-reduce-motion         sin animaciones aunque el sistema no lo pida
//   data-units="us" | "metric" lo pone LanguageProvider (depende del idioma)
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readA11yProfile, saveA11yProfile } from "../storage";

export type TextSize = 0 | 1 | 2;
export type UnitsChoice = "auto" | "us" | "metric";

export interface A11yProfile {
  textSize: TextSize;
  sun: boolean;
  plain: boolean;
  readAloud: boolean;
  reduceMotion: boolean;
  /** "auto": EE. UU. si el idioma es inglés, métricas si es español. */
  units: UnitsChoice;
  /** Ya respondió (o saltó) la pregunta de la primera visita. */
  seen: boolean;
}

export const DEFAULT_PROFILE: A11yProfile = {
  textSize: 0,
  sun: false,
  plain: false,
  readAloud: false,
  reduceMotion: false,
  units: "auto",
  seen: false,
};

function parse(json: string | null): A11yProfile | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<A11yProfile>;
    return {
      textSize: raw.textSize === 1 || raw.textSize === 2 ? raw.textSize : 0,
      sun: raw.sun === true,
      plain: raw.plain === true,
      readAloud: raw.readAloud === true,
      reduceMotion: raw.reduceMotion === true,
      units: raw.units === "us" || raw.units === "metric" ? raw.units : "auto",
      seen: raw.seen === true,
    };
  } catch {
    return null;
  }
}

/** Pone o quita los atributos en <html>. */
function apply(profile: A11yProfile): void {
  const html = document.documentElement;
  const flag = (name: string, on: boolean) =>
    on ? html.setAttribute(name, "") : html.removeAttribute(name);
  if (profile.textSize) html.setAttribute("data-text-size", String(profile.textSize));
  else html.removeAttribute("data-text-size");
  flag("data-sun", profile.sun);
  flag("data-plain", profile.plain);
  flag("data-read-aloud", profile.readAloud);
  flag("data-reduce-motion", profile.reduceMotion);
}

interface A11yContext {
  profile: A11yProfile;
  /** false hasta leer el dispositivo: evita mostrar la pregunta de primera visita de más. */
  loaded: boolean;
  update: (patch: Partial<A11yProfile>) => void;
  reset: () => void;
}

const Context = createContext<A11yContext | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<A11yProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = parse(readA11yProfile());
    // Lectura única de localStorage tras hidratar: no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setProfile(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) apply(profile);
  }, [profile, loaded]);

  const update = useCallback((patch: Partial<A11yProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...patch };
      saveA11yProfile(JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = { ...DEFAULT_PROFILE, seen: true };
    saveA11yProfile(JSON.stringify(next));
    setProfile(next);
  }, []);

  const value = useMemo(() => ({ profile, loaded, update, reset }), [profile, loaded, update, reset]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

const FALLBACK: A11yContext = {
  profile: DEFAULT_PROFILE,
  loaded: false,
  update: () => {},
  reset: () => {},
};

/** Perfil activo. Sin proveedor devuelve el perfil por omisión y no guarda nada. */
export function useA11y(): A11yContext {
  return useContext(Context) ?? FALLBACK;
}
