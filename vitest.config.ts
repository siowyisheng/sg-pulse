import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // One process runs every file, so the in-memory Postgres is built and migrated once, not once
    // per file (see src/testing/harness.ts). The tests share that database, one at a time.
    pool: "forks",
    isolate: false,
    fileParallelism: false,
  },
});
