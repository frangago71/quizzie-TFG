import type { CoverageReportOptions } from "monocart-coverage-reports";

const config: CoverageReportOptions = {
  name: "Playwright E2E Coverage Report",
  outputDir: "./coverage-e2e",
  reports: [
    "v8",
    "console-details",
  ],
  entryFilter: (entry: { url: string }) =>
    entry.url.includes("/assets/") ||
    entry.url.includes("/src/") ||
    entry.url.includes("@fs"),
  sourceFilter: (sourcePath: string) => {
    const isTargetDomain =
      sourcePath.includes("src/auth/") ||
      sourcePath.includes("src/management/") ||
      sourcePath.includes("src/room-access/") ||
      sourcePath.includes("src/room-play/");
    const isTestFile =
      sourcePath.includes(".test.") ||
      sourcePath.includes(".spec.") ||
      sourcePath.includes("node_modules");
    const isModal = sourcePath.includes("Modal");
    return isTargetDomain && !isTestFile && !isModal;
  },
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
};

export default config;
