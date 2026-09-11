import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * Retention on `analyses`.
 *
 * The table stores the full energy `curve`, every `issue`, the complete score
 * `breakdown` and the `suggested_order` for every analysis ever run — and
 * reading every query against it shows that no feature reads any of them. Only
 * the portability export does, and an export returning data is a consequence of
 * holding it rather than a reason to.
 *
 * The test that matters most here is not that old blobs go. It is that the
 * **row stays**: `input_hash` is what stops re-analysing an unchanged set from
 * writing a duplicate, and `set_score` with `created_at` is the score history on
 * the dashboard. A sweep that deleted rows would silently break both.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

const { sweepAnalysisBlobs, ANALYSIS_BLOB_RETENTION_DAYS } = await import(
  "@/services/retention-service"
)

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function analysis(id: string, ageDays: number, scrubbed = false) {
  return {
    id,
    playlist_id: "pl-1",
    user_id: "profile-1",
    set_score: 7.4,
    input_hash: `hash-${id}`,
    created_at: daysAgo(ageDays),
    curve: scrubbed ? null : [4, 5, 7, 8],
    issues: scrubbed ? null : [{ code: "energy_drop" }],
    breakdown: scrubbed ? null : { flow: 8 },
    suggested_order: scrubbed ? null : ["t2", "t1"],
  }
}

beforeEach(() => {
  fake = createFakeSupabase({
    analyses: [
      analysis("old", ANALYSIS_BLOB_RETENTION_DAYS + 40),
      analysis("recent", 30),
    ],
  })
})

describe("what the sweep drops", () => {
  it("clears the four unread blobs on an aged analysis", async () => {
    const cleared = await sweepAnalysisBlobs()

    expect(cleared).toBe(1)

    const old = fake.tables.analyses.find((row) => row.id === "old")
    expect(old?.curve).toBeNull()
    expect(old?.issues).toBeNull()
    expect(old?.breakdown).toBeNull()
    expect(old?.suggested_order).toBeNull()
  })

  it("leaves an analysis inside the window untouched", async () => {
    await sweepAnalysisBlobs()

    const recent = fake.tables.analyses.find((row) => row.id === "recent")
    expect(recent?.curve).toEqual([4, 5, 7, 8])
  })
})

describe("what the sweep must never drop", () => {
  it("keeps the row, because deleting it would let a duplicate be written", async () => {
    await sweepAnalysisBlobs()

    expect(fake.tables.analyses).toHaveLength(2)
    expect(fake.log.some((statement) => statement.op === "delete")).toBe(false)
  })

  it("keeps input_hash, set_score and created_at", async () => {
    await sweepAnalysisBlobs()

    const old = fake.tables.analyses.find((row) => row.id === "old")

    // input_hash is the dedupe key; set_score and created_at are the dashboard
    // sparkline. Scrubbing any of these would break a feature to save nothing —
    // they are three scalars next to four blobs.
    expect(old?.input_hash).toBe("hash-old")
    expect(old?.set_score).toBe(7.4)
    expect(old?.created_at).toBeDefined()
  })
})

describe("running it twice", () => {
  it("reports zero the second time instead of rewriting every row", async () => {
    await sweepAnalysisBlobs()

    await expect(sweepAnalysisBlobs()).resolves.toBe(0)
  })

  it("skips rows that are already scrubbed", async () => {
    fake = createFakeSupabase({
      analyses: [analysis("already", ANALYSIS_BLOB_RETENTION_DAYS + 100, true)],
    })

    await expect(sweepAnalysisBlobs()).resolves.toBe(0)
  })
})

describe("failure", () => {
  it("throws, so the cron reports it rather than logging a silent zero", async () => {
    fake.failNext("analyses", "permission denied")

    await expect(sweepAnalysisBlobs()).rejects.toThrow()
  })
})
