import { mergeConfig } from "vitest/config"

import base from "./vitest.config"

/**
 * The scale measurements (lote 16, task 2). Not part of `npm test`: they talk to
 * the real dev database, take minutes, and only mean something after
 * `scripts/seed-scale.mjs` has written the volumes they read. Run with
 *
 *   npx vitest run --config vitest.perf.config.ts
 *
 * See docs/qa/carga-2026-10.md for the volumes and what each number means.
 */
export default mergeConfig(base, {
  test: {
    include: ["tests/perf/**/*.perf.ts"],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    // One file, in order: the measurements share a database and must not race.
    fileParallelism: false,
  },
})
