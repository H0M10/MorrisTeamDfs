import {
  getMockCqrData,
  getMockModelsRegistry,
  MOCK_DATA_STATUS,
} from "./mock";
import {
  CQR_MODEL,
  type AttentionPoint,
  type CqrData,
  type EngineerData,
  type LocalizedText,
  type ModelsRegistry,
  type ModelsRegistryData,
} from "./types";

interface ApiEvaluation {
  data_status: "fixture" | "real";
  parcel?: {
    id?: string;
    name?: LocalizedText;
    region_mode?: "labeled" | "unlabeled";
  };
  models?: ModelsRegistry;
  timeline?: Array<{
    month?: string;
    attention_weight?: number | { value?: number | null } | null;
    crop_label?: LocalizedText;
    soil_moisture?: {
      value?: number | null;
      unit?: string;
      type?: string;
      source?: string;
      date?: string;
      native_scale?: string;
      interval?: {
        lower?: number;
        upper?: number;
        confidence?: number;
      };
    };
  }>;
}

interface ApiHealth {
  models?: ModelsRegistry;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const USE_MOCK =
  process.env.NEXT_PUBLIC_ENGINEER_USE_MOCK === "true" ||
  (process.env.NEXT_PUBLIC_ENGINEER_USE_MOCK !== "false" && !API_BASE_URL);

function mockSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

async function requestJson<T>(path: string, signal: AbortSignal, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is required when engineer mock mode is disabled.");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    signal,
  });
  if (!response.ok) throw new Error(`Engineer API request failed (${response.status}): ${path}`);
  return (await response.json()) as T;
}

async function fetchEvaluation(signal: AbortSignal, parcelId: string): Promise<ApiEvaluation> {
  const evaluation = await requestJson<ApiEvaluation>(
    "/api/v1/evaluate",
    signal,
    {
      method: "POST",
      body: JSON.stringify({ parcel_id: parcelId }),
    },
  );
  if (evaluation.data_status !== "fixture" && evaluation.data_status !== "real") {
    throw new Error("The evaluation response has an invalid data_status.");
  }
  return evaluation;
}

function mergeRegistry(
  report: ModelsRegistry | undefined,
  health: ModelsRegistry | undefined,
): ModelsRegistry {
  if (!report) throw new Error("The evaluation response is missing its model registry.");
  return Object.fromEntries(
    Object.entries(report).map(([key, model]) => {
      const currentStatus = health?.[key]?.status;
      const reportStatus = model?.status;
      return [
        key,
        model
          ? {
              ...model,
              ...(typeof reportStatus === "string"
                ? { status: reportStatus }
                : typeof currentStatus === "string"
                  ? { status: currentStatus }
                  : {}),
            }
          : model,
      ];
    }),
  );
}

function cqrFromEvaluation(evaluation: ApiEvaluation): CqrData {
  if (
    evaluation.data_status !== "real" ||
    evaluation.models?.[CQR_MODEL]?.status !== "trained"
  ) {
    return {
      points: [],
      nominalCoverage: null,
      scale: "9 km (contexto regional)",
      unit: null,
    };
  }

  const points = (evaluation.timeline ?? []).flatMap((month) => {
    const observation = month.soil_moisture;
    const interval = observation?.interval;
    if (
      (observation?.type !== "observed" && observation?.type !== "modeled") ||
      typeof observation.value !== "number" ||
      !Number.isFinite(observation.value) ||
      !observation.unit ||
      !observation.source ||
      !observation.date ||
      !observation.native_scale ||
      typeof interval?.lower !== "number" ||
      typeof interval.upper !== "number" ||
      typeof interval.confidence !== "number" ||
      !Number.isFinite(interval.lower) ||
      !Number.isFinite(interval.upper) ||
      !Number.isFinite(interval.confidence) ||
      interval.upper < interval.lower
    ) {
      return [];
    }
    return [
      {
        month: month.month ?? "—",
        y: observation.value,
        lo: interval.lower,
        hi: interval.upper,
        confidence: interval.confidence,
        unit: observation.unit,
        source: observation.source,
        date: observation.date,
        nativeScale: observation.native_scale,
      },
    ];
  });

  const confidences = new Set(
    points.map((point) => point.confidence),
  );
  const nativeScales = new Set(points.map((point) => point.nativeScale));
  const units = new Set(points.map((point) => point.unit));
  if (units.size > 1) throw new Error("CQR observations contain incompatible units.");
  return {
    points,
    nominalCoverage: confidences.size === 1 ? ([...confidences][0] ?? null) : null,
    scale: [...nativeScales].join(", ") || "Escala no disponible",
    unit: points[0]?.unit ?? null,
  };
}

function attentionFromEvaluation(evaluation: ApiEvaluation): AttentionPoint[] {
  return (evaluation.timeline ?? []).map((item) => {
    const rawWeight = item.attention_weight;
    const numericWeight =
      typeof rawWeight === "number"
        ? rawWeight
        : rawWeight && typeof rawWeight === "object" && typeof rawWeight.value === "number"
          ? rawWeight.value
          : null;
    return {
      month: item.month ?? "—",
      weight:
        numericWeight !== null && Number.isFinite(numericWeight) ? numericWeight : null,
      cropLabel: item.crop_label ?? null,
    };
  });
}

export function isEngineerMockEnabled(): boolean {
  return USE_MOCK;
}

export async function fetchEngineerData(
  signal: AbortSignal,
  parcelId: string,
): Promise<EngineerData> {
  if (USE_MOCK) {
    return {
      models: getMockModelsRegistry(mockSearch()),
      cqr: getMockCqrData(),
      attentionTimeline: [],
      dataStatus: MOCK_DATA_STATUS,
    };
  }

  const [health, evaluation] = await Promise.all([
    requestJson<ApiHealth>("/health", signal),
    fetchEvaluation(signal, parcelId),
  ]);
  return {
    models: mergeRegistry(evaluation.models, health.models),
    cqr: cqrFromEvaluation(evaluation),
    attentionTimeline: attentionFromEvaluation(evaluation),
    parcelName: evaluation.parcel?.name,
    regionMode: evaluation.parcel?.region_mode,
    dataStatus: evaluation.data_status ?? null,
  };
}

export async function fetchModelsRegistry(
  signal: AbortSignal,
  parcelId: string,
): Promise<ModelsRegistryData> {
  const data = await fetchEngineerData(signal, parcelId);
  return { models: data.models, dataStatus: data.dataStatus };
}

export async function fetchCqrData(signal: AbortSignal, parcelId: string): Promise<CqrData> {
  const data = await fetchEngineerData(signal, parcelId);
  return data.cqr;
}
