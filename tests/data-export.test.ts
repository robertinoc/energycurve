import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * "Download my data" — and the reason it needs its own test file is that it is
 * the single juiciest endpoint in the product to get wrong. It returns an entire
 * account in one response, so a missing `profileId` filter here does not leak a
 * row, it leaks everything someone has.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

const { buildAccountExport } = await import("@/services/data-export-service")

const MINE = "profile-mine"
const THEIRS = "profile-theirs"

beforeEach(() => {
  fake = createFakeSupabase({
    profiles: [
      {
        id: MINE,
        email: "dj@example.com",
        created_at: "2026-04-01T00:00:00.000Z",
        preferred_locale: "es",
        key_notation: "camelot",
        plan: "pro",
        plan_status: "active",
        plan_current_period_end: "2026-10-01T00:00:00.000Z",
        plan_cancel_at: null,
        workos_user_id: "user_workos_secret",
        stripe_customer_id: "cus_secret",
      },
      { id: THEIRS, email: "other@example.com", created_at: "2026-04-01T00:00:00.000Z" },
    ],
    playlists: [
      { id: "pl-mine", user_id: MINE, name: "Warm-up", venue: "Razzmatazz" },
      { id: "pl-theirs", user_id: THEIRS, name: "Not yours", venue: "Fabric" },
    ],
    tracks: [
      { id: "t1", playlist_id: "pl-mine", position: 1, name: "Mine" },
      { id: "t2", playlist_id: "pl-theirs", position: 1, name: "Theirs" },
    ],
    analyses: [
      { id: "a1", user_id: MINE, set_score: 7.5 },
      { id: "a2", user_id: THEIRS, set_score: 9 },
    ],
    playlist_versions: [
      { id: "v1", playlist_id: "pl-mine", label: "original" },
      { id: "v2", playlist_id: "pl-theirs", label: "theirs" },
    ],
    curve_templates: [{ id: "c1", user_id: MINE, name: "My shape" }],
    user_genres: [{ id: "g1", user_id: MINE, name: "hard groove" }],
    user_contexts: [{ id: "x1", user_id: MINE, name: "sunrise" }],
    feature_usage: [{ id: "u1", profile_id: MINE, feature: "ai_ordering", used: 2 }],
    set_collaborators: [{ id: "s1", playlist_id: "pl-mine", email: "friend@example.com" }],
    set_suggestions: [
      { id: "sg1", author_id: MINE, playlist_id: "pl-theirs", body: "swap 3 and 4" },
      { id: "sg2", author_id: THEIRS, playlist_id: "pl-mine", body: "not mine" },
    ],
  })
})

describe("it exports mine and only mine", () => {
  it("includes my playlists and not another DJ's", async () => {
    const data = await buildAccountExport(MINE)

    expect(data?.playlists.map((row) => row.id)).toEqual(["pl-mine"])

    // Their set's *content* must not appear. Its id can: a suggestion I wrote
    // on their set is my data, and without the id I cannot tell which set it
    // was about. An opaque uuid reveals nothing on its own.
    const serialised = JSON.stringify(data)
    expect(serialised).not.toContain("Not yours")
    expect(serialised).not.toContain("Fabric")
    expect(serialised).not.toContain("other@example.com")
  })

  it("includes my tracks and not the ones in their sets", async () => {
    const data = await buildAccountExport(MINE)

    expect(data?.tracks.map((row) => row.id)).toEqual(["t1"])
  })

  it("scopes analyses, versions, templates, taxonomies and usage the same way", async () => {
    const data = await buildAccountExport(MINE)

    expect(data?.analyses).toHaveLength(1)
    expect(data?.versions).toHaveLength(1)
    expect(data?.curveTemplates).toHaveLength(1)
    expect(data?.customGenres).toHaveLength(1)
    expect(data?.customContexts).toHaveLength(1)
    expect(data?.featureUsage).toHaveLength(1)
  })

  it("includes suggestions I wrote, not ones written to me", async () => {
    // Both are about me, but only one is *mine* — the other is someone else's
    // words, and handing them over would be exporting their data, not mine.
    const data = await buildAccountExport(MINE)

    expect(data?.collaborations.suggestionsAuthored.map((row) => row.id)).toEqual(["sg1"])
  })

  it("returns null for a profile that does not exist", async () => {
    await expect(buildAccountExport("profile-nobody")).resolves.toBeNull()
  })
})

describe("what it deliberately leaves out", () => {
  it("does not hand over internal join keys", async () => {
    const data = await buildAccountExport(MINE)
    const serialised = JSON.stringify(data)

    // These identify the row to *us*. They are not the person's data, and a
    // file that gets emailed around should not carry them.
    expect(serialised).not.toContain("user_workos_secret")
    expect(serialised).not.toContain("cus_secret")
    expect(serialised).not.toContain("user_id")
  })
})

describe("the leak this file exists to prevent", () => {
  it("does not carry another account's identifiers through any collection", async () => {
    // Written as a sweep rather than per-table on purpose: the first version of
    // the export stripped internal columns from playlists only, and `user_id`
    // walked straight back out through analyses, curve_templates, user_genres,
    // user_contexts and feature_usage. A per-table assertion would have missed
    // exactly the tables nobody thought about.
    const data = await buildAccountExport(MINE)
    const serialised = JSON.stringify(data)

    for (const internal of [
      THEIRS,
      "user_id",
      "profile_id",
      "author_id",
      "workos_user_id",
      "stripe_customer_id",
    ]) {
      expect(serialised, `leaked: ${internal}`).not.toContain(internal)
    }
  })
})

describe("what it says about data it does not hold", () => {
  it("names the processors rather than leaving a reader to infer an absence", async () => {
    const data = await buildAccountExport(MINE)
    const notes = (data?.heldElsewhere ?? []).join(" ")

    expect(notes).toContain("WorkOS")
    expect(notes).toContain("Stripe")
    expect(notes).toContain("PostHog")
    // The strongest privacy claim the product makes, restated where someone
    // checking what we hold will actually read it.
    expect(notes.toLowerCase()).toContain("never leave your device")
  })

  it("stamps the export so a reader knows when it was true", async () => {
    const data = await buildAccountExport(MINE)

    expect(data?.format).toBe("energycurve.account-export.v1")
    expect(Date.parse(data?.exportedAt ?? "")).not.toBeNaN()
  })
})
