import { defineConfig, devices } from "@playwright/test";

const PORT = 4100;
const url = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: url,
    locale: "en-US",
    trace: "retain-on-failure",
    // locally: the installed Edge (PW_CHANNEL=msedge), CI: playwright's chromium
    ...devices["Desktop Chrome"],
    channel: process.env.PW_CHANNEL || undefined,
  },
  // needs the web build: npm run build -w apps/web
  webServer: {
    command: "npx tsx apps/api/src/server.ts",
    url: `${url}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      PUBLIC_URL: url,
      WEB_ORIGINS: url,
      WEB_DIR: "apps/web/dist",
    },
  },
});
