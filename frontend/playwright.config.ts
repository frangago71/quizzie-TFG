import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const nodeModulesPath = path.resolve(__dirname, "./node_modules");
if (!process.env.NODE_PATH?.includes(nodeModulesPath)) {
  process.env.NODE_PATH = `${process.env.NODE_PATH ? process.env.NODE_PATH + path.delimiter : ""}${nodeModulesPath}`;
  const Module = require("module");
  if (typeof Module._initPaths === "function") {
    Module._initPaths();
  }
}

import pkg from "@playwright/test";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { defineConfig, devices } = pkg as any;

export default defineConfig({
  testDir: "../tests/e2e",
  testMatch: "**/*.spec.ts",
  globalTeardown: "../tests/e2e/teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["monocart-coverage-reports", { configFile: "./mcr.config.ts" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
