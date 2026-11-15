"use client";
// Carga de datos para las páginas: primero la API; si no responde, la copia
// local del fixture. El origen queda a la vista en `origin`.
import { useEffect, useState } from "react";
import { ApiError, api } from "./api";
import type { Evaluation, PilotsResponse } from "./contract";
import { DEFAULT_PARCEL_ID, loadFixture, loadFixturePilots } from "./fixtures";
import { readLastParcelId, saveLastParcelId } from "./storage";

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

export const PARCEL_ID_ALIASES: Record<string, string> = {
  "dv-nv-fixture-01": "dv-nv-01",
  "qro-sjr-fixture-01": "qro-sjr-01",
  "dv-nv-01": "dv-nv-fixture-01",
  "qro-sjr-01": "qro-sjr-fixture-01",
};

const REAL_ID_ALIAS: Record<string, string> = {
  "dv-nv-fixture-01": "dv-nv-01",
  "qro-sjr-fixture-01": "qro-sjr-01",
};

export async function loadEvaluation(parcelId: string): Promise<Loaded<Evaluation>> {
  try {
    return { data: await api.evaluate(parcelId), origin: "api" };
  } catch (error) {
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
  const [state, setState] = useState<LoadState<T> & { key?: string }>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    load().then(
      (loaded) => alive && setState({ status: "ready", ...loaded, key }),
      (error: unknown) =>
        alive &&
        setState({ status: "error", error: error instanceof ApiError ? error : NOT_FOUND, key }),
    );
    return () => {
      alive = false;
    };
    // `load` depende solo de `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.status !== "loading" && state.key !== key ? { status: "loading" } : state;
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
    window.dispatchEvent(new CustomEvent<string>(PARCEL_CHANGE_EVENT, { detail: id }));
  };
  return [parcelId, choose];
}

export function useEvaluation(parcelId: string): LoadState<Evaluation> {
  return useLoad(() => loadEvaluation(parcelId), `evaluation:${parcelId}`);
}

export function usePilots(): LoadState<PilotsResponse> {
  return useLoad(loadPilots, "pilots");
}
