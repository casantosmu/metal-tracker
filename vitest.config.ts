import { defineConfig } from "vitest/config";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    globalSetup: "tests/utils/global-setup.ts",
    setupFiles: "dotenv/config",
    coverage: {
      all: true,
      include: ["src"],
      exclude: ["src/index.ts"],
    },
  },
});
