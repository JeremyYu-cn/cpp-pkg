import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/types/**",
        "src/**/*.d.ts",
        "src/main.ts",
        "src/program.ts",
      ],
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
    },
  },
});