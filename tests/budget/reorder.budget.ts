import { expect, it } from "vitest"

import { optimizeOrder, REORDER_MAX_TRACKS } from "@/lib/engine/reorder"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/**
 * What the reorder search costs at its cap.
 *
 * The search is 2-opt over a whole-order objective — O(passes · n²) candidate
 * swaps, each scored in O(n) — and it runs inside a server render. Past a
 * certain cost the page does not get slow: it times out and the DJ gets
 * nothing. `REORDER_MAX_TRACKS` is the cap that keeps it inside a render, and
 * this is the number that says the cap still does.
 *
 * It lives here, outside the default suite, because the default suite runs
 * under coverage in CI and coverage triples the cost of this loop (see
 * vitest.budget.config.ts). What the cap protects is the uninstrumented
 * search, so that is what is timed.
 */

/** The same set tests/reorder.test.ts searches at the cap: energies and keys. */
function energies(n: number): ResolvedTrackEnergy[] {
  return Array.from({ length: n }, (_, i) => ({
    trackId: `t${i}`,
    position: i + 1,
    score: 1 + ((i * 37) % 90) / 10,
    source: "manual" as const,
    bpm: 128,
    camelot: `${((i * 5) % 12) + 1}${i % 2 === 0 ? "A" : "B"}`,
  }))
}

/**
 * The ceiling, in milliseconds of CPU.
 *
 * It was 15 s while the test ran instrumented. The instrumentation cost a
 * factor of about 2.7 (10/11/2026, same machine, same code: 6.0–6.3 s under
 * coverage, 2.2–2.3 s without), so 15 s was really a ceiling of about 5.5 s on
 * the search itself — and the CI runner, which is two to three times slower
 * than a laptop, sat right on it: 10.7 s to 17.2 s instrumented, i.e. roughly
 * 4 s to 6.4 s of actual search. That is why it failed at random.
 *
 * 8 s is deliberately above that range and deliberately not far above it. In
 * real terms it is looser than the old ceiling was (about 5.5 s → 8 s), and
 * that is the honest part: the old one was tighter than the runner's own
 * spread. It is still a budget and not a formality — the search costs about
 * twice as much at 100 tracks as at 80 (lib/engine/reorder.ts), so raising
 * the cap to 100, or anything else that doubles the cost, fails here on the
 * runner. If the number printed in CI turns out to sit well under 5 s run
 * after run, bring this down; do not raise it without a measurement that
 * says why.
 */
const BUDGET_MS = 8_000

it("the reorder search stays inside a server render's budget at the cap", async ({ annotate }) => {
  // CPU time of this process, not wall time: on a runner with few cores the
  // wall clock also counts the time spent waiting for other work.
  const start = process.cpuUsage()
  optimizeOrder(energies(REORDER_MAX_TRACKS), "house", "main", null)
  const used = process.cpuUsage(start)
  const ms = (used.user + used.system) / 1000

  // Printed on purpose. The next time this is red, or close, the run says by
  // how much instead of leaving someone to guess whether it was "the usual".
  await annotate(
    `[budget] reorder at ${REORDER_MAX_TRACKS} tracks: ${Math.round(ms)} ms of CPU (ceiling ${BUDGET_MS} ms)`
  )

  expect(ms).toBeLessThan(BUDGET_MS)
}, 60_000)
