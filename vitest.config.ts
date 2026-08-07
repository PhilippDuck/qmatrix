import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@skillgrid/shared": path.resolve(__dirname, "packages/shared/src"),
      "@skillgrid/shared/types": path.resolve(
        __dirname,
        "packages/shared/src/types/index.ts"
      ),
      "@skillgrid/shared/constants": path.resolve(
        __dirname,
        "packages/shared/src/constants/index.ts"
      ),
      "@skillgrid/shared/utils": path.resolve(
        __dirname,
        "packages/shared/src/utils/index.ts"
      ),
      "@skillgrid/shared/services": path.resolve(
        __dirname,
        "packages/shared/src/services"
      ),
      "@skillgrid/shared/store": path.resolve(
        __dirname,
        "packages/shared/src/store"
      ),
      "@skillgrid/shared/components": path.resolve(
        __dirname,
        "packages/shared/src/components"
      ),
      "@skillgrid/shared/context": path.resolve(
        __dirname,
        "packages/shared/src/context"
      ),
      "@skillgrid/shared/hooks": path.resolve(
        __dirname,
        "packages/shared/src/hooks"
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "packages/shared/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/", "packages/shared/src/**/*.test.ts"],
    },
  },
});
