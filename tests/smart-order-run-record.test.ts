import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Every smart ordering that reaches the model call leaves a row saying who made
 * the order. The backstage alarm is only as good as this write, and the path
 * that matters most is the fallback — the one the quota never records.
 *
 * The route is driven to a fallback without any network: with no
 * ANTHROPIC_API_KEY it answers `not_configured` before building a client.
 */

const recordSmartOrderRun = vi.fn(async () => undefined)
const consumeQuota = vi.fn(async () => undefined)

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: { id: "workos-user-1", email: "dj@example.com" } }),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile-1" }),
}))
vi.mock("@/services/playlist-service", () => ({
  getOwnedPlaylistWithTracks: async () => ({
    id: "playlist-record",
    genre: "techno",
    context: "main",
    tracks: Array.from({ length: 8 }, (_, index) => ({
      id: `track-${index}`,
      name: `Track ${index}`,
      artist: "X",
      bpm: 128 + index,
      energy_score: 5,
      position: index + 1,
    })),
  }),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: "pro", status: "active" }),
}))
vi.mock("@/services/usage-service", () => ({
  readQuota: async () => ({ allowed: true, used: 0, limit: 3 }),
  consumeQuota,
}))
vi.mock("@/services/rate-limit-service", () => ({
  consumeRateLimit: async () => ({ allowed: true, retryAfterMs: 0 }),
}))
vi.mock("@/services/smart-order-run-service", () => ({ recordSmartOrderRun }))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))

const { POST } = await import("@/app/api/playlists/[id]/smart-order/route")

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("ANTHROPIC_API_KEY", "")
})

describe("recording who made the order", () => {
  it("records a fallback with its reason, and charges no quota for it", async () => {
    const response = await POST(new Request("https://energycurve.app/x", { method: "POST" }), {
      params: Promise.resolve({ id: "playlist-record" }),
    })
    const body = await response.text()

    expect(body).toContain('"source":"fallback"')
    expect(body).toContain('"reason":"not_configured"')
    expect(recordSmartOrderRun).toHaveBeenCalledTimes(1)
    expect(recordSmartOrderRun).toHaveBeenCalledWith({
      source: "fallback",
      reason: "not_configured",
    })
    expect(consumeQuota).not.toHaveBeenCalled()
  })
})
