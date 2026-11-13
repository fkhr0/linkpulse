import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // each file starts its own in-memory postgres
    hookTimeout: 60_000,
    maxWorkers: 3,
  },
});
