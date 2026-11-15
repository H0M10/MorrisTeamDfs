"use client";

import { useEffect, useState } from "react";
import { fetchEngineerData, isEngineerMockEnabled } from "./dataSource";
import type { EngineerLoadState } from "./types";

const REFRESH_MS = 15_000;

export function useModelsRegistry(parcelId: string): EngineerLoadState {
  const [state, setState] = useState<EngineerLoadState & { parcelId?: string }>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const refresh = async () => {
      controller = new AbortController();
      try {
        const data = await fetchEngineerData(controller.signal, parcelId);
        if (active) {
          setState({ status: "ok", data, mockMode: isEngineerMockEnabled(), parcelId });
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState({
          status: "error",
          error: error instanceof Error ? error : new Error("Could not load model data."),
          parcelId,
        });
      } finally {
        if (active) timeout = setTimeout(refresh, REFRESH_MS);
      }
    };

    void refresh();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      controller?.abort();
    };
  }, [parcelId]);

  return state.status !== "loading" && state.parcelId !== parcelId
    ? { status: "loading" }
    : state;
}
