import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
const fixture = JSON.parse(
  readFileSync(
    resolve("src/lib/contract/fixtures/diamond_valley.json"),
    "utf8",
  ),
);
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift:guide", "off");
    localStorage.setItem(
      "fieldshift:a11y",
      JSON.stringify({ seen: true, reduceMotion: true }),
    );
  });
  await page.route("**/api/v1/evaluate", (r) => r.fulfill({ json: fixture }));
  await page.route("**/api/v1/predictions/**", (r) =>
    r.fulfill({ status: 503, json: { error: "offline" } }),
  );
  await page.route("**/health", (r) =>
    r.fulfill({ json: { sequence_model: { status: "fallback" } } }),
  );
}
test("inicio orbital y capítulos en rutas distintas", async ({ page }) => {
  await setup(page);
  await page.goto("/");
  await expect(page.locator("main h1")).toContainText("Observar la Tierra");
  await expect(page.locator(".present-option")).toHaveCount(0);
  await page.getByRole("link", { name: "El reto", exact: true }).click();
  await expect(page).toHaveURL(/\/presentacion\/reto$/);
  await expect(page.locator("main")).toContainText(
    "Cómo responde nuestro proyecto a la rúbrica",
  );
  await page.getByRole("link", { name: "Las personas", exact: true }).click();
  await expect(page).toHaveURL(/\/personas$/);
  await expect(page.locator("main")).toContainText("lector de pantalla");
  await page
    .getByRole("link", { name: "Evidencia", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/evidencia$/);
});
test("simulación, selección persistente y errores visibles", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/v1/simulate", (r) => r.fulfill({ json: fixture }));
  await page.goto("/presentacion/campo");
  await expect(page.locator(".present-option")).toHaveCount(3);
  await page.getByLabel("Límite anual (mm)").fill("420");
  await page
    .getByRole("button", { name: "Comprobar escenario", exact: true })
    .click();
  await expect(page.locator(".present-results")).toContainText(
    "Escenario calculado",
  );
  await page.route("**/api/v1/simulate", (r) =>
    r.fulfill({ status: 503, json: { error: "offline" } }),
  );
  await page
    .getByRole("button", { name: "Comprobar escenario", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "No se pudo comprobar",
  );
  await expect(page.locator(".present-option")).toHaveCount(0);
  await page.getByLabel("Campo de demostración").selectOption("dv-f001");
  await page.getByRole("link", { name: "Modelos", exact: true }).click();
  await expect(page.getByLabel("Parcela de análisis")).toHaveValue("dv-f001");
});
test("cada modelo tiene animación y ruta; la red usa la referencia original local", async ({
  page,
}) => {
  await setup(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/presentacion/modelos/1");
  await expect(page.locator(".present-model-metrics")).toBeVisible();
  for (const id of ["1", "2", "4", "5", "physics"]) {
    await page.locator(`.present-model-switch a[href$="/${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/modelos/${id}$`));
    await expect(
      page.locator(`.mission-mechanism[data-model="${id}"] svg`),
    ).toBeVisible();
    await expect(page.locator(".mission-mechanism")).toHaveAttribute(
      "data-paused",
      "true",
    );
  }
  await page.locator('.present-model-switch a[href$="/3"]').click();
  const frame = page.frameLocator(
    'iframe[src^="/visuals/neural-reference.html"]',
  );
  await expect(frame.locator("#neural-network-canvas")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    frame.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Morph", exact: true }).click();
  await expect(page.locator(".mission-reference")).toContainText(
    "Referencia: CodeTap",
  );
  await page
    .locator(".mission-reference")
    .screenshot({ path: "test-results/reference-network.png" });
  expect(errors).toEqual([]);
});
for (const lang of ["es", "en"]) {
  test(`capítulos y modelos móviles ${lang} AA`, async ({ page }) => {
    await setup(page);
    await page.addInitScript(
      (l) => localStorage.setItem("fieldshift:lang", l),
      lang,
    );
    await page.setViewportSize({ width: 320, height: 740 });
    for (const route of [
      "/",
      "/presentacion/reto",
      "/presentacion/campo",
      "/presentacion/personas",
      "/presentacion/evidencia",
      ...["1", "2", "3", "4", "5", "physics"].map(
        (m) => `/presentacion/modelos/${m}`,
      ),
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      if (route.includes("/modelos/"))
        await expect(
          page.locator(".present-model-metrics,.mission-mechanism"),
        ).not.toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
        route,
      ).toBeLessThanOrEqual(0);
      expect(
        (await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations,
        route,
      ).toEqual([]);
    }
    await page.goto("/");
    await page.screenshot({
      path: `test-results/orbital-home-${lang}-mobile.png`,
      fullPage: true,
    });
  });
}
test("modo sol y letra grande en capítulos y modelos", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "fieldshift:a11y",
      JSON.stringify({
        seen: true,
        reduceMotion: true,
        sun: true,
        textSize: 2,
      }),
    ),
  );
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of [
    "/",
    "/presentacion/campo",
    "/presentacion/modelos/1",
    "/presentacion/modelos/3",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      route,
    ).toBeLessThanOrEqual(0);
    expect(
      (await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations,
      route,
    ).toEqual([]);
  }
});

test("la animación de referencia funciona sin API y no presenta cifras de respaldo", async ({ page }) => {
  await setup(page);
  await page.route("**/api/v1/evaluate", route => route.abort());
  await page.goto("/presentacion/modelos/3");
  await expect(page.locator(".present-actions [role='status']")).toContainText("La API no respondió");
  await expect(page.getByTestId("fixture-banner")).toHaveCount(0);
  await expect(page.locator(".present-model-metrics")).toHaveCount(0);
  await expect(page.frameLocator(".mission-reference iframe").locator("html")).toHaveAttribute("data-visual-ready", "true");
});
