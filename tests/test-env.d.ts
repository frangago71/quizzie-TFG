/// <reference types="vite/client" />
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import "@testing-library/jest-dom/vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    not: Assertion<T>;
    resolves: Assertion<T>;
    rejects: Assertion<T>;
  }
}
