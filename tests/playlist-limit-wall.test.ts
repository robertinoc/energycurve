import { beforeEach, describe, expect, it, vi } from "vitest"

import { SALES_WALL_COPY } from "@/lib/content/sales-wall-copy"

/**
 * Wall 1 of step 3.1: the fourth playlist on FREE.
 *
 * The cap itself is the service's (`createPlaylist`) and is not under test
 * here. What is: every create path turns the refusal into the sales wall — the
 * same sentence, flagged `playlist_limit` — and saves nothing. The limit is
 * the one that already existed; only how it is said changes.
 */

const state = vi.hoisted(() => ({
  events: [] as Array<{ event: string; properties: Record<string, unknown> }>,
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({
    user: { id: "user_1", email: "dj@example.com", firstName: null, lastName: null },
  }),
  getWorkOS: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`)
  },
}))
vi.mock("@/lib/server-locale", () => ({ getRequestLocale: vi.fn(async () => "es") }))
vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServerEvent: (_profileId: string, event: string, properties: Record<string, unknown>) =>
    state.events.push({ event, properties }),
}))
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile_1", email: "dj@example.com", suspended_at: null }),
}))
vi.mock("@/services/rate-limit-service", () => ({ consumeRateLimit: async () => ({ allowed: true }) }))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: "free", status: null }),
}))
vi.mock("@/services/playlist-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/playlist-service")>()

  return {
    ...actual,
    // What createPlaylist throws at the cap: three of three on FREE.
    createPlaylistWithTracks: async () => {
      throw new actual.PlaylistLimitError(3, 3)
    },
  }
})

beforeEach(() => {
  state.events.length = 0
})

/** The wall, counted as shown — apart from the limit the service records. */
function shownWalls() {
  return state.events.filter((entry) => entry.event === "sales_wall_shown")
}

const expected = {
  ok: false,
  message: "Llegaste a 3 playlists en tu plan.",
  fieldErrors: null,
  wall: "playlist_limit",
}

describe("the fourth playlist on FREE", () => {
  it("a file import answers with the wall", async () => {
    const { importPlaylistAction } = await import("@/app/(en)/dashboard/playlists/actions")
    const data = new FormData()

    data.set("file", new File(["Artist,Title\nA,One\nB,Two\n"], "fourth.csv", { type: "text/csv" }))
    data.set("context", "main")
    data.set("genre", "house")
    data.set("name", "Fourth")

    expect(await importPlaylistAction({ ok: false, message: null } as never, data)).toEqual(expected)
    expect(shownWalls()).toEqual([
      {
        event: "sales_wall_shown",
        properties: { wall: "playlist_limit", plan: "free", used: 3, limit: 3 },
      },
    ])
  })

  it("a pasted list answers with the wall", async () => {
    const { createPlaylistWithTracksAction } = await import("@/app/(en)/dashboard/playlists/actions")
    const data = new FormData()

    data.set("context", "main")
    data.set("genre", "house")
    data.set("name", "Fourth")
    data.set("text", "A - One\nB - Two")
    data.set("format", "artist-track")

    expect(
      await createPlaylistWithTracksAction({ ok: false, message: null } as never, data)
    ).toEqual(expected)
    expect(shownWalls()).toHaveLength(1)
  })

  it("an audio import answers with the wall", async () => {
    const { importAudioFilesAction } = await import("@/app/(en)/dashboard/playlists/actions")

    const result = await importAudioFilesAction({
      name: "Fourth",
      context: "main",
      genre: "house",
      tracks: [
        { artist: "A", name: "One", bpm: 124, key: null, genre: null, comment: null, durationSeconds: 360, sourceUri: null, energy: null },
        { artist: "B", name: "Two", bpm: 126, key: null, genre: null, comment: null, durationSeconds: 380, sourceUri: null, energy: null },
      ],
    } as never)

    expect(result).toEqual({ ok: false, message: expected.message, wall: "playlist_limit" })
    expect(shownWalls()).toHaveLength(1)
  })

  it("names what PRO changes, and the free way out", () => {
    expect(SALES_WALL_COPY.playlistLimitBody.es).toMatch(/No se creó nada/)
    expect(SALES_WALL_COPY.playlistLimitBody.es).toMatch(/borrá uno de los tuyos/)
    expect(SALES_WALL_COPY.playlistLimitBody.en).toMatch(/delete one of yours/)
  })
})
