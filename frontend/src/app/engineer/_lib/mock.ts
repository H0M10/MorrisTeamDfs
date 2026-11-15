import type { CqrData, ModelsRegistry } from "./types";
import { LIVE_NETWORK_MODEL } from "./types";

// MOCK - reemplazar con datos de H-12
export const MOCK_DATA_STATUS = "fixture" as const;

export function getMockModelsRegistry(search: string): ModelsRegistry {
  const models: ModelsRegistry = {
    model_1_crop_water: {
      algorithm: "XGBoost",
      status: undefined,
      metric: null,
      baseline_metric: null,
    },
    model_2_prior_crop_effect: {
      algorithm: "XGBoost",
      status: undefined,
      metric: null,
      baseline_metric: null,
    },
    [LIVE_NETWORK_MODEL]: {
      algorithm: "GRU pequeña con atención temporal (ONNX)",
      status: undefined,
      metric: null,
      baseline_metric: null,
    },
    model_4_moisture_cqr: {
      algorithm: "Balance FAO-56 + residual con árboles + CQR",
      status: undefined,
      metric: null,
      baseline_metric: null,
    },
  };

  const status = new URLSearchParams(search).get("mockStatus");
  if (status === "trained" || status === "training" || status === "failed") {
    models[LIVE_NETWORK_MODEL] = { ...models[LIVE_NETWORK_MODEL], status };
  }

  return models;
}

export function getMockCqrData(): CqrData {
  return {
    points: [],
    nominalCoverage: null,
    scale: "9 km (contexto regional)",
    unit: null,
  };
}
