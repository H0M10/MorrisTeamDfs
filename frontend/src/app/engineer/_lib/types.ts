export const LIVE_NETWORK_MODEL = "model_3_crop_history_gru";
export const CQR_MODEL = "model_4_moisture_cqr";

export interface MetricValue {
  value: number | null;
  unit: string;
  type: string;
  source: string;
  date: string;
  native_scale: string;
}

export interface LocalizedText {
  es: string;
  en: string;
}

export interface ModelRecord {
  status?: string;
  experimental?: boolean;
  algorithm?: string;
  partition_method?: LocalizedText;
  metric_name?: LocalizedText;
  metric?: MetricValue | null;
  baseline_name?: LocalizedText;
  baseline_metric?: MetricValue | null;
  active_mode_note?: LocalizedText;
  card_path?: string;
}

export type ModelsRegistry = Record<string, ModelRecord | null | undefined>;

export interface CqrPoint {
  month: string;
  y: number;
  lo: number;
  hi: number;
  confidence: number;
  unit: string;
  source: string;
  date: string;
  nativeScale: string;
}

export interface CqrData {
  points: CqrPoint[];
  nominalCoverage: number | null;
  scale: string;
  unit: string | null;
}

export interface EngineerData {
  models: ModelsRegistry;
  cqr: CqrData;
  dataStatus: "fixture" | "real" | null;
}

export interface ModelsRegistryData {
  models: ModelsRegistry;
  dataStatus: "fixture" | "real" | null;
}

export type EngineerLoadState =
  | { status: "loading" }
  | { status: "ok"; data: EngineerData; mockMode: boolean }
  | { status: "error"; error: Error };

export function isModelTrained(
  models: ModelsRegistry | null | undefined,
  key: string,
): boolean {
  return models?.[key]?.status === "trained";
}
