import { expect, test } from "@playwright/test";
import evaluationFixture from "../src/lib/contract/fixtures/diamond_valley.json";

test("reduced motion moves the camera directly and missing clips stay pending", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  const availabilityChecks: string[] = [];
  const clipAssetRequests: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`${message.text()} (${message.location().url})`);
    }
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/clips/")) {
      clipAssetRequests.push(request.url());
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/showcase/clip-status/**", async (route) => {
    availabilityChecks.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ exists: false }),
    });
  });
  await page.route("**/api/v1/evaluate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(evaluationFixture),
    });
  });

  await page.goto("/showcase");
  await expect(page.getByTestId("active-layer")).toContainText("Globo");
  const zoom = page.getByTestId("zoom-controls");
  await expect(zoom).toHaveAttribute("data-camera-animating", "false");

  const clipsHeading = page.getByRole("heading", { name: "Clips animados de apoyo" });
  const clipsPosition = await clipsHeading.boundingBox();
  const viewportHeight = page.viewportSize()?.height ?? 0;
  expect(clipsPosition?.y).toBeGreaterThan(viewportHeight);
  expect(availabilityChecks).toHaveLength(0);

  await zoom.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("active-layer")).toContainText("Contexto climático");
  await expect(zoom).toHaveAttribute("data-camera-animating", "false");
  await expect(zoom).toHaveAttribute("data-camera-distance", "4");
  await expect(page.getByTestId("camera-motion-status")).toHaveText("Cámara en posición");

  const clipGlobe = page.getByTestId("clip-status-globe-to-parcel");
  const clipScales = page.getByTestId("clip-status-source-scales");
  await clipGlobe.scrollIntoViewIfNeeded();
  await expect(clipGlobe).toHaveText("Clip pendiente");
  await clipScales.scrollIntoViewIfNeeded();
  await expect(clipScales).toHaveText("Clip pendiente");
  expect(availabilityChecks).toHaveLength(4);
  expect(clipAssetRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("the clip status route handles absent files without a missing-resource response", async ({
  request,
}) => {
  const response = await request.get(
    "http://127.0.0.1:3100/showcase/clip-status/globe-to-parcel.webm",
  );
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ exists: false });
});
