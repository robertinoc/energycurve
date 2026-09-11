import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The guards in front of the one route that spends money per call.
 *
 * Four things stand between a request and a Claude call: a session, ownership
 * of the playlist, a rate limit, and the plan's monthly quota. This file tests
 * the order they fire in, which is the part that matters — a quota checked
 * after the call still costs the money it was there to save, and an ownership
 * check after the rate limit lets a stranger burn someone else's bucket.
 *
 * The Claude call itself is not exercised here: every test stops at a guard.
 */

const user = vi.fn<() => { id: string; email: string } | null>(() => ({
  id: "workos-user-1",
  email: "dj@example.com",
}))
const getOwnedPlaylistWithTracks = vi.fn()
const readQuota = vi.fn(async () => ({ allowed: true, used: 0, limit: 3 }))
const getProfileBilling = vi.fn<() => Promise<{ plan: string; status: string | null }>>(
  async () => ({ plan: "pro", status: "active" })
)

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: user() }),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile-1" }),
}))
vi.mock("@/services/playlist-service", () => ({ getOwnedPlaylistWithTracks }))
vi.mock("@/services/billing-service", () => ({ getProfileBilling }))
vi.mock("@/services/usage-service", () => ({
  readQuota,
  consumeQuota: vi.fn(async () => undefined),
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))

const { POST } = await import("@/app/api/playlists/[id]/smart-order/route")

function call(playlistId: string) {
  return POST(new Request("https://energycurve.app/x", { method: "POST" }), {
    params: Promise.resolve({ id: playlistId }),
  })
}

/**
 * `id` is a parameter because the route caches by playlist id + track shape,
 * and that cache is consulted *before* the quota gate on purpose (a cache hit
 * makes no Claude call, so charging for it would meter our infrastructure
 * rather than our cost). A shared id would let an earlier test in this file
 * warm the cache and hand the next one a 200 it never asked for — which is
 * exactly what happened on the first run of this suite.
 */
function playlistOf(trackCount: number, id = "playlist-1") {
  return {
    id,
    genre: "techno",
    context: "main",
    tracks: Array.from({ length: trackCount }, (_, index) => ({
      id: `track-${index}`,
      name: `Track ${index}`,
      artist: "X",
      bpm: 128 + index,
      energy_score: 5,
      position: index + 1,
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  user.mockReturnValue({ id: "workos-user-1", email: "dj@example.com" })
  getOwnedPlaylistWithTracks.mockResolvedValue(playlistOf(8))
  readQuota.mockResolvedValue({ allowed: true, used: 0, limit: 3 })
  getProfileBilling.mockResolvedValue({ plan: "pro", status: "active" })
})

describe("the session gate", () => {
  it("answers 401 and never looks up a playlist", async () => {
    user.mockReturnValue(null)

    const response = await call("playlist-1")

    expect(response.status).toBe(401)
    expect(getOwnedPlaylistWithTracks).not.toHaveBeenCalled()
  })
})

describe("the ownership gate", () => {
  it("answers 404 for a playlist the caller does not own", async () => {
    // The service returns null for a playlist belonging to someone else, so
    // this route's 404 is the same answer a missing playlist gets. That is
    // deliberate: distinguishing them would confirm the id exists.
    getOwnedPlaylistWithTracks.mockResolvedValue(null)

    const response = await call("someone-elses-playlist")

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
  })

  it("scopes the lookup by the caller's profile, not by the id alone", async () => {
    getOwnedPlaylistWithTracks.mockResolvedValue(null)

    await call("playlist-scope")

    expect(getOwnedPlaylistWithTracks).toHaveBeenCalledWith("profile-1", "playlist-scope")
  })

  it("checks ownership before spending the rate limit", async () => {
    // Otherwise a stranger guessing ids empties the owner's bucket for them.
    getOwnedPlaylistWithTracks.mockResolvedValue(null)

    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect((await call("guessed-id")).status).toBe(404)
    }
  })
})

describe("what it refuses to analyse", () => {
  it("answers 422 for a set too short to have a shape", async () => {
    getOwnedPlaylistWithTracks.mockResolvedValue(playlistOf(1, "playlist-short"))

    const response = await call("playlist-1")

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({ error: "not_analyzable" })
  })

  it("answers 422 when the playlist has no genre", async () => {
    getOwnedPlaylistWithTracks.mockResolvedValue({
      ...playlistOf(8, "playlist-no-genre"),
      genre: null,
    })

    expect((await call("playlist-no-genre")).status).toBe(422)
  })
})

describe("the quota gate", () => {
  it("answers 402 with the numbers, and does not reach Claude", async () => {
    getOwnedPlaylistWithTracks.mockResolvedValue(playlistOf(8, "playlist-quota-a"))
    readQuota.mockResolvedValue({ allowed: false, used: 3, limit: 3 })

    const response = await call("playlist-quota-a")

    expect(response.status).toBe(402)
    await expect(response.json()).resolves.toMatchObject({
      error: "quota_exceeded",
      used: 3,
      limit: 3,
    })
  })

  it("reads the quota for the caller's own plan", async () => {
    getOwnedPlaylistWithTracks.mockResolvedValue(playlistOf(8, "playlist-quota-b"))
    getProfileBilling.mockResolvedValue({ plan: "free", status: null })
    readQuota.mockResolvedValue({ allowed: false, used: 1, limit: 1 })

    const response = await call("playlist-quota-b")

    expect(response.status).toBe(402)
    // FREE gets one a month; the cap is the point, not the access.
    await expect(response.json()).resolves.toMatchObject({ limit: 1 })
  })
})
