// Cliente tipado de la API de Field Shift. No guarda estado.
import type {
  ApiErrorBody,
  AskResponse,
  ConstraintsInput,
  CropsResponse,
  PredictionsResponse,
  Evaluation,
  Lang,
  LocalizedText,
  PilotsResponse,
  ReviewInput,
  ReviewsResponse,
  SharedEvaluation,
  ShareResponse,
} from "./contract";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010"
).replace(/\/+$/, "");

const TIMEOUT_MS = 8000;

/** Error de la API con mensaje en los dos idiomas. `status` 0 = sin conexión. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly localized: LocalizedText,
  ) {
    super(localized.es);
    this.name = "ApiError";
  }
}

const OFFLINE: LocalizedText = {
  es: "No hay conexión con el servidor.",
  en: "Cannot reach the server.",
};

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError(0, "offline", OFFLINE);
  }
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as Partial<ApiErrorBody> | null;
    throw new ApiError(
      response.status,
      body?.error ?? "http_error",
      body?.message ?? {
        es: `El servidor respondió con error ${response.status}.`,
        en: `The server answered with error ${response.status}.`,
      },
    );
  }
  return (await response.json()) as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });


/** Pantallas de /tool que entiende POST /api/v1/guide. */
export type GuideStep =
  | "parcela"
  | "retrato"
  | "restricciones"
  | "rotaciones"
  | "evidencia"
  | "compartir"
  | "revision";

export interface GuideRequest {
  screen: GuideStep;
  question: string;
  lang: "es" | "en";
  visible_guide_ids: string[];
  guide_items: { id: string; text: string }[];
  fields?: Record<string, string | number | boolean | null>;
  transcript?: string | null;
  profile?: { plain_language: boolean };
  session_id?: string;
}

export interface GuideResponse {
  answer: string;
  highlight: string[];
  go_to_step: GuideStep | null;
  terms: string[];
  set_constraint: {
    max_water_mm_year: { value: number; unit: "mm" | "in" | "acre_ft"; value_mm: number } | null;
    crops_without_buyer: string[];
    machinery_have?: string[];
    machinery_missing?: string[];
    planting_window?: { start_month: number; end_month: number } | null;
    priority?: "water" | "soil" | "climate" | null;
    heard: string;
    needs_confirmation: true;
  } | null;
  source: "llm" | "rules";
  lang: "es" | "en";
}

export const api = {
  /** La Guía: sin llave de IA responde con reglas; con llave, la IA redacta sin cifras propias. */
  guide: (body: GuideRequest) => request<GuideResponse>("/api/v1/guide", { method: "POST", body: JSON.stringify(body) }, 15_000),
  pilots: () => request<PilotsResponse>("/api/v1/pilots"),
  crops: () => request<CropsResponse>("/api/v1/crops"),
  predictions: (parcelId: string) =>
    request<PredictionsResponse>(
      `/api/v1/predictions/${encodeURIComponent(parcelId)}`,
      undefined,
      40_000,
    ),
  evaluate: (parcelId: string) =>
    post<Evaluation>("/api/v1/evaluate", { parcel_id: parcelId }),
  /** Analiza en vivo un punto: trae satélite y clima. Tarda de 30 a 90 s la primera vez. */
  analyze: (lat: number, lon: number, polygon?: [number, number][]) =>
    request<Evaluation>(
      "/api/v1/analyze",
      { method: "POST", body: JSON.stringify({ lat, lon, polygon }) },
      150_000,
    ),
  simulate: (parcelId: string, constraints: ConstraintsInput) =>
    post<Evaluation>("/api/v1/simulate", { parcel_id: parcelId, constraints }),
  ask: (
    parcelId: string,
    question: string,
    lang: Lang,
    constraints?: ConstraintsInput,
  ) =>
    post<AskResponse>("/api/v1/ask", {
      parcel_id: parcelId,
      question,
      lang,
      constraints,
    }),
  share: (input: Record<string, unknown>, result: Evaluation) =>
    post<ShareResponse>("/api/v1/share", { input, result }),
  shared: (token: string) =>
    request<SharedEvaluation>(`/api/v1/share/${encodeURIComponent(token)}`),
  reviews: (token: string) =>
    request<ReviewsResponse>(
      `/api/v1/share/${encodeURIComponent(token)}/reviews`,
    ),
  review: (token: string, review: ReviewInput) =>
    post<ReviewsResponse>(
      `/api/v1/share/${encodeURIComponent(token)}/reviews`,
      review,
    ),
};
