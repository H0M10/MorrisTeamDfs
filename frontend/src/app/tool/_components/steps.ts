// El flujo de /tool: una decisión por pantalla, en este orden.
export const STEPS = [
  { key: "parcel", href: "/tool" },
  { key: "portrait", href: "/tool/retrato" },
  { key: "constraints", href: "/tool/restricciones" },
  { key: "rotations", href: "/tool/rotaciones" },
  { key: "evidence", href: "/tool/evidencia" },
  { key: "share", href: "/tool/compartir" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];
