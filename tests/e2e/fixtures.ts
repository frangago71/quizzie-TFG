import { test as baseTest } from "@playwright/test";
import MCR from "monocart-coverage-reports";
import mcrConfig from "../../frontend/mcr.config";

const mcr = MCR(mcrConfig);

export const test = baseTest.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page }, use, testInfo) => {
      const isChromium = testInfo.project.name.includes("chromium");
      if (isChromium && page.coverage) {
        await page.coverage.startJSCoverage({
          resetOnNavigation: false,
        });
        await use();
        const jsCoverage = await page.coverage.stopJSCoverage();
        if (Array.isArray(jsCoverage) && jsCoverage.length > 0) {
          await mcr.add(jsCoverage);
        }
      } else {
        await use();
      }
    },
    { scope: "test", auto: true },
  ],
});

export { expect } from "@playwright/test";

export async function generateCoverageReport() {
  await mcr.generate();
}
