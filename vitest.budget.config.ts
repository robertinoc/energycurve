import { mergeConfig } from "vitest/config"

import base from "./vitest.config"

/**
 * The CPU budgets: tests that assert how long something takes.
 *
 * They run on their own, and never under coverage. Coverage instruments every
 * line, and that makes a tight loop about three times slower — the reorder
 * search at its cap took 1.9 s plain and 5.9 s instrumented, on the same
 * machine and the same code. A budget measured that way is a budget for the
 * instrumentation, not for the product: a real server does not run with
 * coverage on. In CI's coverage run the same test landed between 10.7 s and
 * 17.2 s against a 15 s ceiling, so it failed at random, and `verify` was red
 * on three merges in a row (#296, #299, #304) with the optimizer untouched.
 *
 *   npm run test:budget
 *
 * The files end in `.budget.ts` so the default suite (`npm test`,
 * `npm run test:coverage`) cannot pick them up by accident, and CI runs this
 * config as its own step. tests/budget-suite.test.ts holds both halves of
 * that in place: not under coverage, and not skipped.
 */
export default mergeConfig(base, {
  test: {
    include: ["tests/budget/**/*.budget.ts"],
    coverage: { enabled: false },
    // Verbose, because each budget reports the number it measured as a notice
    // and the default reporter does not print those. A red run then says by
    // how much, and a green one leaves the number in the log to compare with.
    reporters: process.env.GITHUB_ACTIONS ? ["verbose", "github-actions"] : ["verbose"],
    // One at a time: a budget measured while another file computes is a
    // measurement of the neighbour.
    fileParallelism: false,
  },
})
