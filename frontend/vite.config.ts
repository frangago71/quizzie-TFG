import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@testing-library": path.resolve(
        __dirname,
        "./node_modules/@testing-library",
      ),
      "react-router-dom": path.resolve(
        __dirname,
        "./node_modules/react-router-dom",
      ),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "html5-qrcode": path.resolve(__dirname, "./node_modules/html5-qrcode"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          icons: ["lucide-react"],
          qr: ["html5-qrcode", "qrcode.react"],
        },
      },
    },
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [
      path.resolve(__dirname, "../tests/frontend/setup.ts").replace(/\\/g, "/"),
    ],
    include: [
      path
        .resolve(__dirname, "../tests/frontend/**/*.test.{ts,tsx}")
        .replace(/\\/g, "/"),
    ],
    exclude: ["../tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/auth/**/*.{ts,tsx}",
        "src/management/**/*.{ts,tsx}",
        "src/room-access/**/*.{ts,tsx}",
        "src/room-play/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.{ts,tsx}", "../tests/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
} as Record<string, unknown>);
