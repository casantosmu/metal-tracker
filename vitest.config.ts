import { defineConfig } from "vitest/config";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    globalSetup: "tests/utils/globalSetup.ts",
    setupFiles: "dotenv/config",
    coverage: {
      all: true,
      exclude: ["src/index.ts", "tests/utils/globalSetup.ts"],
    },
  },
});
