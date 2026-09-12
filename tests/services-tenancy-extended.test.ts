import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  OWNER,
  STRANGER,
  type FakeSupabase,
  type Tables,
} from "./helpers/supabase-fake"

/**
 * Data ownership in the services that had no tests at all.
 *
 * `tests/services-tenancy.test.ts` covers `playlist-service`, which is where
 * the risk concentrates. This file covers the rest of the profile-scoped
 * surface — curve templates, the user's own genres and contexts, the global
 * library, and set version history — because "the risk is concentrated and the
 * concentrated part is tested" is an argument that only holds while nobody
 * checks the others.
 *
 * Same boundary, same reason (AGENTS.md): every query runs through the
 * service-role client, which bypasses RLS by design. A missing
 * `.eq("user_id", profileId)` is caught here or it is not caught.
 *
 * Two assertions here are deliberately written as sweeps over the whole
 * serialised result rather than field by field. That is not laziness: the
 * account-export bug found in this audit leaked `user_id` through five tables
 * nobody had thought to assert on, and a per-field check would have missed
 * exactly the fields nobody thought of.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => fake,
}))

vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const curveTemplates = await import("@/services/curve-template-service")
const taxonomy = await import("@/services/taxonomy-service")
const library = await import("@/services/library-service")
const versions = await import("@/services/version-service")

function seed(): Tables {
  return {
    curve_templates: [
      {
        id: "template-mine",
        user_id: OWNER,
        name: "Slow burn",
        anchors: [
          [0, 3],
          [1, 8],
        ],
        created_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "template-theirs",
        user_id: STRANGER,
        name: "Their shape",
        anchors: [
          [0, 5],
          [1, 9],
        ],
        created_at: "2026-09-02T00:00:00.000Z",
      },
    ],
    user_contexts: [
      {
        id: "context-mine",
        user_id: OWNER,
        name: "Sunset",
        created_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "context-theirs",
        user_id: STRANGER,
        name: "Afterhours",
        created_at: "2026-09-02T00:00:00.000Z",
      },
    ],
    user_genres: [
      {
        id: "genre-mine",
        user_id: OWNER,
        name: "Dub techno",
        created_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "genre-theirs",
        user_id: STRANGER,
        name: "Hard groove",
        created_at: "2026-09-02T00:00:00.000Z",
      },
    ],
    playlists: [
      { id: "playlist-mine", user_id: OWNER, name: "My night" },
      { id: "playlist-theirs", user_id: STRANGER, name: "Their night" },
    ],
    tracks: [
      {
        id: "track-mine",
        playlist_id: "playlist-mine",
        artist: "Mine",
        name: "My track",
        bpm: 124,
        musical_key: "8A",
        position: 1,
      },
      {
        id: "track-theirs",
        playlist_id: "playlist-theirs",
        artist: "Theirs",
        name: "Their secret weapon",
        bpm: 132,
        musical_key: "9A",
        position: 1,
      },
    ],
    playlist_versions: [
      {
        id: "version-mine",
        playlist_id: "playlist-mine",
        kind: "saved",
        tracks: [],
        set_score: 7,
        created_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "version-theirs",
        playlist_id: "playlist-theirs",
        kind: "saved",
        tracks: [],
        set_score: 9,
        created_at: "2026-09-02T00:00:00.000Z",
      },
    ],
  }
}

beforeEach(() => {
  fake = createFakeSupabase(seed())
})

describe("curve templates", () => {
  it("lists only the templates the profile owns", async () => {
    const mine = await curveTemplates.listCurveTemplates(OWNER)

    expect(mine.map((t) => t.id)).toEqual(["template-mine"])
  })

  it("refuses to hand over another profile's template by id", async () => {
    await expect(
      curveTemplates.getCurveTemplate(OWNER, "template-theirs")
    ).resolves.toBeNull()
  })

  it("and returns it to the profile that owns it", async () => {
    const template = await curveTemplates.getCurveTemplate(
      OWNER,
      "template-mine"
    )

    expect(template?.name).toBe("Slow burn")
  })

  it("does not delete a template belonging to someone else", async () => {
    await curveTemplates.deleteCurveTemplate(OWNER, "template-theirs")

    // A delete scoped only by id would silently destroy another DJ's saved
    // shape, and nothing in the response would say so — deleteCurveTemplate
    // returns void either way.
    expect(
      fake.tables.curve_templates?.some((r) => r.id === "template-theirs")
    ).toBe(true)
  })

  it("does delete the profile's own template", async () => {
    await curveTemplates.deleteCurveTemplate(OWNER, "template-mine")

    expect(
      fake.tables.curve_templates?.some((r) => r.id === "template-mine")
    ).toBe(false)
  })
})

describe("a DJ's own genres and contexts", () => {
  it("lists only the profile's contexts", async () => {
    const contexts = await taxonomy.listUserContexts(OWNER)

    expect(contexts.map((c) => c.id)).toEqual(["context-mine"])
  })

  it("lists only the profile's genres", async () => {
    const genres = await taxonomy.listUserGenres(OWNER)

    expect(genres.map((g) => g.id)).toEqual(["genre-mine"])
  })

  it("will not fetch another profile's context by id", async () => {
    await expect(
      taxonomy.getUserContextById(OWNER, "context-theirs")
    ).resolves.toBeNull()
  })

  it("will not fetch another profile's genre by id", async () => {
    await expect(
      taxonomy.getUserGenreById(OWNER, "genre-theirs")
    ).resolves.toBeNull()
  })

  it("will not delete another profile's context", async () => {
    await taxonomy.deleteUserContext(OWNER, "context-theirs")

    expect(
      fake.tables.user_contexts?.some((r) => r.id === "context-theirs")
    ).toBe(true)
  })

  it("will not delete another profile's genre", async () => {
    await taxonomy.deleteUserGenre(OWNER, "genre-theirs")

    expect(fake.tables.user_genres?.some((r) => r.id === "genre-theirs")).toBe(
      true
    )
  })
})

describe("the global library", () => {
  it("never contains a track from a playlist the profile does not own", async () => {
    const summary = await library.getGlobalLibrary(OWNER)

    // Swept over the whole serialised result on purpose: the library reshapes
    // rows into entries, counts and names, so a foreign track could surface in
    // a field this test never thought to name.
    const serialised = JSON.stringify(summary)

    expect(serialised).not.toContain("Their secret weapon")
    expect(serialised).not.toContain("Theirs")
    expect(serialised).toContain("My track")
  })

  it("returns an empty library rather than everyone's for an unknown profile", async () => {
    const summary = await library.getGlobalLibrary("profile-nobody")

    expect(JSON.stringify(summary)).not.toContain("My track")
    expect(JSON.stringify(summary)).not.toContain("Their secret weapon")
  })
})

describe("set version history", () => {
  /**
   * `getVersion` and `listVersions` take a playlist id, not a profile id — the
   * caller proves ownership of the playlist first (both call sites in
   * `app/dashboard/playlists/actions.ts` do, verified 2026-09-12). What the
   * service still owes is that the version id alone is not a key to the whole
   * table, and that is what these pin: a valid id from someone else's set,
   * requested through a playlist you do own, has to come back empty.
   */
  it("will not return a version belonging to another playlist", async () => {
    await expect(
      versions.getVersion("playlist-mine", "version-theirs")
    ).resolves.toBeNull()
  })

  it("returns the version that does belong to the playlist", async () => {
    const version = await versions.getVersion("playlist-mine", "version-mine")

    expect(version?.id).toBe("version-mine")
  })

  it("lists only the versions of the playlist asked for", async () => {
    const list = await versions.listVersions("playlist-mine")

    expect(list.map((v) => v.id)).toEqual(["version-mine"])
  })
})
