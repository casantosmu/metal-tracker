import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "tests/utils/global-setup.ts",
    setupFiles: "dotenv/config",
    coverage: {
      include: ["src"],
      exclude: ["src/index.ts"],
    },
  },
});
