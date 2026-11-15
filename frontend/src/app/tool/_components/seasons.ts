// Año típico del campo a partir del timeline del contrato (PLAN_DOMINGO.md §5).
// Responde dos preguntas del reto: cuándo queda el suelo sin cubrir y en qué
// temporada la helada o el calor alcanzan al cultivo verde. Solo cuenta y
// promedia datos observados; el umbral de verdor es un supuesto declarado.
import type { TimelineMonth } from "@/lib/contract";

/** Índice de verdor (NDVI) desde el que contamos cultivo verde. Supuesto declarado. */
export const GREEN_MIN = 0.3;

export type MonthState = "nodata" | "snow" | "exposed" | "green" | "low";

export function classify(item: TimelineMonth): MonthState {
  const ndvi = item.indices.ndvi.value;
  const bsi = item.indices.bsi.value;
  if (ndvi === null) return "nodata";
  if (ndvi < 0) return "snow"; // típico de nieve o agua sobre el suelo
  if (ndvi >= GREEN_MIN) return "green";
  if (bsi !== null && bsi > 0) return "exposed";
  return "low";
}

export interface MonthSummary {
  /** 1 a 12 */
  month: number;
  years: number;
  withData: number;
  exposed: number;
  snow: number;
  frostAvg: number | null;
  heatAvg: number | null;
  frostWhileGreen: number;
  heatWhileGreen: number;
}

const mean = (values: number[]) =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

export function typicalYear(timeline: TimelineMonth[]): MonthSummary[] {
  return Array.from({ length: 12 }, (_, i) => {
    const items = timeline.filter((item) => Number(item.month.slice(5, 7)) === i + 1);
    const states = items.map(classify);
    const frost = items.map((item) => item.frost_days.value).filter((v): v is number => v !== null);
    const heat = items.map((item) => item.heat_days.value).filter((v): v is number => v !== null);
    const greenWith = (pick: (item: TimelineMonth) => number | null) =>
      items.filter((item, k) => states[k] === "green" && (pick(item) ?? 0) > 0).length;
    return {
      month: i + 1,
      years: items.length,
      withData: states.filter((state) => state !== "nodata").length,
      exposed: states.filter((state) => state === "exposed").length,
      snow: states.filter((state) => state === "snow").length,
      frostAvg: mean(frost),
      heatAvg: mean(heat),
      frostWhileGreen: greenWith((item) => item.frost_days.value),
      heatWhileGreen: greenWith((item) => item.heat_days.value),
    };
  });
}

export interface SeasonFacts {
  exposedMonths: number;
  monthsWithData: number;
  /** Meses del año con poca cobertura en la mitad o más de los años con dato. */
  mostlyExposed: number[];
  frostGreenMonths: number[];
  heatGreenMonths: number[];
}

export function seasonFacts(timeline: TimelineMonth[], summary: MonthSummary[]): SeasonFacts {
  const states = timeline.map(classify);
  return {
    exposedMonths: states.filter((state) => state === "exposed").length,
    monthsWithData: states.filter((state) => state !== "nodata").length,
    mostlyExposed: summary
      .filter((m) => m.withData > 0 && m.exposed * 2 >= m.withData && m.exposed > 0)
      .map((m) => m.month),
    frostGreenMonths: summary.filter((m) => m.frostWhileGreen > 0).map((m) => m.month),
    heatGreenMonths: summary.filter((m) => m.heatWhileGreen > 0).map((m) => m.month),
  };
}
