import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase, type Row } from "./helpers/supabase-fake"

/**
 * The lote 18 sweep: every read in services/ that could stop at PostgREST's
 * 1,000 rows, or carry an `in()` past the ~350 ids that fit in a URL, without
 * saying so. The lote 17 fixed eight of these one at a time, while fixing
 * something else; this file is the systematic pass, one test per read, at the
 * volume where each one broke.
 *
 * Each of these passed against the fake before the fake learned the ceiling
 * (lote 16) and the in() edge (lote 17). With both in place, each test below is
 * red against the code before the sweep.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/backstage/posthog-reporting", () => ({
  fetchBackstagePersonFacts: async () => new Map(),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: MINE, email: "dj@example.com" }),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: "pro_plus", status: "active" }),
}))
vi.mock("@workos-inc/authkit-nextjs", () => ({ getWorkOS: vi.fn(), withAuth: vi.fn() }))

const MINE = "profile-mine"
const OVER = 1200

const many = <T,>(count: number, make: (index: number) => T): T[] =>
  Array.from({ length: count }, (_, index) => make(index))

const pad = (index: number) => String(index).padStart(5, "0")

/** A valid timestamp `i` minutes into September, so each row has its own. */
const minutesAfter = (i: number) => new Date(Date.UTC(2026, 8, 1) + i * 60_000).toISOString()

describe("the backstage user table, over whole tables", () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      profiles: many(OVER, (i) => ({
        id: `p-${pad(i)}`,
        email: `u${i}@example.com`,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
        suspended_at: null,
        plan: "free",
        plan_status: null,
        last_seen_at: null,
        last_seen_country: null,
      })),
      // 1,500 playlists for the last user, so a capped read miscounts them.
      playlists: many(1500, (i) => ({ id: `pl-${pad(i)}`, user_id: `p-${pad(OVER - 1)}` })),
      analyses: many(1100, (i) => ({
        id: `a-${pad(i)}`,
        user_id: `p-${pad(OVER - 1)}`,
        created_at: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
      })),
    })
  })

  it("lists every user, not the first thousand", async () => {
    const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")

    const snapshot = await getBackstageUsersSnapshot()

    expect(snapshot.users).toHaveLength(OVER)
  })

  it("counts every playlist and analysis of a user", async () => {
    const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")

    const snapshot = await getBackstageUsersSnapshot()
    const heavy = snapshot.users.find((user) => user.id === `p-${pad(OVER - 1)}`)

    expect(heavy?.playlistCount).toBe(1500)
    expect(heavy?.analysisCount).toBe(1100)
  })
})

describe("the dashboard's score history", () => {
  it("draws the newest analyses of a set, not the oldest thousand", async () => {
    // One set with 1,100 analyses, scored 1..1100 in time order: the history
    // has to end at the newest, 1100.
    fake = createFakeSupabase({
      profiles: [{ id: MINE }],
      playlists: [{ id: "set", user_id: MINE, updated_at: "2026-09-01T00:00:00Z" }],
      tracks: [],
      analyses: many(1100, (i) => ({
        id: `a-${pad(i)}`,
        playlist_id: "set",
        set_score: i + 1,
        created_at: `2026-01-01T00:00:${pad(i)}Z`,
      })),
    })
    const { getDashboardSnapshot } = await import("@/services/dashboard-service")

    const snapshot = await getDashboardSnapshot({ id: "w", email: "dj@example.com" } as never)
    const history = snapshot.latestPlaylists[0]?.scoreHistory ?? []

    expect(history.at(-1)).toBe(1100)
    expect(history).toHaveLength(12)
  })
})

describe("the pending-deletions panel", () => {
  it("lists every pending deletion", async () => {
    fake = createFakeSupabase({
      profiles: many(OVER, (i) => ({
        id: `p-${pad(i)}`,
        email: `u${i}@example.com`,
        deletion_requested_at: minutesAfter(i),
      })),
    })
    const { listPendingDeletions } = await import("@/services/account-deletion-service")

    const pending = await listPendingDeletions(new Date("2026-10-01T00:00:00Z"))

    expect(pending).toHaveLength(OVER)
  })
})

describe("per-user and per-set lists", () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      profiles: [{ id: MINE, email: "dj@example.com" }],
      playlists: [{ id: "set", user_id: MINE, name: "Set" }],
      curve_templates: many(OVER, (i) => ({
        id: `c-${pad(i)}`,
        user_id: MINE,
        name: `Shape ${i}`,
        anchors: [
          [0, 3],
          [1, 8],
        ],
        created_at: "2026-09-01T00:00:00Z",
      })),
      user_contexts: many(OVER, (i) => ({
        id: `x-${pad(i)}`,
        user_id: MINE,
        name: `Context ${i}`,
        created_at: "2026-09-01T00:00:00Z",
      })),
      user_genres: many(OVER, (i) => ({
        id: `g-${pad(i)}`,
        user_id: MINE,
        name: `Genre ${i}`,
        created_at: "2026-09-01T00:00:00Z",
      })),
      set_collaborators: many(OVER, (i) => ({
        id: `s-${pad(i)}`,
        playlist_id: "set",
        invited_email: i === 0 ? "friend@example.com" : `f${i}@example.com`,
        created_at: "2026-09-01T00:00:00Z",
      })),
      set_suggestions: many(OVER, (i) => ({
        id: `sg-${pad(i)}`,
        playlist_id: "set",
        author_id: MINE,
        body: `idea ${i}`,
        track_id: null,
        resolved_at: null,
        created_at: "2026-09-01T00:00:00Z",
      })),
    })
  })

  it("curve templates", async () => {
    const { listCurveTemplates } = await import("@/services/curve-template-service")
    expect(await listCurveTemplates(MINE)).toHaveLength(OVER)
  })

  it("custom contexts and genres", async () => {
    const { listUserContexts, listUserGenres } = await import("@/services/taxonomy-service")
    expect(await listUserContexts(MINE)).toHaveLength(OVER)
    expect(await listUserGenres(MINE)).toHaveLength(OVER)
  })

  it("collaborators of a set", async () => {
    const { listCollaborators } = await import("@/services/collaboration-service")
    expect(await listCollaborators(MINE, "set")).toHaveLength(OVER)
  })

  it("suggestions on a set", async () => {
    const { listSuggestions } = await import("@/services/collaboration-service")
    expect(await listSuggestions("set", MINE)).toHaveLength(OVER)
  })
})

describe("residency: more than ~350 sets at one venue", () => {
  it("still finds the played history", async () => {
    // 400 sets at the venue, each with one played version. The newest is in
    // the last set, past the first 350 ids, which is where an unsplit in()
    // failed and the check said there was no history at all.
    const sets: Row[] = many(400, (i) => ({
      id: `v-${pad(i)}`,
      user_id: MINE,
      name: `Night ${i}`,
      venue: "Razzmatazz",
    }))
    fake = createFakeSupabase({
      profiles: [{ id: MINE }],
      playlists: [...sets, { id: "planning", user_id: MINE, name: "Next", venue: "Razzmatazz" }],
      playlist_versions: sets.map((set, i) => ({
        id: `ver-${pad(i)}`,
        playlist_id: set.id,
        kind: "played",
        created_at: minutesAfter(i),
        tracks: [{ artist: "A", name: `Track ${i}` }],
      })),
    })
    const { getResidencySummary } = await import("@/services/residency-service")

    const summary = await getResidencySummary(
      MINE,
      { id: "planning", venue: "Razzmatazz" },
      [{ artist: "A", name: "Track 399", position: 1 }]
    )

    expect(summary.noHistory).toBe(false)
    expect(summary.setsConsidered).toBeGreaterThan(0)
  })
})
