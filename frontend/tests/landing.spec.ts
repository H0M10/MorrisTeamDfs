import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("la portada carga red neuronal 3D, controles MORPH/FREEZE/RESET y espacios Higgsfield", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  // 1. Entrada a la herramienta y pasos de Guía preservados
  const startLink = page.locator('[data-guide-id="home.start"]');
  await expect(startLink).toBeVisible();
  await expect(startLink).toHaveAttribute("href", "/tool");
  await expect(page.locator('[data-guide-id="home.steps"] li')).toHaveCount(4);

  // 2. Lienzo WebGL del Modelo 3 y etiqueta de datos de ejemplo cuando corresponde
  const section = page.locator("#red-neuronal");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByTestId("fixture-banner")).toBeVisible();
  await expect(section.locator(".nn-canvas-frame canvas")).toBeVisible({
    timeout: 15_000,
  });

  // 3. Controles MORPH / FREEZE / RESET
  const readout = section.locator(".nn-mode-readout");
  await expect(readout).toContainText("Constelación");

  await section.getByRole("button", { name: /MORPH/ }).click();
  await expect(readout).toContainText("Ciclo 36 meses");

  await section.getByRole("button", { name: /MORPH/ }).click();
  await expect(readout).toContainText("Capas GRU");

  const freezeBtn = section.getByRole("button", { name: "FREEZE" });
  await freezeBtn.click();
  await expect(section.getByRole("button", { name: "REANUDAR" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await section.getByRole("button", { name: "RESET" }).click();
  await expect(readout).toContainText("Constelación");
  await expect(section.getByRole("button", { name: "FREEZE" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // 4. Espacios Higgsfield listos con aviso de ilustración
  await expect(page.locator("#animaciones article")).toHaveCount(3);
  await expect(page.locator("#animaciones")).toContainText("hf-01-orbit-valley.mp4");

  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await section.screenshot({ path: "test-results/landing-neural.png" });
  expect(pageErrors).toEqual([]);
});

test("la portada mantiene WCAG AA en inglés + Modo Sol y 0 overflow en 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift:lang", "en");
    localStorage.setItem(
      "fieldshift:a11y",
      JSON.stringify({
        textSize: 0,
        sun: true,
        plain: false,
        readAloud: false,
        reduceMotion: false,
        units: "auto",
        seen: true,
      }),
    );
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-sun", "");
  await expect(page.locator("#red-neuronal")).toContainText("Live brain: Model 3");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
});
