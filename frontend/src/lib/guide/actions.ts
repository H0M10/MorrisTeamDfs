"use client";
// Órdenes que la Guía ejecuta en el mapa: "ponme en Texas", "usa mi
// ubicación", "aquí está mi campo", "analiza mi campo"... Se reconocen con
// reglas (sin IA, al instante) y el mapa devuelve el resultado para que la
// Guía lo diga en voz alta.

export type MapAction =
  | { type: "go"; place: string }
  | { type: "locate" }
  | { type: "view"; view: "satellite" | "relief" | "map" }
  | { type: "size"; size: "small" | "medium" | "large" }
  | { type: "mark" }
  | { type: "analyze" };

export const MAP_ACTION_EVENT = "fieldshift:map-action";
export const MAP_RESULT_EVENT = "fieldshift:map-result";
const PENDING_KEY = "fieldshift:map-action-pending";

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:"«»“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Palabras que nombran pantallas o la Guía, no lugares: "llévame a rotaciones" no es un viaje. */
const NOT_PLACES =
  /\b(pantalla|paso|pasos|parcela|retrato|restriccion\w*|limite\w*|rotacion\w*|evidencia|compartir|inicio|ejemplo|siguiente|atras|guia|screen|step|portrait|constraint\w*|limit\w*|rotation\w*|evidence|share|home|example|next|back|guide|tool|herramienta)\b/;

export function parseMapAction(raw: string): MapAction | null {
  const t = normalize(raw);
  if (/\b(usa|usar|use)\s+(mi|my)\s+(ubicacion|location|gps)\b|\bdonde estoy\b|\bwhere i am\b/.test(t)) {
    return { type: "locate" };
  }
  if (/\b(aqui esta mi campo|mi campo esta aqui|marca(lo)? aqui|marca mi campo|es aqui|ese es mi campo|this is my field|my field is here|mark (it )?here)\b/.test(t)) {
    return { type: "mark" };
  }
  if (/\b(analiza|analizar|analizalo|analyze|analyse)\b/.test(t)) return { type: "analyze" };
  const view = t.match(/\b(?:vista|cambia(?: la vista)? a|view|switch to)\s+(satelite|satellite|relieve|relief|3d|mapa|map)\b/);
  if (view) {
    const v = view[1]!;
    return { type: "view", view: /sat/.test(v) ? "satellite" : /reli|3d/.test(v) ? "relief" : "map" };
  }
  const size = t.match(/\b(?:pivote|circulo|pivot|circle)\s+(chico|pequeno|mediano|grande|small|medium|large|big)\b/);
  if (size) {
    const s = size[1]!;
    return { type: "size", size: /chico|pequeno|small/.test(s) ? "small" : /mediano|medium/.test(s) ? "medium" : "large" };
  }
  const go =
    t.match(/^(?:por favor )?(?:ponme|llevame|lleveme|ve|vete|vamos|ir|ubicame|muestrame|busca|buscar|centrame|centra el mapa|mueve el mapa|mueveme)\s+(?:en|a|al|hacia|hasta|por)\s+(?:la ubicacion (?:de )?)?(.+)$/) ??
    t.match(/\bmi campo (?:esta|queda) (?:en|cerca de|por) (.+)$/) ??
    t.match(/^(?:please )?(?:take me to|go to|show me|find|search for|search|move to|zoom to|put me in)\s+(.+)$/) ??
    t.match(/\bmy field is (?:in|near) (.+)$/);
  if (go) {
    const place = go[1]!.replace(/\b(por favor|please)\b/g, "").trim();
    if (place.length >= 2 && !NOT_PLACES.test(place)) return { type: "go", place };
  }
  return null;
}

/** Envía la orden al mapa; si el mapa no está abierto, la deja pendiente para cuando se abra. */
export function sendMapAction(action: MapAction, mapOpen: boolean): void {
  if (!mapOpen) {
    try {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(action));
    } catch {
      // sin almacenamiento: la persona repite la orden en el mapa
    }
    return;
  }
  window.dispatchEvent(new CustomEvent(MAP_ACTION_EVENT, { detail: action }));
}

export function takePendingMapAction(): MapAction | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as MapAction) : null;
  } catch {
    return null;
  }
}

/** El mapa dice qué hizo; la Guía lo narra. */
export function reportMapResult(text: string): void {
  window.dispatchEvent(new CustomEvent(MAP_RESULT_EVENT, { detail: text }));
}
