// Punto de entrada de los tipos del contrato. types.ts se genera; esto no.
import type {
  Constraints,
  FieldShiftEvaluationContract,
  LocalizedText,
  MetricValue,
  ModelReport,
  Parcel,
  Strategy,
  TimelineMonth,
} from "./types";

export type Evaluation = FieldShiftEvaluationContract;
export type { Constraints, LocalizedText, MetricValue, ModelReport, Parcel, Strategy, TimelineMonth };

export type DataStatus = Evaluation["data_status"];
export type StrategyId = Strategy["id"];
export type Lang = keyof LocalizedText;

/** Lo que declara el agricultor en /simulate. */
export interface ConstraintsInput {
  max_water_mm_year: number;
  available_machinery: string[];
  crops_without_buyer: string[];
  planting_window: { start_month: number; end_month: number };
}

export interface PilotSummary {
  id: string;
  name: LocalizedText;
  center: { lat: number; lon: number };
  area_ha: MetricValue;
  region_mode: Parcel["region_mode"];
  has_viable_options: boolean;
}

export interface PilotsResponse {
  data_status: DataStatus;
  pilots: PilotSummary[];
}

export interface AskSource {
  path: string;
  metric?: MetricValue;
  text?: string;
}

export interface AskResponse {
  answered: boolean;
  intent: string | null;
  lang: Lang;
  answer: string;
  data_status: DataStatus;
  sources: AskSource[];
}

export interface ShareResponse {
  token: string;
  path: string;
}

export interface SharedEvaluation {
  token: string;
  created_at: string;
  input: Record<string, unknown>;
  result: Evaluation;
}

export interface ApiErrorBody {
  error: string;
  message: LocalizedText;
}
