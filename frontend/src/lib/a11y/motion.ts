// Movimiento reducido: lo pide el sistema (prefers-reduced-motion) o el perfil
// de accesibilidad (<html data-reduce-motion>). Cualquiera de los dos basta.
// Para animaciones hechas con JavaScript (mapa, 3D, red en vivo); las de CSS
// ya las corta lib/a11y/a11y.css.

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.hasAttribute("data-reduce-motion")) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
