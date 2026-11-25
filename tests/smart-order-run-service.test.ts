import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The write must never cost the DJ their order, and the read must tell "the
 * table isn't there" apart from "the read failed" apart from "nothing ran".
 */

const insert = vi.fn()
const select = vi.fn()
const logError = vi.fn()
const logWarn = vi.fn()

vi.mock("server-only", () => ({}))
vi.mock("@/lib/observability/logger", () => ({ logError, logWarn, logInfo: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      insert,
      select: () => ({
        gte: () => ({ order: () => ({ limit: select }) }),
      }),
    }),
  }),
}))

const { recordSmartOrderRun, readRecentSmartOrderRuns } = await import(
  "@/services/smart-order-run-service"
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("recordSmartOrderRun", () => {
  it("writes the source, and the reason only for a fallback", async () => {
    insert.mockResolvedValue({ error: null })

    await recordSmartOrderRun({ source: "fallback", reason: "unfunded" })
    await recordSmartOrderRun({ source: "claude", reason: null })

    expect(insert).toHaveBeenNthCalledWith(1, { source: "fallback", reason: "unfunded" })
    expect(insert).toHaveBeenNthCalledWith(2, { source: "claude", reason: null })
  })

  it("logs a failed write instead of throwing it at the ordering", async () => {
    insert.mockResolvedValue({ error: { message: "boom" } })
    await expect(recordSmartOrderRun({ source: "fallback", reason: "timeout" })).resolves.toBeUndefined()

    insert.mockRejectedValue(new Error("network"))
    await expect(recordSmartOrderRun({ source: "claude", reason: null })).resolves.toBeUndefined()

    expect(logError).toHaveBeenCalledTimes(2)
  })
})

describe("readRecentSmartOrderRuns", () => {
  it("reports a missing table as not migrated", async () => {
    select.mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find the table 'public.smart_order_runs'" },
    })

    await expect(readRecentSmartOrderRuns()).resolves.toEqual({
      available: false,
      cause: "not_migrated",
    })
  })

  it("reports any other error as a failed read", async () => {
    select.mockResolvedValue({ data: null, error: { code: "57014", message: "timeout" } })

    await expect(readRecentSmartOrderRuns()).resolves.toEqual({
      available: false,
      cause: "read_failed",
    })
  })

  it("returns an empty, available record when nothing ran", async () => {
    select.mockResolvedValue({ data: [], error: null })

    await expect(readRecentSmartOrderRuns()).resolves.toEqual({ available: true, runs: [] })
  })
})
