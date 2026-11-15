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
const ALL_ROUTES = ["/", "/accesibilidad", ...TOOL_ROUTES, ...JUDGE_ROUTES];
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Espera a que la página termine de pintar sus datos. */
async function ready(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator("main#contenido h1")).toBeVisible();
  if (!["/", "/accesibilidad", "/tool"].includes(route))
    await expect(page.getByTestId("fixture-banner")).toBeVisible();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length})`,
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("test:first-visit")) localStorage.setItem("fieldshift:guide", "open");
  });
});

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
  const strip = page.locator("section[aria-labelledby='strip-title']");
  await strip.locator("summary").click();
  await expect(strip.getByRole("table")).toBeVisible();
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

for (const route of [...TOOL_ROUTES.slice(1), ...JUDGE_ROUTES]) {
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
    await expect(page.locator(".step-list a[aria-current=step]")).toHaveCount(1);
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
  const section = page.locator("section[aria-labelledby='strip-title']");
  await section.locator("summary").click();
  await expect(section.locator("table tbody tr")).toHaveCount(36);
  await expect(section.locator("table tbody tr").first()).toContainText(
    "ene 2023",
  );
});

test("la parcela elegida queda guardada en el dispositivo", async ({
  page,
}) => {
  await ready(page, "/tool");
  await page.getByRole("button", { name: "Ver un campo de ejemplo" }).click();
  const select = page.getByLabel("Elige una parcela piloto");
  await select.selectOption({
    label: await select
      .locator("option", { hasText: "Parcela Restringida" })
      .first()
      .innerText(),
  });
  await page.goto("/tool/retrato");
  await expect(page.locator("main")).toContainText("Parcela Restringida");
  expect(
    await page.evaluate(() => localStorage.getItem("fieldshift:last-parcel")),
  ).toBe("dv-nv-fixture-no-viable");
});

test("objetivos táctiles de 44 px o más y texto de 18 px", async ({ page }) => {
  await ready(page, "/tool");
  const targets = page.locator(
    ".step-list a, .pager a, .lang-switch button, label.choice, select",
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
  // El mapa de /tool baja teselas de satélite y de relieve antes de quedar en reposo.
  test.setTimeout(120_000);
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

test("marcar mi campo: pivote por su centro y campo dibujado por esquinas", async ({
  page,
}) => {
  await ready(page, "/tool");
  const go = page.getByRole("button", {
    name: /Primero marca tu campo|Analizar mi campo/,
  });
  await expect(go).toBeDisabled();
  await expect(
    page.getByText("Toca el centro de tu pivote en el mapa."),
  ).toBeVisible();

  const map = page.getByRole("region", {
    name: "Mapa de satélite para marcar tu campo",
  });
  await map.scrollIntoViewIfNeeded();
  const box = await map.boundingBox();
  if (!box) throw new Error("sin mapa");
  const at = (fx: number, fy: number) =>
    page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);

  // Pivote mediano: un toque en el centro y el botón dice el área.
  await at(0.5, 0.5);
  await expect(
    page.getByRole("button", { name: /Analizar mi campo \(50 ha\)/ }),
  ).toBeEnabled();

  // Otra forma: esquinas numeradas, con instrucciones que cambian.
  await page.getByRole("button", { name: "Otra forma", exact: true }).click();
  // Los botones cambian y el mapa se mueve: se vuelve a medir.
  await map.scrollIntoViewIfNeeded();
  const box2 = await map.boundingBox();
  if (!box2) throw new Error("sin mapa");
  Object.assign(box, box2);
  await expect(
    page.getByText("Toca una esquina de tu campo en el mapa."),
  ).toBeVisible();
  await at(0.3, 0.3);
  await expect(page.getByText(/Toca 2 esquinas más/)).toBeVisible();
  await at(0.7, 0.3);
  await at(0.7, 0.7);
  await at(0.3, 0.7);
  await expect(page.getByText(/Listo: 4 esquinas/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Analizar mi campo \(\d+ ha\)/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Quitar la última esquina" }).click();
  await expect(page.getByText(/Listo: 3 esquinas/)).toBeVisible();
  await page.getByRole("button", { name: "Empezar de nuevo" }).click();
  await expect(go).toBeDisabled();
  expect(await axe(page)).toEqual([]);
});

test("marcar mi campo con el teclado: coordenadas del centro", async ({
  page,
}) => {
  await ready(page, "/tool");
  await page.getByText("Prefiero escribir las coordenadas del centro").click();
  await page.getByLabel("Latitud").fill("39.7");
  await page.getByLabel("Longitud").fill("-116.0");
  await page.getByRole("button", { name: "Poner el centro aquí" }).click();
  await page
    .getByRole("button", { name: "Grande (unas 200 ha)" })
    .click();
  await expect(
    page.getByRole("button", { name: /Analizar mi campo \(20\d ha\)/ }),
  ).toBeEnabled();
});

test("el calendario de rotaciones sale del contrato: 36 meses por rotación", async ({
  page,
}) => {
  await ready(page, "/tool/rotaciones");
  const calendar = page.getByRole("img", { name: /Calendario de 3 rotaciones/ });
  await expect(calendar).toBeVisible();
  const rows = calendar.locator(".cal-row:not(.cal-head)");
  await expect(rows).toHaveCount(9); // 3 años x 3 rotaciones
  await expect(calendar.locator(".cal-row:not(.cal-head) .crop-cell")).toHaveCount(108);
  // Primer mes de la rotación actual en el fixture: alfalfa en latencia, paja con puntos.
  const firstCell = rows.first().locator(".crop-cell").first();
  await expect(firstCell).toHaveAttribute("data-palette", "straw");
  await expect(firstCell).toHaveAttribute("data-pattern", "dots");
  await page.getByText("Ver el calendario como tabla").click();
  const table = page.locator("table", { hasText: "Qué hay en el campo cada mes" });
  await expect(table.locator("tbody tr")).toHaveCount(36);
  await expect(table.locator("tbody tr").first()).toContainText("Alfalfa en latencia");
});

test("las prioridades ordenan las rotaciones sin puntaje y quedan guardadas", async ({
  page,
}) => {
  await ready(page, "/tool/rotaciones");
  const firstColumn = page.locator("table.compare thead th").first();
  await page.getByText("Ahorrar agua", { exact: true }).first().click();
  await expect(firstColumn).toContainText("menos agua");
  await expect(page.locator(".priority-result")).toContainText("va primero porque elegiste ahorrar agua");
  await page.getByText("Cuidar el suelo", { exact: true }).first().click();
  await expect(firstColumn).toContainText("Rotación actual");
  await page.getByText("Vender lo que siembro", { exact: true }).first().click();
  await expect(page.locator(".priority-result")).toContainText("Información que falta");
  expect(
    await page.evaluate(() => localStorage.getItem("fieldshift:priorities")),
  ).toContain("market");
  expect(await axe(page)).toEqual([]);
});

test("el retrato dice cuándo queda el suelo expuesto y cuándo la helada alcanza al cultivo", async ({
  page,
}) => {
  await ready(page, "/tool/retrato");
  const section = page.getByRole("region", { name: "¿Cuándo está expuesto tu campo?" });
  await expect(section.locator("tbody tr").first()).toContainText("Poca cobertura verde");
  await expect(section.locator("tbody tr").first().locator("td")).toHaveCount(12);
  await expect(page.locator("main")).toContainText("meses con dato");
  await page.getByText("Cómo lo calculamos").click();
  await expect(page.locator("main")).toContainText("unos 50 km");
  expect(await axe(page)).toEqual([]);
});

test("la Guía saluda, explica sola la pantalla y se puede apagar", async ({
  page,
}) => {
  // Primera visita y sin voz: el tutor avanza por tiempo de lectura.
  await page.addInitScript(() => {
    sessionStorage.setItem("test:first-visit", "1");
    if (!sessionStorage.getItem("test:reloaded")) localStorage.removeItem("fieldshift:guide");
    localStorage.setItem("fieldshift:guide-voice", "0");
  });
  await ready(page, "/tool/rotaciones");
  const guide = page.getByRole("complementary", { name: "Guía" });
  // No se abre sola: espera en la esquina hasta que la persona la toca.
  await expect(page.locator(".guide-bubble")).toHaveCount(0);
  await guide.getByRole("button", { name: "Guía" }).click();
  await expect(guide).toContainText("Hola, soy la Guía");
  await guide.getByRole("button", { name: "Explícame esta pantalla" }).click();
  await expect(page.locator(".guide-spot")).toHaveCount(1, { timeout: 12_000 });
  await expect(page.locator(".guide-bubble.is-anchored")).toBeVisible();
  await guide.getByRole("button", { name: "Pausa" }).click();
  await guide.getByRole("button", { name: /Siguiente/ }).click();
  await expect(page.locator(".guide-spot")).toBeFocused();
  expect(await axe(page)).toEqual([]);
  // Cerrar el globo deja al personaje en la esquina; desde ahí se apaga.
  await guide.getByRole("button", { name: "Minimizar" }).click();
  await expect(page.locator(".guide-spot")).toHaveCount(0);
  await guide.getByRole("button", { name: "Guía" }).click();
  await guide.getByRole("button", { name: "Apagar la Guía" }).click();
  await expect(guide).toHaveCount(0);
  await page.evaluate(() => sessionStorage.setItem("test:reloaded", "1"));
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Guía" })).toHaveCount(0);
  await page.getByRole("button", { name: "Guía", exact: true }).click();
  await expect(page.locator(".guide-bubble")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Guía" })).not.toContainText("Hola, soy la Guía");
});

test("la Guía entiende órdenes escritas sin IA ni conexión", async ({ page }) => {
  await ready(page, "/tool/retrato");
  const guide = page.getByRole("complementary", { name: "Guía" });
  await guide.getByRole("button", { name: "Guía" }).click();
  await guide.getByRole("button", { name: "Escribir" }).click();
  await guide.getByLabel("Escribe tu pregunta").fill("siguiente");
  await guide.getByRole("button", { name: "Preguntar" }).click();
  await expect(page).toHaveURL(/\/tool\/restricciones$/);
});

test("/campo, que se retiró, lleva a la herramienta", async ({ page }) => {
  await page.goto("/campo");
  await expect(page).toHaveURL(/\/tool\/?$/);
});
