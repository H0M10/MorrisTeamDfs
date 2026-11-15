import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TOOL_ROUTES = [
  "/tool",
  "/tool/retrato",
  "/tool/restricciones",
  "/tool/rotaciones",
  "/tool/evidencia",
  "/tool/compartir",
];
const JUDGE_ROUTES = ["/showcase", "/engineer", "/remote"];
const ALL_ROUTES = ["/", ...TOOL_ROUTES, ...JUDGE_ROUTES];
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Espera a que la página termine de pintar sus datos. */
async function ready(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator("main#contenido h1")).toBeVisible();
  if (route !== "/")
    await expect(page.getByTestId("fixture-banner")).toBeVisible();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length})`,
  );
}

for (const route of ALL_ROUTES) {
  test(`axe sin violaciones AA en ${route}`, async ({ page }) => {
    await ready(page, route);
    expect(await axe(page)).toEqual([]);
  });
}

test("axe sin violaciones con la tabla de la tira abierta y en inglés", async ({
  page,
}) => {
  await ready(page, "/tool/retrato");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator("summary").click();
  await expect(page.getByRole("table")).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("vista del técnico sin enlace válido: mensaje claro y sin violaciones", async ({
  page,
}) => {
  await page.goto("/tool/revision");
  await expect(page.locator("main#contenido h1")).toHaveText(
    "Revisión del técnico",
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "no trae la clave",
  );
  // No es un paso del flujo del agricultor: sin contador ni botones de paso.
  await expect(page.getByText(/Paso \d de \d/)).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});

test("las restricciones editadas usan los códigos del motor", async ({
  page,
}) => {
  await ready(page, "/tool/restricciones");
  await expect(
    page.getByRole("checkbox", { name: "Riego de pivote central" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Empacadora de heno" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(2);
});

test("axe sin violaciones en el caso sin opción viable", async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem(
      "fieldshift:last-parcel",
      "dv-nv-fixture-no-viable",
    ),
  );
  await ready(page, "/tool/rotaciones");
  await expect(page.getByText("Ninguna rotación es viable")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await ready(page, "/tool/evidencia");
  // De una rotación descartada no se listan ventajas.
  await expect(page.getByRole("heading", { name: "Beneficios" })).toHaveCount(
    0,
  );
});

for (const route of [...TOOL_ROUTES, ...JUDGE_ROUTES]) {
  test(`"Datos de ejemplo" visible en ${route}`, async ({ page }) => {
    await ready(page, route);
    await expect(page.getByTestId("fixture-banner")).toContainText(
      "Datos de ejemplo",
    );
  });
}

test("el primer tabulador lleva al enlace para saltar al contenido", async ({
  page,
}) => {
  await ready(page, "/tool/retrato");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#contenido")).toBeFocused();
});

test("el flujo de /tool se recorre completo con teclado y el foco se ve", async ({
  page,
}) => {
  await ready(page, "/tool");
  for (const route of TOOL_ROUTES.slice(1)) {
    const next = page.locator(".pager a[rel=next]");
    await next.focus();
    const outline = await next.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${route}/?$`));
    await expect(page.locator(".step-nav a[aria-current=step]")).toHaveCount(1);
  }
  await expect(page.locator(".pager a[rel=next]")).toHaveCount(0);
});

test("la tira tiene 36 meses y una tabla alternativa con los mismos 36", async ({
  page,
}) => {
  await ready(page, "/tool/retrato");
  const strip = page.getByRole("img", { name: /36 meses/ });
  await expect(strip).toBeVisible();
  await expect(strip.locator(".strip-cell")).toHaveCount(36);
  // El primer cuadro lleva el color del fixture (#7A6C56 = rgb(122, 108, 86)).
  await expect(strip.locator(".strip-cell").first()).toHaveCSS(
    "background-color",
    "rgb(122, 108, 86)",
  );
  await page.locator("summary").click();
  await expect(page.locator("table tbody tr")).toHaveCount(36);
  await expect(page.locator("table tbody tr").first()).toContainText(
    "ene 2023",
  );
});

test("la parcela elegida queda guardada en el dispositivo", async ({
  page,
}) => {
  await ready(page, "/tool");
  const select = page.getByLabel("Elige una parcela piloto");
  await select.selectOption({
    label: await select
      .locator("option", { hasText: "San Juan del Río" })
      .first()
      .innerText(),
  });
  await page.goto("/tool/retrato");
  await expect(page.locator("main")).toContainText("San Juan del Río");
  expect(
    await page.evaluate(() => localStorage.getItem("fieldshift:last-parcel")),
  ).toBe("qro-sjr-fixture-01");
});

test("objetivos táctiles de 44 px o más y texto de 18 px", async ({ page }) => {
  await ready(page, "/tool");
  const targets = page.locator(
    ".step-nav a, .pager a, .lang-switch button, label.choice, select",
  );
  for (const box of await targets.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect()),
  )) {
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const fontSize = await page
    .locator("main p")
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(18);
  const family = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain("Atkinson Hyperlegible Next");
});

test("en 320 px de ancho (zoom alto) no hay desplazamiento horizontal en /tool", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of TOOL_ROUTES) {
    await ready(page, route);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});

test("la hoja impresa oculta la navegación y conserva la etiqueta de ejemplo", async ({
  page,
}) => {
  await ready(page, "/tool/compartir");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".step-nav")).toBeHidden();
  await expect(page.locator(".pager")).toBeHidden();
  await expect(page.getByRole("button", { name: /Imprimir/ })).toBeHidden();
  await expect(page.getByTestId("fixture-banner")).toBeVisible();
  await expect(page.locator("table").first()).toBeVisible();
});

test("/tool no descarga three ni MediaPipe; /showcase sí descarga three", async ({
  page,
}) => {
  const scripts = new Map<string, string>();
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    try {
      scripts.set(response.url(), await response.text());
    } catch {
      // respuesta sin cuerpo (caché): no trae código nuevo
    }
  });
  const loaded = (marker: string) =>
    [...scripts.values()].some((body) => body.includes(marker));

  for (const route of TOOL_ROUTES) {
    await ready(page, route);
    await page.waitForLoadState("networkidle");
  }
  expect(scripts.size).toBeGreaterThan(0);
  expect(loaded("THREE.WebGLRenderer")).toBe(false);
  expect(loaded("mediapipe")).toBe(false);

  await ready(page, "/showcase");
  await expect(page.locator(".canvas-frame canvas")).toBeVisible();
  expect(loaded("THREE.WebGLRenderer")).toBe(true);
  expect(loaded("mediapipe")).toBe(false); // hoy nadie lo importa
});

test("el botón de gestos solicita cámara tras pulsarlo y conserva alternativa si se deniega", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          Reflect.set(
            window,
            "__cameraRequestCount",
            Number(Reflect.get(window, "__cameraRequestCount") ?? 0) + 1,
          );
          throw new DOMException("Camera permission denied", "NotAllowedError");
        },
      },
    });
  });
  await ready(page, "/showcase");
  await expect(page.getByTestId("camera-status")).toBeEmpty();
  await page
    .getByRole("button", { name: "Activar control por gestos" })
    .click();
  await expect(page.getByTestId("camera-status")).toContainText(
    "Sin permiso de cámara",
  );
  expect(
    await page.evaluate(() => Reflect.get(window, "__cameraRequestCount")),
  ).toBe(1);
});

test("/showcase permite recorrer los meses con teclado", async ({ page }) => {
  await ready(page, "/showcase");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/Mes: feb 2023/)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText(/Mes: ene 2023/)).toBeVisible();
});
