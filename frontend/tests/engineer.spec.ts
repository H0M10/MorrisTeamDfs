import { expect, test, type Page } from "@playwright/test";
import { getMockModelsRegistry } from "../src/app/engineer/_lib/mock";
import { empiricalCoverage, meanWidth } from "../src/app/engineer/_lib/metrics";
import {
  isModelTrained,
  LIVE_NETWORK_MODEL,
} from "../src/app/engineer/_lib/types";

const MOCK_MODE = process.env.NEXT_PUBLIC_ENGINEER_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

test.describe("pure engineer helpers", () => {
  test("requires an exact trained status", () => {
    expect(isModelTrained(undefined, LIVE_NETWORK_MODEL)).toBe(false);
    expect(isModelTrained(null, LIVE_NETWORK_MODEL)).toBe(false);
    expect(isModelTrained({ [LIVE_NETWORK_MODEL]: null }, LIVE_NETWORK_MODEL)).toBe(false);
    expect(isModelTrained({ [LIVE_NETWORK_MODEL]: {} }, LIVE_NETWORK_MODEL)).toBe(false);
    expect(isModelTrained({ [LIVE_NETWORK_MODEL]: { status: "training" } }, LIVE_NETWORK_MODEL)).toBe(false);
    expect(isModelTrained({ [LIVE_NETWORK_MODEL]: { status: "trained" } }, LIVE_NETWORK_MODEL)).toBe(true);
  });

  test("uses only the permitted mock status query values", () => {
    expect(getMockModelsRegistry("?mockStatus=trained")[LIVE_NETWORK_MODEL]?.status).toBe("trained");
    expect(getMockModelsRegistry("?mockStatus=training")[LIVE_NETWORK_MODEL]?.status).toBe("training");
    expect(getMockModelsRegistry("?mockStatus=failed")[LIVE_NETWORK_MODEL]?.status).toBe("failed");
    expect(getMockModelsRegistry("?mockStatus=absent")[LIVE_NETWORK_MODEL]?.status).toBeUndefined();
    expect(getMockModelsRegistry("")[LIVE_NETWORK_MODEL]?.status).toBeUndefined();
  });

  test("computes empirical coverage and mean interval width", () => {
    const points = [
      { month: "month-a", y: 1, lo: 0, hi: 2, confidence: 0.9, unit: "u", source: "test", date: "a", nativeScale: "scale" },
      { month: "month-b", y: 4, lo: 1, hi: 3, confidence: 0.9, unit: "u", source: "test", date: "b", nativeScale: "scale" },
      { month: "month-c", y: 2, lo: 2, hi: 2, confidence: 0.9, unit: "u", source: "test", date: "c", nativeScale: "scale" },
    ];
    expect(empiricalCoverage(points)).toBeCloseTo(2 / 3);
    expect(meanWidth(points)).toBeCloseTo(4 / 3);
    expect(empiricalCoverage([])).toBeNull();
    expect(meanWidth([])).toBeNull();
  });

  test("rejects malformed CQR points", () => {
    expect(() =>
      meanWidth([
        {
          month: "bad",
          y: 0,
          lo: 2,
          hi: 1,
          confidence: 0.9,
          unit: "u",
          source: "test",
          date: "test",
          nativeScale: "test",
        },
      ]),
    ).toThrow(RangeError);
  });
});

async function interceptEvaluationApi(page: Page, status?: string): Promise<void> {
  const registry = getMockModelsRegistry("");
  const model = registry[LIVE_NETWORK_MODEL];
  if (model && status !== undefined) model.status = status;
  const evaluation = { data_status: "fixture", models: registry, timeline: [] };
  await page.route("**/health", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ models: registry }) }),
  );
  await page.route("**/api/v1/evaluate", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(evaluation) }),
  );
}

async function openEngineer(page: Page, status?: string): Promise<void> {
  if (MOCK_MODE) {
    const query = status ? `?mockStatus=${status}` : "";
    await page.goto(`/engineer${query}`);
  } else {
    await interceptEvaluationApi(page, status);
    await page.goto("/engineer");
  }
}

test("live network appears for a trained model", async ({ page }) => {
  await openEngineer(page, "trained");
  await expect(page.getByRole("heading", { name: /Red en vivo/ })).toHaveCount(1);
  await expect(page.getByText("Datos de ejemplo", { exact: true })).toBeVisible();
});

for (const status of ["training", "failed", undefined]) {
  test(`live network is absent for ${status ?? "missing"} status`, async ({ page }) => {
    await openEngineer(page, status);
    await expect(page.getByRole("heading", { name: /Red en vivo/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Métricas de los modelos/ })).toBeVisible();
  });
}

test("live network is absent when the API request fails", async ({ page }) => {
  test.skip(MOCK_MODE, "Mock mode does not make API requests.");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/v1/evaluate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data_status: "fixture", models: getMockModelsRegistry(""), timeline: [] }),
    }),
  );
  await page.goto("/engineer");
  await expect(page.locator("p[role=alert]")).toContainText("No se pudo cargar");
  await expect(page.getByRole("heading", { name: /Red en vivo/ })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("deployed real evaluation hides the example banner and preserves the Model 2 result", async ({
  page,
}) => {
  test.skip(MOCK_MODE || !API_URL, "Requires mock mode disabled and the deployed API URL.");
  const healthResponse = await page.request.get(`${API_URL}/health`);
  expect(healthResponse.ok()).toBe(true);
  const evaluationResponse = await page.request.post(`${API_URL}/api/v1/evaluate`, {
    data: { parcel_id: "dv-nv-01" },
  });
  expect(evaluationResponse.ok()).toBe(true);
  const evaluation = (await evaluationResponse.json()) as {
    data_status: string;
    models: Record<string, { metric?: { value?: number | null; unit?: string } }>;
  };
  expect(evaluation.data_status).toBe("real");
  expect(evaluation.models.model_2_prior_crop_effect?.metric?.value).toBe(-6.3);

  const health = await healthResponse.json();
  await page.route("**/health", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(health) }),
  );
  await page.route("**/api/v1/evaluate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(evaluation),
    }),
  );
  await page.goto("/engineer");
  await expect(page.getByText("Datos de ejemplo", { exact: true })).toHaveCount(0);
  const negativeResult = page.getByRole("row").filter({ hasText: "-6.3" });
  const baselineResult = page.getByRole("row").filter({ hasText: "0.145" });
  await expect(negativeResult).toContainText("-6.3");
  await expect(negativeResult).toContainText(/diamond_valley_nv/);
  await expect(negativeResult).toContainText(/no causal ni de ahorro de agua/i);
  await expect(baselineResult).toContainText("0.145");
  await expect(baselineResult).toContainText(/sin el cultivo anterior/i);
  const cqrResult = page.getByRole("row").filter({ hasText: "58.3333" });
  const cqrBaseline = page.getByRole("row").filter({ hasText: "22.9167" });
  await expect(cqrResult).toContainText("58.3333");
  await expect(cqrResult).toContainText(/90%/);
  await expect(cqrBaseline).toContainText("22.9167");
  await expect(page.getByText(/This evaluation does not provide/)).toHaveCount(0);
  await expect(page.getByText(/Esta evaluación no entrega observaciones/)).toBeVisible();
});

test("parcel evaluation status takes precedence over the global model registry", async ({ page }) => {
  test.skip(MOCK_MODE || !API_URL, "Requires mock mode disabled and the deployed API URL.");
  const [healthResponse, evaluationResponse] = await Promise.all([
    page.request.get(`${API_URL}/health`),
    page.request.post(`${API_URL}/api/v1/evaluate`, {
      data: { parcel_id: "qro-sjr-01" },
    }),
  ]);
  expect(healthResponse.ok()).toBe(true);
  expect(evaluationResponse.ok()).toBe(true);
  const health = await healthResponse.json();
  const evaluation = (await evaluationResponse.json()) as {
    data_status: string;
    models?: Record<string, { status?: string }>;
  };
  expect(evaluation.data_status).toBe("real");
  expect(evaluation.models?.model_2_prior_crop_effect?.status).toBe("absent");
  await page.route("**/health", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(health) }),
  );
  await page.route("**/api/v1/evaluate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(evaluation),
    }),
  );
  await page.goto("/engineer");
  const absentModel = page
    .getByRole("row")
    .filter({ hasText: "Mejora frente al mismo modelo sin el cultivo anterior" });
  await expect(page.getByText("Datos de ejemplo", { exact: true })).toHaveCount(0);
  await expect(absentModel).toContainText("absent");
  await expect(absentModel).toContainText("Modelo pendiente de entrenamiento");
  if (evaluation.models?.model_3_crop_history_gru?.status === "trained") {
    await expect(page.getByRole("heading", { name: /Red en vivo/ })).toHaveCount(1);
  } else {
    await expect(page.getByRole("heading", { name: /Red en vivo/ })).toHaveCount(0);
  }
});
