// Cliente tipado de la API de Field Shift. No guarda estado.
import type {
  ApiErrorBody,
  AskResponse,
  ConstraintsInput,
  Evaluation,
  Lang,
  LocalizedText,
  PilotsResponse,
  SharedEvaluation,
  ShareResponse,
} from "./contract";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://morristeamdfs-production.up.railway.app").replace(
  /\/+$/,
  "",
);

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, "offline", OFFLINE);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
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
  evaluate: (parcelId: string) => post<Evaluation>("/api/v1/evaluate", { parcel_id: parcelId }),
  simulate: (parcelId: string, constraints: ConstraintsInput) =>
    post<Evaluation>("/api/v1/simulate", { parcel_id: parcelId, constraints }),
  ask: (parcelId: string, question: string, lang: Lang, constraints?: ConstraintsInput) =>
    post<AskResponse>("/api/v1/ask", { parcel_id: parcelId, question, lang, constraints }),
  share: (input: Record<string, unknown>, result: Evaluation) =>
    post<ShareResponse>("/api/v1/share", { input, result }),
  shared: (token: string) =>
    request<SharedEvaluation>(`/api/v1/share/${encodeURIComponent(token)}`),
};
