"use client";
// Prioridades del agricultor (PLAN_DOMINGO.md §4).
// Ordenan las rotaciones con un orden lexicográfico sobre métricas que ya
// trae el contrato: primero la prioridad principal y, si empatan, la segunda.
// No hay puntaje combinado ni pesos inventados (AGENTS.md regla 1).
import { useCallback, useEffect, useState } from "react";
import type { Evaluation } from "@/lib/contract";

export type Strategy = Evaluation["strategies"][number];
export type PriorityKey = "water" | "soil" | "climate" | "market";
/** Prioridades que se pueden ordenar con datos del contrato. */
export type RankableKey = Exclude<PriorityKey, "market">;
export const PRIORITY_KEYS: PriorityKey[] = ["water", "soil", "climate", "market"];
export const RANKABLE_KEYS: RankableKey[] = ["water", "soil", "climate"];

export interface Priorities {
  first: PriorityKey | null;
  second: PriorityKey | null;
}

const STORAGE_KEY = "fieldshift:priorities";
const EMPTY: Priorities = { first: null, second: null };

const isKey = (value: unknown): value is PriorityKey =>
  typeof value === "string" && (PRIORITY_KEYS as string[]).includes(value);

function readPriorities(): Priorities {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Priorities>;
    const first = isKey(parsed.first) ? parsed.first : null;
    const second = isKey(parsed.second) && parsed.second !== first ? parsed.second : null;
    return { first, second };
  } catch {
    return EMPTY;
  }
}

function savePriorities(priorities: Priorities): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(priorities));
  } catch {
    // sin almacenamiento: la elección vale solo en esta visita
  }
}

/** Prioridades guardadas en el dispositivo (sin datos personales). */
export function usePriorities(): [Priorities, (next: Priorities) => void] {
  const [priorities, setPriorities] = useState<Priorities>(EMPTY);
  useEffect(() => {
    // Lectura única de localStorage tras hidratar: no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPriorities(readPriorities());
  }, []);
  const update = useCallback((next: Priorities) => {
    const clean = { first: next.first, second: next.second === next.first ? null : next.second };
    setPriorities(clean);
    savePriorities(clean);
  }, []);
  return [priorities, update];
}

/**
 * Valor comparable de una rotación para una prioridad: menor es mejor.
 * null si falta el dato (va al final, nunca se rellena).
 */
export function rankValue(strategy: Strategy, key: RankableKey): number | null {
  const m = strategy.metrics;
  switch (key) {
    case "water":
      return m.annual_water_mm.value;
    case "soil":
      return m.soil_cover_months_36m.value === null ? null : -m.soil_cover_months_36m.value;
    case "climate": {
      const frost = m.frost_risk_days_year.value;
      const heat = m.heat_risk_days_year.value;
      return frost === null || heat === null ? null : frost + heat;
    }
  }
}

const isRankable = (key: PriorityKey | null): key is RankableKey =>
  key !== null && key !== "market";

function compareBy(a: Strategy, b: Strategy, key: RankableKey): number {
  const va = rankValue(a, key);
  const vb = rankValue(b, key);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  // Redondeo a una décima: diferencias menores no son reales.
  return Math.round(va * 10) - Math.round(vb * 10);
}

/** Restricciones primero: viables arriba; después, las prioridades en orden. */
export function orderStrategies(strategies: Strategy[], priorities: Priorities): Strategy[] {
  const keys = [priorities.first, priorities.second].filter(isRankable);
  return strategies
    .map((strategy, index) => ({ strategy, index }))
    .sort((a, b) => {
      if (a.strategy.viable !== b.strategy.viable) return a.strategy.viable ? -1 : 1;
      for (const key of keys) {
        const diff = compareBy(a.strategy, b.strategy, key);
        if (diff !== 0) return diff;
      }
      return a.index - b.index;
    })
    .map(({ strategy }) => strategy);
}

/** Por cada prioridad, la única rotación viable que es la mejor (sin empates). */
export function bestByKey(strategies: Strategy[]): Partial<Record<RankableKey, string>> {
  const result: Partial<Record<RankableKey, string>> = {};
  const viable = strategies.filter((strategy) => strategy.viable);
  if (viable.length < 2) return result;
  for (const key of RANKABLE_KEYS) {
    const sorted = [...viable].sort((a, b) => compareBy(a, b, key));
    const [top, next] = sorted;
    if (!top || !next || rankValue(top, key) === null) continue;
    if (compareBy(top, next, key) < 0) result[key] = top.id;
  }
  return result;
}

/** ¿Empatan las dos primeras viables en esta prioridad? */
export function topTied(ordered: Strategy[], key: RankableKey): boolean {
  const [top, next] = ordered;
  if (!top || !next || !top.viable || !next.viable) return false;
  return rankValue(top, key) !== null && compareBy(top, next, key) === 0;
}

export { isRankable };
