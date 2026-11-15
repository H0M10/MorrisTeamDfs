"use client";
// Carga de datos para las páginas: primero la API; si no responde, la copia
// local del fixture. El origen queda a la vista en `origin`.
import { useEffect, useState } from "react";
import { ApiError, api } from "./api";
import type { ConstraintsInput, Evaluation, PilotsResponse } from "./contract";
import { DEFAULT_PARCEL_ID, loadFixture, loadFixturePilots } from "./fixtures";
import {
  readConstraints,
  readLastParcelId,
  saveConstraints,
  saveLastParcelId,
} from "./storage";

export type Origin = "api" | "local";

export interface Loaded<T> {
  data: T;
  origin: Origin;
}

export type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T; origin: Origin }
  | { status: "error"; error: ApiError };

const NOT_FOUND = new ApiError(404, "parcel_not_found", {
  es: "No existe esa parcela.",
  en: "That parcel does not exist.",
});

const PARCEL_CHANGE_EVENT = "fieldshift:parcel-change";
const CONSTRAINTS_CHANGE_EVENT = "fieldshift:constraints-change";

export const PARCEL_ID_ALIASES: Record<string, string> = {
  "dv-nv-fixture-01": "dv-nv-01",
  "dv-nv-01": "dv-nv-fixture-01",
};

const REAL_ID_ALIAS: Record<string, string> = {
  "dv-nv-fixture-01": "dv-nv-01",
};

/** "live-39.7170n-115.8931w" -> {lat: 39.717, lon: -115.8931}. null si no es un punto en vivo. */
export function liveCoordinates(
  parcelId: string,
): { lat: number; lon: number } | null {
  const match = /^live-(\d+(?:\.\d+)?)([ns])-(\d+(?:\.\d+)?)([ew])$/.exec(
    parcelId,
  );
  if (!match) return null;
  const lat = Number(match[1]) * (match[2] === "s" ? -1 : 1);
  const lon = Number(match[3]) * (match[4] === "w" ? -1 : 1);
  return { lat, lon };
}

export async function loadEvaluation(
  parcelId: string,
): Promise<Loaded<Evaluation>> {
  try {
    return { data: await api.evaluate(parcelId), origin: "api" };
  } catch (error) {
    // Un punto analizado en vivo vive en el disco del servidor, que se borra en cada
    // despliegue. Si ya no está, se vuelve a analizar con las coordenadas de su id.
    const point = liveCoordinates(parcelId);
    if (point && error instanceof ApiError && error.status === 404) {
      return { data: await api.analyze(point.lat, point.lon), origin: "api" };
    }
    const realId = REAL_ID_ALIAS[parcelId];
    if (realId) {
      try {
        return { data: await api.evaluate(realId), origin: "api" };
      } catch {
        // cae a la copia local
      }
    }
    // Sin conexión o API en modo real sin datos: se usa la copia local.
    const fixture = await loadFixture(parcelId);
    if (fixture) return { data: fixture, origin: "local" };
    throw error instanceof ApiError ? error : NOT_FOUND;
  }
}

/**
 * Evaluación con las restricciones que declaró el agricultor. Si la API no
 * responde no hay recálculo posible: se devuelve la evaluación sin ellas y el
 * origen queda como "local".
 */
export async function loadSimulation(
  parcelId: string,
  constraints: ConstraintsInput,
): Promise<Loaded<Evaluation>> {
  for (const id of [parcelId, REAL_ID_ALIAS[parcelId]].filter(
    Boolean,
  ) as string[]) {
    try {
      return { data: await api.simulate(id, constraints), origin: "api" };
    } catch {
      // se prueba el siguiente id o se cae a la evaluación sin restricciones
    }
  }
  return loadEvaluation(parcelId);
}

export async function loadPilots(): Promise<Loaded<PilotsResponse>> {
  try {
    const pilots = await api.pilots();
    if (pilots.pilots.length > 0) return { data: pilots, origin: "api" };
  } catch {
    // cae a la copia local
  }
  return { data: await loadFixturePilots(), origin: "local" };
}

function useLoad<T>(load: () => Promise<Loaded<T>>, key: string): LoadState<T> {
  const [state, setState] = useState<LoadState<T> & { key?: string }>({
    status: "loading",
  });
  useEffect(() => {
    let alive = true;
    load().then(
      (loaded) => alive && setState({ status: "ready", ...loaded, key }),
      (error: unknown) =>
        alive &&
        setState({
          status: "error",
          error: error instanceof ApiError ? error : NOT_FOUND,
          key,
        }),
    );
    return () => {
      alive = false;
    };
    // `load` depende solo de `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.status !== "loading" && state.key !== key
    ? { status: "loading" }
    : state;
}

/** La parcela elegida en este dispositivo (la última consultada). */
export function useParcelId(): [string, (id: string) => void] {
  const [parcelId, setParcelId] = useState(DEFAULT_PARCEL_ID);
  useEffect(() => {
    const stored = readLastParcelId();
    // Lectura única de localStorage tras hidratar: no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setParcelId(stored);
    const onChange = (event: Event) => {
      const nextId = (event as CustomEvent<string>).detail;
      if (nextId) setParcelId(nextId);
    };
    window.addEventListener(PARCEL_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(PARCEL_CHANGE_EVENT, onChange);
  }, []);
  const choose = (id: string) => {
    setParcelId(id);
    saveLastParcelId(id);
    window.dispatchEvent(
      new CustomEvent<string>(PARCEL_CHANGE_EVENT, { detail: id }),
    );
  };
  return [parcelId, choose];
}

export function useEvaluation(parcelId: string): LoadState<Evaluation> {
  return useLoad(() => loadEvaluation(parcelId), `evaluation:${parcelId}`);
}

export function usePilots(): LoadState<PilotsResponse> {
  return useLoad(loadPilots, "pilots");
}

function parseConstraints(json: string | null): ConstraintsInput | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ConstraintsInput;
  } catch {
    return null;
  }
}

/**
 * Restricciones declaradas para la parcela, guardadas en este dispositivo.
 * Todas las pantallas de /tool las leen, así la comparación usa lo mismo que
 * el agricultor declaró. `null` = se usan las de la parcela.
 */
export function useDeclaredConstraints(
  parcelId: string,
): [ConstraintsInput | null, (next: ConstraintsInput | null) => void] {
  const [json, setJson] = useState<string | null>(null);
  useEffect(() => {
    // Lectura de localStorage tras hidratar: no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJson(readConstraints(parcelId));
    const onChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{ parcelId: string; json: string | null }>
      ).detail;
      if (detail.parcelId === parcelId) setJson(detail.json);
    };
    window.addEventListener(CONSTRAINTS_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSTRAINTS_CHANGE_EVENT, onChange);
  }, [parcelId]);
  const update = (next: ConstraintsInput | null) => {
    const nextJson = next ? JSON.stringify(next) : null;
    setJson(nextJson);
    saveConstraints(parcelId, nextJson);
    window.dispatchEvent(
      new CustomEvent(CONSTRAINTS_CHANGE_EVENT, {
        detail: { parcelId, json: nextJson },
      }),
    );
  };
  return [parseConstraints(json), update];
}

/** Evaluación de la parcela con las restricciones declaradas, si las hay. */
export function useDeclaredEvaluation(
  parcelId: string,
  constraints: ConstraintsInput | null,
): LoadState<Evaluation> {
  const key = `evaluation:${parcelId}:${constraints ? JSON.stringify(constraints) : "parcel"}`;
  return useLoad(
    () =>
      constraints
        ? loadSimulation(parcelId, constraints)
        : loadEvaluation(parcelId),
    key,
  );
}
