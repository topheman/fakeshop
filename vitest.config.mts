import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // `e2e/` is Playwright's; its specs would otherwise match Vitest's default
    // include and fail on the `@playwright/test` import.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
