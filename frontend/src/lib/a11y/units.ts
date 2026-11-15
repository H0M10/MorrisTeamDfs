// Unidades del agricultor de EE. UU. (PLAN_DOMINGO §6.5, P1-5).
// El contrato siempre trae mm, ha, m y mm/m. Aquí solo se convierte lo que se
// muestra; el valor original y su ficha no cambian, y la pantalla dice de qué
// unidad se convirtió. Conversiones exactas, sin redondeos intermedios.

export type UnitSystem = "us" | "metric";

export const MM_PER_INCH = 25.4;
export const ACRES_PER_HA = 2.4710538;
export const FEET_PER_M = 1 / 0.3048;

/** Unidad de EE. UU. a la que pasa cada unidad del contrato, con su factor y decimales. */
const TO_US: Record<string, { unit: string; factor: number; digits: number }> = {
  "mm/yr": { unit: "in/yr", factor: 1 / MM_PER_INCH, digits: 1 },
  mm: { unit: "in", factor: 1 / MM_PER_INCH, digits: 2 },
  ha: { unit: "acres", factor: ACRES_PER_HA, digits: 1 },
  // Agua disponible del suelo: mm por metro de suelo -> pulgadas por pie de suelo.
  "mm/m": { unit: "in/ft", factor: 0.3048 / MM_PER_INCH, digits: 2 },
  m: { unit: "ft", factor: FEET_PER_M, digits: 0 },
};

export interface Converted {
  value: number;
  /** Clave de unidad para buscar su nombre en t.a11y.units.names o t.common.units. */
  unit: string;
  digits: number | null;
  /** Unidad del contrato si hubo conversión; null si se muestra tal cual. */
  convertedFrom: string | null;
}

/** Convierte un número del contrato al sistema elegido. */
export function convert(value: number, unit: string, system: UnitSystem): Converted {
  const rule = system === "us" ? TO_US[unit] : undefined;
  if (!rule) return { value, unit, digits: null, convertedFrom: null };
  return { value: value * rule.factor, unit: rule.unit, digits: rule.digits, convertedFrom: unit };
}

export const isConvertible = (unit: string) => unit in TO_US;

/**
 * Agua total de un año en acre-pies (los derechos de agua de Nevada se
 * expresan así): lámina en pulgadas ÷ 12 × acres.
 */
export function acreFeet(mmPerYear: number, areaHa: number): number {
  return (mmPerYear / MM_PER_INCH / 12) * areaHa * ACRES_PER_HA;
}

/** Lámina de agua en acre-pies por acre (= pies de agua): pulgadas ÷ 12. */
export function acreFeetPerAcre(mmPerYear: number): number {
  return mmPerYear / MM_PER_INCH / 12;
}
