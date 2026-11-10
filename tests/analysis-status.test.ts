import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `getAnalysisStatus` decides whether the playlist page pushes the analysis
 * (step 1.2 of docs/conversion-plan.md). Two things matter: that it asks about
 * this owner's set and nobody else's, and that a failed read is `unknown` —
 * which the page treats as analysed — instead of `never`.
 */

const state = vi.hoisted(() => ({
  result: { count: 0 as number | null, error: null as unknown },
  throws: false,
  calls: [] as Array<{ table: string; select: unknown[]; filters: Array<[string, string]> }>,
}))
const logError = vi.hoisted(() => vi.fn())

vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError,
}))
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => {
    if (state.throws) {
      throw new Error("no client")
    }

    return {
      from(table: string) {
        const call = { table, select: [] as unknown[], filters: [] as Array<[string, string]> }
        state.calls.push(call)

        const query = {
          select(...args: unknown[]) {
            call.select = args
            return query
          },
          eq(column: string, value: string) {
            call.filters.push([column, value])
            return query
          },
          then(resolve: (value: typeof state.result) => unknown) {
            return Promise.resolve(state.result).then(resolve)
          },
        }

        return query
      },
    }
  },
}))

const { getAnalysisStatus } = await import("@/services/analysis-history-service")

beforeEach(() => {
  state.result = { count: 0, error: null }
  state.throws = false
  state.calls = []
  logError.mockClear()
})

describe("whether a set was ever analysed", () => {
  it("no rows is a set nobody analysed", async () => {
    expect(await getAnalysisStatus("profile_1", "playlist_1")).toBe("never")
  })

  it("any row is a set that was analysed", async () => {
    state.result = { count: 3, error: null }

    expect(await getAnalysisStatus("profile_1", "playlist_1")).toBe("analyzed")
  })

  it("asks about this owner's set, and only counts", async () => {
    await getAnalysisStatus("profile_1", "playlist_1")

    expect(state.calls).toHaveLength(1)
    expect(state.calls[0].table).toBe("analyses")
    expect(state.calls[0].select[1]).toEqual({ count: "exact", head: true })
    expect(state.calls[0].filters).toContainEqual(["playlist_id", "playlist_1"])
    expect(state.calls[0].filters).toContainEqual(["user_id", "profile_1"])
  })

  it("a read that fails is unknown, never 'never'", async () => {
    state.result = { count: null, error: { message: "boom" } }

    expect(await getAnalysisStatus("profile_1", "playlist_1")).toBe("unknown")
    expect(logError).toHaveBeenCalledWith(
      "analysis.status_read_failed",
      expect.anything(),
      { playlistId: "playlist_1" }
    )
  })

  it("a count that did not come back is unknown", async () => {
    state.result = { count: null, error: null }

    expect(await getAnalysisStatus("profile_1", "playlist_1")).toBe("unknown")
  })

  it("a client that cannot be built does not break the page", async () => {
    state.throws = true

    expect(await getAnalysisStatus("profile_1", "playlist_1")).toBe("unknown")
  })
})
