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
export type {
  Constraints,
  LocalizedText,
  MetricValue,
  ModelReport,
  Parcel,
  Strategy,
  TimelineMonth,
};

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

export type Verdict = "approve" | "correct" | "discard";

/** Revisión del técnico local. Sin datos personales. */
export interface ReviewInput {
  verdict: Verdict;
  comments?: string;
  corrected_limits?: ConstraintsInput;
}

export interface Review {
  id: string;
  verdict: Verdict;
  comments?: string | null;
  corrected_limits?: ConstraintsInput | null;
  created_at: string;
}

export interface ReviewsResponse {
  token: string;
  reviews: Review[];
}

/** Un cultivo del banco FAO-56 (todo es supuesto declarado). */
export interface CropSummary {
  crop_code: string;
  crop_group: string;
  name: LocalizedText;
  sown: boolean;
  sold: boolean;
  machinery: string[];
}

export interface CropsResponse {
  type: MetricValue["type"];
  source: string;
  crops: CropSummary[];
}

/** Lo que leen los modelos de una parcela (GET /api/v1/predictions/{id}). No es parte del contrato. */
export interface CropReadingYear {
  year: string;
  predicted: string;
  predicted_label: LocalizedText;
  probability: number;
  probabilities: Record<string, number>;
  usda_cdl_group: string | null;
  usda_cdl_label: LocalizedText | null;
  agrees: boolean | null;
}

export interface DynamicWorldYear {
  year: string;
  n_images: number | null;
  crop_probability: number | null;
  top_class: string | null;
  top_label: LocalizedText | null;
  top_probability: number | null;
}

export interface PredictionsResponse {
  parcel_id: string;
  crop_reading: {
    status: string;
    metric_f1: number | null;
    baseline_f1: number | null;
    source: string;
    years: CropReadingYear[];
  };
  dynamic_world: {
    available: boolean;
    reason?: string;
    source: string;
    native_scale: string;
    years: DynamicWorldYear[];
  };
}

export interface ApiErrorBody {
  error: string;
  message: LocalizedText;
}
