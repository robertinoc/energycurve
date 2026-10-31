import { beforeEach, describe, expect, it, vi } from "vitest"

import { REORDER_MAX_TRACKS } from "@/lib/engine/reorder"
import { IMPORT_MAX_TRACKS, tooManyTracksMessage } from "@/lib/playlists/import-limit"
import { createAudioImportSchema } from "@/lib/playlists/schemas"

/**
 * No import keeps more tracks than the optimizer can order. The three create
 * paths run for real; only their edges are mocked — the session, the profile,
 * the rate limiter, the locale and the write.
 */

const createPlaylistWithTracks = vi.fn(async () => ({ id: "playlist_1" }))
const locale = vi.hoisted(() => ({ value: "en" as "en" | "es" }))

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
vi.mock("@/lib/server-locale", () => ({ getRequestLocale: vi.fn(async () => locale.value) }))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile_1", email: "dj@example.com", suspended_at: null }),
}))
vi.mock("@/services/rate-limit-service", () => ({
  consumeRateLimit: async () => ({ allowed: true }),
}))
vi.mock("@/services/playlist-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/playlist-service")>()),
  createPlaylistWithTracks: (...args: unknown[]) => createPlaylistWithTracks(...(args as [])),
}))

function m3u8(count: number): File {
  const lines = ["#EXTM3U"]

  for (let i = 0; i < count; i += 1) {
    lines.push(`#EXTINF:360,Artist ${i} - Track ${i}`, `/music/track-${i}.mp3`)
  }

  return new File([lines.join("\n")], "set.m3u8", { type: "audio/x-mpegurl" })
}

function importForm(file: File): FormData {
  const form = new FormData()

  form.set("file", file)
  form.set("context", "main")
  form.set("genre", "")

  return form
}

beforeEach(() => {
  createPlaylistWithTracks.mockClear()
  locale.value = "en"
})

describe("the limit itself", () => {
  it("is the optimizer's bound, not a number of its own", () => {
    expect(IMPORT_MAX_TRACKS).toBe(REORDER_MAX_TRACKS)
    expect(IMPORT_MAX_TRACKS).toBe(80)
  })

  it("says how many came in and where the limit comes from, in both languages", () => {
    expect(tooManyTracksMessage(81, "en")).toMatch(/81 tracks.*limit is 80.*order optimizer/)
    expect(tooManyTracksMessage(81, "es")).toMatch(/81 temas.*límite es 80.*optimizador de orden/)
  })
})

describe("the file import", () => {
  it("rejects 81 tracks whole, and writes nothing", async () => {
    const { importPlaylistAction } = await import("@/app/(en)/dashboard/playlists/actions")
    const state = await importPlaylistAction({ ok: false, message: null } as never, importForm(m3u8(81)))

    expect(state.message).toBe(tooManyTracksMessage(81, "en"))
    expect(createPlaylistWithTracks).not.toHaveBeenCalled()
  })

  it("answers in Spanish for a Spanish session", async () => {
    locale.value = "es"
    const { importPlaylistAction } = await import("@/app/(en)/dashboard/playlists/actions")
    const state = await importPlaylistAction({ ok: false, message: null } as never, importForm(m3u8(120)))

    expect(state.message).toBe(tooManyTracksMessage(120, "es"))
  })

  it("keeps exactly 80", async () => {
    const { importPlaylistAction } = await import("@/app/(en)/dashboard/playlists/actions")

    await expect(
      importPlaylistAction({ ok: false, message: null } as never, importForm(m3u8(80)))
    ).rejects.toThrow(/REDIRECT \/dashboard\/playlists\/playlist_1/)
    expect(createPlaylistWithTracks).toHaveBeenCalledTimes(1)
    expect((createPlaylistWithTracks.mock.calls[0] as unknown[])[2]).toHaveLength(80)
  })
})

describe("the pasted tracklist", () => {
  it("rejects 81 lines", async () => {
    const { createPlaylistWithTracksAction } = await import("@/app/(en)/dashboard/playlists/actions")
    const form = new FormData()

    form.set("name", "Long night")
    form.set("context", "main")
    form.set("genre", "house")
    form.set("text", Array.from({ length: 81 }, (_, i) => `Artist ${i} - Track ${i}`).join("\n"))
    form.set("format", "artist-track")

    const state = await createPlaylistWithTracksAction({ ok: false, message: null } as never, form)

    expect(state.message).toBe(tooManyTracksMessage(81, "en"))
    expect(createPlaylistWithTracks).not.toHaveBeenCalled()
  })
})

describe("the audio-file import", () => {
  const track = () => ({
    artist: "A",
    name: "B",
    bpm: 124,
    key: null,
    genre: null,
    energy: null,
    energySource: null,
    sourceUri: null,
    comment: null,
    durationSeconds: 360,
  })

  it("refuses more than 80 tracks with the same message", () => {
    const parsed = createAudioImportSchema("en").safeParse({
      name: "",
      context: "main",
      genre: "",
      tracks: Array.from({ length: 81 }, track),
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe(tooManyTracksMessage(81, "en"))
  })

  it("accepts 80", () => {
    expect(
      createAudioImportSchema("en").safeParse({
        name: "",
        context: "main",
        genre: "",
        tracks: Array.from({ length: 80 }, track),
      }).success
    ).toBe(true)
  })
})
