import { generateCoverageReport } from "./fixtures";

async function globalTeardown() {
  await generateCoverageReport();
}

export default globalTeardown;
