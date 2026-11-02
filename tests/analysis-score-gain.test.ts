import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Wall 3 of step 3.1, through the real analysis service: the engine runs for
 * real, and only the edges are mocked — the playlist read, billing, the
 * history table and the event sink. The rule itself is tested on its own in
 * tests/score-gain.test.ts; this is that the service reads the right rows,
 * hands the page the right answer, and records each event when it should.
 */

const state = vi.hoisted(() => ({
  plan: "free" as "free" | "pro",
  previous: [] as Array<Record<string, unknown>>,
  events: [] as Array<{ event: string; properties: Record<string, unknown> }>,
}))

vi.mock("next/server", () => ({ after: () => {} }))
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))
vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServerEvent: (_profileId: string, event: string, properties: Record<string, unknown>) =>
    state.events.push({ event, properties }),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: state.plan, status: state.plan === "free" ? null : "active" }),
}))
vi.mock("@/services/curve-template-service", () => ({ getCurveTemplate: async () => null }))
vi.mock("@/services/reorder-suggestion-cache", () => ({ suggestReorderRemembered: () => null }))
vi.mock("@/services/playlist-service", () => ({
  getOwnedPlaylistWithTracks: async () => ({
    id: "playlist_1",
    genre: "house",
    context: "main",
    slot_start_minutes: null,
    slot_end_minutes: null,
    target_shape: null,
    target_template_id: null,
    tracks: [4, 5, 6, 7, 8, 9, 8, 6].map((energy, index) => ({
      id: `t${index}`,
      position: index + 1,
      artist: "A",
      name: `T${index}`,
      bpm: 124,
      energy_score: energy,
      duration_seconds: 360,
    })),
  }),
}))
vi.mock("@/lib/supabase/server", () => {
  // Just enough of the query builder for the history read.
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: state.previous, error: null }),
  }

  return { getSupabaseAdminClient: () => ({ from: () => query }) }
})

const { getPlaylistAnalysis } = await import("@/services/analysis-service")

/** An earlier analysis of the same set, in another order, with this score. */
function earlier(setScore: number) {
  return {
    input_hash: "earlier",
    set_score: setScore,
    curve: [9, 4, 8, 5, 7, 6, 8, 6],
    genre: "house",
    context: "main",
    algorithm_version: 4,
    created_at: "2026-11-01T12:00:00Z",
  }
}

function eventsNamed(name: string) {
  return state.events.filter((entry) => entry.event === name)
}

beforeEach(() => {
  state.plan = "free"
  state.previous = []
  state.events.length = 0
})

describe("a re-analysis that raised the score", () => {
  it("FREE: the page gets the strip, and both events are recorded", async () => {
    state.previous = [earlier(1)]

    const result = await getPlaylistAnalysis("profile_1", "playlist_1")

    if (result?.status !== "ok") throw new Error("expected an analysis")
    expect(result.scoreGain).toEqual({ from: 1, to: result.analysis.setScore, wall: true })
    expect(eventsNamed("score_improved")).toEqual([
      {
        event: "score_improved",
        properties: { playlistId: "playlist_1", from: 1, to: result.analysis.setScore, plan: "free", wallShown: true },
      },
    ])
    expect(eventsNamed("sales_wall_shown")).toEqual([
      { event: "sales_wall_shown", properties: { wall: "score_improved", plan: "free" } },
    ])
  })

  it("PRO: no wall — it already reads the history — but the gain is still counted", async () => {
    state.plan = "pro"
    state.previous = [earlier(1)]

    const result = await getPlaylistAnalysis("profile_1", "playlist_1")

    if (result?.status !== "ok") throw new Error("expected an analysis")
    expect(result.scoreGain?.wall).toBe(false)
    expect(eventsNamed("score_improved")[0].properties.wallShown).toBe(false)
    expect(eventsNamed("sales_wall_shown")).toEqual([])
  })

  it("a lower score shows nothing and records nothing", async () => {
    state.previous = [earlier(10)]

    const result = await getPlaylistAnalysis("profile_1", "playlist_1")

    if (result?.status !== "ok") throw new Error("expected an analysis")
    expect(result.scoreGain).toBeNull()
    expect(eventsNamed("score_improved")).toEqual([])
    expect(eventsNamed("sales_wall_shown")).toEqual([])
  })

  it("a first analysis has nothing to beat", async () => {
    const result = await getPlaylistAnalysis("profile_1", "playlist_1")

    if (result?.status !== "ok") throw new Error("expected an analysis")
    expect(result.scoreGain).toBeNull()
  })
})
