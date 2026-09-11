import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * Who can touch whose set.
 *
 * The technical audit of 11/09/2026 found the product's access control was the
 * product's least-tested code: `collaboration-service` at 0% and the ownership
 * half of `playlist-service` at 28%, while RLS runs with zero policies and every
 * query goes through the service-role key. The database grants everything; these
 * functions ARE the boundary, and nothing underneath them says no.
 *
 * So these tests are written from the attacker's side. Each one names a stranger
 * and asks for something that isn't theirs, and the assertion that matters is
 * not the return value — it is that the row is **still there afterwards**. A
 * function can return false and delete anyway; only the data proves it didn't.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

const {
  getSharedPlaylist,
  listCollaborators,
  removeCollaborator,
  inviteCollaborator,
  mayHoldLock,
} = await import("@/services/collaboration-service")

const { getOwnedPlaylist, removeTrack, updateTrack, addTrack, deletePlaylist } =
  await import("@/services/playlist-service")

const OWNER = "profile-owner"
const OWNER_EMAIL = "owner@example.com"
const GUEST_EMAIL = "guest@example.com"
const STRANGER = "profile-stranger"
const STRANGER_EMAIL = "stranger@example.com"

const MINE = "pl-owner"
const OTHER = "pl-stranger"

beforeEach(() => {
  fake = createFakeSupabase({
    profiles: [
      { id: OWNER, email: OWNER_EMAIL },
      { id: STRANGER, email: STRANGER_EMAIL },
    ],
    playlists: [
      { id: MINE, user_id: OWNER, name: "Closing set", venue: "Razzmatazz" },
      { id: OTHER, user_id: STRANGER, name: "Not yours", venue: "Fabric" },
    ],
    tracks: [
      { id: "t-mine", playlist_id: MINE, position: 1, name: "Ondas", bpm: 124 },
      { id: "t-other", playlist_id: OTHER, position: 1, name: "Rev8617", bpm: 130 },
    ],
    set_collaborators: [
      // The guest is invited to the owner's set, and to nothing else.
      { id: "col-1", playlist_id: MINE, invited_email: GUEST_EMAIL, invited_by: OWNER },
      // A row on the stranger's set, used for the cross-set id attack below.
      { id: "col-2", playlist_id: OTHER, invited_email: "someone@example.com", invited_by: STRANGER },
    ],
  })
})

/** Rows still in the table after a refused call — the only proof that counts. */
function rows(table: string): Record<string, unknown>[] {
  return (fake.tables[table] ?? []) as Record<string, unknown>[]
}

describe("reading a set someone shared", () => {
  it("refuses a viewer with no invitation", async () => {
    // The plain IDOR: a real playlist id, a logged-in stranger, no relationship.
    expect(await getSharedPlaylist(STRANGER_EMAIL, MINE)).toBeNull()
  })

  it("lets the invited viewer in", async () => {
    // The negative test above is worthless if nobody can get in at all.
    const shared = await getSharedPlaylist(GUEST_EMAIL, MINE)

    expect(shared?.playlist.id).toBe(MINE)
  })

  it("matches the invitation regardless of case and stray spaces", async () => {
    // An invite typed with a capital and a trailing space must still open the
    // door, or the feature is broken for the half of people who type that way.
    expect(await getSharedPlaylist("  Guest@Example.COM ", MINE)).not.toBeNull()
  })

  it("does not accept an address that merely looks like the invitation", async () => {
    // The other edge of the same normalisation: near-miss must stay out.
    expect(await getSharedPlaylist("guest@example.co", MINE)).toBeNull()
    expect(await getSharedPlaylist("guestt@example.com", MINE)).toBeNull()
  })

  it("does not let an invitation to one set open another", async () => {
    // The guest holds a real, valid invitation — to a different playlist.
    expect(await getSharedPlaylist(GUEST_EMAIL, OTHER)).toBeNull()
  })
})

describe("managing collaborators on a set you do not own", () => {
  it("lists nothing", async () => {
    expect(await listCollaborators(STRANGER, MINE)).toEqual([])
  })

  it("refuses to invite, and writes nothing", async () => {
    const result = await inviteCollaborator(
      STRANGER,
      STRANGER_EMAIL,
      MINE,
      "accomplice@example.com"
    )

    expect(result).toEqual({ ok: false, reason: "not_owner" })
    expect(rows("set_collaborators")).toHaveLength(2)
  })

  it("refuses to remove, and the collaborator is still there", async () => {
    expect(await removeCollaborator(STRANGER, MINE, "col-1")).toBe(false)

    expect(rows("set_collaborators").map((row) => row.id)).toContain("col-1")
  })

  it("cannot use a collaborator id from another set to delete a row", async () => {
    // The attack the code's own comment anticipates: the owner of one playlist
    // passes a collaborator id belonging to a playlist they don't own. The id is
    // real and the caller owns *a* playlist, so only the playlist_id scope on
    // the DELETE stops this.
    expect(await removeCollaborator(OWNER, MINE, "col-2")).toBe(true)

    // Returned true — the owner does own MINE — but the row on the other set is
    // untouched, which is the part that matters.
    expect(rows("set_collaborators").map((row) => row.id)).toContain("col-2")
  })
})

describe("holding the edit turn", () => {
  it("is allowed for the owner", async () => {
    expect(await mayHoldLock(OWNER, OWNER_EMAIL, MINE)).toBe(true)
  })

  it("is allowed for an invited collaborator", async () => {
    expect(await mayHoldLock(STRANGER, GUEST_EMAIL, MINE)).toBe(true)
  })

  it("is refused for someone with neither ownership nor an invitation", async () => {
    expect(await mayHoldLock(STRANGER, STRANGER_EMAIL, MINE)).toBe(false)
  })
})

describe("ownership on playlists and tracks", () => {
  it("does not hand over a playlist to a stranger", async () => {
    expect(await getOwnedPlaylist(STRANGER, MINE)).toBeNull()
  })

  it("hands it to the owner", async () => {
    expect((await getOwnedPlaylist(OWNER, MINE))?.id).toBe(MINE)
  })

  it("refuses to remove a track from someone else's set, and the track stays", async () => {
    await expect(removeTrack(STRANGER, MINE, "t-mine")).rejects.toThrow()

    expect(rows("tracks").map((row) => row.id)).toContain("t-mine")
  })

  it("refuses to edit a track in someone else's set, and the value is unchanged", async () => {
    await expect(
      updateTrack(STRANGER, MINE, "t-mine", {
        artist: "Attacker",
        name: "Overwritten",
        bpm: 999,
        energyScore: 10,
      })
    ).rejects.toThrow()

    const track = rows("tracks").find((row) => row.id === "t-mine")
    expect(track?.name).toBe("Ondas")
    expect(track?.bpm).toBe(124)
  })

  it("refuses to add a track to someone else's set, and none appears", async () => {
    await expect(
      addTrack(STRANGER, MINE, {
        artist: "Nobody",
        name: "Smuggled",
        bpm: null,
        energyScore: null,
      })
    ).rejects.toThrow()

    expect(rows("tracks").map((row) => row.name)).not.toContain("Smuggled")
  })

  it("refuses to delete someone else's set, and the set survives", async () => {
    await expect(deletePlaylist(STRANGER, MINE)).rejects.toThrow()

    expect(rows("playlists").map((row) => row.id)).toContain(MINE)
  })
})
