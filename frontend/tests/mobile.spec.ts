import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/tool", "/tool/retrato", "/tool/restricciones", "/tool/rotaciones",
  "/tool/evidencia", "/tool/compartir", "/accesibilidad"];

for (const config of [
  { width: 320, lang: "es", textSize: 0 },
  { width: 390, lang: "en", textSize: 0 },
  { width: 430, lang: "es", textSize: 0 },
  { width: 320, lang: "en", textSize: 2 },
]) {
  test(`flujo móvil ${config.width}px ${config.lang} letra ${config.textSize}`, async ({ page }) => {
    await page.setViewportSize({ width: config.width, height: 844 });
    await page.addInitScript(({ lang, textSize }) => {
      localStorage.setItem("fieldshift:lang", lang);
      localStorage.setItem("fieldshift:guide", "off");
      localStorage.setItem("fieldshift:a11y", JSON.stringify({ textSize, seen: true, reduceMotion: true }));
    }, config);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      if (!["/tool", "/accesibilidad"].includes(route)) {
        await expect(page.getByTestId("fixture-banner")).toBeVisible();
      }
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, route).toBeLessThanOrEqual(0);
      if (route === "/tool" || route === "/tool/restricciones") {
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(result.violations, route).toEqual([]);
      }
    }
  });
}

test("mapa, coordenadas y ajustes son utilizables en 320 px con letra grande", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift:guide", "off");
    localStorage.setItem("fieldshift:a11y", JSON.stringify({ textSize: 2, seen: true, reduceMotion: true }));
  });
  await page.goto("/tool");
  await page.locator(".picker-keyboard summary").click();
  await page.getByPlaceholder("39.7000").fill("39,7000");
  await page.getByPlaceholder("-116.0000").fill("-116,0000");
  await expect(page.getByPlaceholder("-116.0000")).toHaveAttribute("inputmode", "text");
  await page.locator(".picker-keyboard button").click();
  await expect(page.locator(".picker-go")).toBeEnabled();
  await page.getByPlaceholder("39.7000").fill("95");
  await page.locator(".picker-keyboard button").click();
  await expect(page.locator(".picker-error")).toBeVisible();
  await page.getByRole("button", { name: "Ajustes de lectura" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const overflow = await page.getByRole("dialog").evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("dialog").evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.getByRole("button", { name: "Listo", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("la Guía y los controles del mapa caben en un teléfono", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift:guide", "off");
    localStorage.setItem("fieldshift:a11y", JSON.stringify({ seen: true, reduceMotion: true }));
  });
  await page.goto("/tool");
  await expect(page.locator(".map-card")).toBeVisible();
  await page.locator(".map-card").screenshot({ path: "test-results/mobile-map-after.png" });
  await page.getByRole("button", { name: "Guía", exact: true }).first().click();
  await page.getByRole("button", { name: "Escribir", exact: true }).click();
  await expect(page.locator(".guide-ask input")).toBeVisible();
  const width = await page.locator(".guide-ask input").evaluate(el => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThanOrEqual(120);
  expect(await page.locator(".guide-bubble").evaluate(el => el.scrollWidth - el.clientWidth))
    .toBeLessThanOrEqual(0);
  await page.screenshot({ path: "test-results/mobile-guide-after.png" });
  await page.locator(".guide-close").click();
  await page.getByRole("button", { name: "Ajustes de lectura" }).click();
  await page.screenshot({ path: "test-results/mobile-settings-after.png" });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});
