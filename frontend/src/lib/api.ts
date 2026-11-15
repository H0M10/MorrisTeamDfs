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

export const api = {
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
  analyze: (lat: number, lon: number) =>
    request<Evaluation>(
      "/api/v1/analyze",
      { method: "POST", body: JSON.stringify({ lat, lon }) },
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
