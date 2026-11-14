import { defineConfig, devices } from "@playwright/test";

// Las pruebas corren contra la app ya compilada: `npm run build` antes.
// No necesitan la API: sin ella las páginas usan la copia local del fixture.
const PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1, // laptop de 8 GB: un navegador a la vez
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Cámara falsa para probar el botón de gestos sin una cámara real.
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
