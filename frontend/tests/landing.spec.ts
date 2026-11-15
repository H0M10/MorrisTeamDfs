import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const fixture = JSON.parse(readFileSync(resolve("src/lib/contract/fixtures/diamond_valley.json"), "utf8"));
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function mockApi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift:guide", "off");
    localStorage.setItem("fieldshift:a11y", JSON.stringify({ seen: true, reduceMotion: true }));
  });
  await page.route("**/api/v1/evaluate", r => r.fulfill({ json: fixture }));
  await page.route("**/api/v1/predictions/**", r => r.fulfill({ status: 503, json: { error: "offline" } }));
  await page.route("**/health", r => r.fulfill({ json: { sequence_model: { status: "fallback" } } }));
}

test("la presentación explica el reto y permite cambiar entre los cinco modelos y física", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.locator('[data-guide-id="home.start"]')).toHaveAttribute("href", "/tool");
  await expect(page.locator('[data-guide-id="home.steps"] li')).toHaveCount(4);
  await expect(page.locator(".present-option")).toHaveCount(3);
  await expect(page.locator("#campo-real").getByTestId("fixture-banner")).toBeVisible();
  const selectors = page.getByRole("group", { name: "Explorar modelos" });
  for (const label of ["Agua", "Cultivo anterior", "Humedad", "Secuencias", "Motor físico", "Historial"]) {
    await selectors.getByRole("button", { name: new RegExp(label) }).click();
    await expect(selectors.getByRole("button", { name: new RegExp(label) })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".present-model-intro h3")).toBeVisible();
  }
  await expect(page.locator("#red-neuronal canvas")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#limites")).toContainText("no hemos demostrado ahorros");
  await page.screenshot({ path: "test-results/presentation-desktop.png", fullPage: true });
});

test("el escenario usa la API y un fallo no presenta resultados sin verificar", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/v1/simulate", async r => {
    expect(r.request().postDataJSON().constraints.max_water_mm_year).toBe(420);
    await r.fulfill({ json: fixture });
  });
  await page.goto("/");
  await expect(page.locator(".present-option")).toHaveCount(3);
  await page.getByLabel("Límite anual (mm)").fill("420");
  await page.getByRole("button", { name: "Comprobar escenario", exact: true }).click();
  await expect(page.locator(".present-results")).toContainText("Escenario calculado");
  await page.route("**/api/v1/simulate", r => r.fulfill({ status: 503, json: { error: "offline" } }));
  await page.getByRole("button", { name: "Comprobar escenario", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("No se pudo comprobar el escenario");
  await expect(page.locator(".present-option")).toHaveCount(0);
});

test("sin API hay error honesto y reintento, sin ejemplos automáticos", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/v1/evaluate", r => r.abort());
  await page.goto("/");
  await expect(page.locator("main").getByRole("alert")).toContainText("La API no respondió");
  await expect(page.locator(".present-option")).toHaveCount(0);
  await page.route("**/api/v1/evaluate", r => r.fulfill({ json: fixture }));
  await page.getByRole("button", { name: "Ejecutar análisis" }).click();
  await expect(page.locator(".present-option")).toHaveCount(3);
});

for (const lang of ["es", "en"]) {
  test(`presentación móvil ${lang}: modelos, contraste AA y cero desbordes`, async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(l => { localStorage.setItem("fieldshift:lang", l); }, lang);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await expect(page.locator(".present-option")).toHaveCount(3);
    const selectors = page.locator(".present-model-switch");
    for (const i of [0, 1, 3, 4, 5, 2]) {
      await selectors.locator("button").nth(i).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), JSON.stringify(await page.locator("main *").evaluateAll(els => els.filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !e.closest(".table-wrap")).slice(0, 12).map(e => ({c: e.className, t: e.textContent?.slice(0,40), w: e.getBoundingClientRect().width}))))).toBeLessThanOrEqual(0);
    }
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: `test-results/presentation-${lang}-mobile.png`, fullPage: true });
  });
}

test("modo sol y letra grande conservan lectura y contraste del selector", async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift:a11y", JSON.stringify({ seen: true, reduceMotion: true, sun: true, textSize: 2 }));
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.locator(".present-option")).toHaveCount(3);
  const selectors = page.locator(".present-model-switch");
  for (const i of [0, 3, 5, 2]) {
    await selectors.locator("button").nth(i).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), JSON.stringify(await page.locator("main *").evaluateAll(els => els.filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !e.closest(".table-wrap")).slice(0, 12).map(e => ({c: e.className, t: e.textContent?.slice(0,40), w: e.getBoundingClientRect().width}))))).toBeLessThanOrEqual(0);
  }
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
});
