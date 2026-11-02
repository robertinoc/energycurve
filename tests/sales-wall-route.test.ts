import { beforeEach, describe, expect, it, vi } from "vitest"

import { SALES_WALLS, salesWallHref } from "@/lib/product/sales-walls"

/**
 * The redirect behind every sales wall's button (docs/conversion-plan.md,
 * step 3.1). Two promises: it counts a real click once, with which wall and
 * which plan; and nothing about the count ever keeps someone off /pricing.
 */

const captured: Array<{ profileId: string; event: string; properties: Record<string, unknown> }> = []
const state = vi.hoisted(() => ({
  user: { id: "user_1", email: "dj@example.com", firstName: null, lastName: null } as object | null,
  suspended: false,
  billingFails: false,
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: async () => ({ user: state.user }) }))
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))
vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServerEvent: (profileId: string, event: string, properties: Record<string, unknown>) =>
    captured.push({ profileId, event, properties }),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({
    id: "profile_1",
    suspended_at: state.suspended ? "2026-10-01T00:00:00Z" : null,
  }),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => {
    if (state.billingFails) throw new Error("billing down")
    return { plan: "free", status: null }
  },
}))

async function click(query: string) {
  const { GET } = await import("@/app/api/sales-wall/route")

  return GET(new Request(`https://energycurve.app/api/sales-wall?${query}`))
}

beforeEach(() => {
  captured.length = 0
  state.user = { id: "user_1", email: "dj@example.com", firstName: null, lastName: null }
  state.suspended = false
  state.billingFails = false
})

describe("the sales wall redirect", () => {
  it("counts the click with the wall and the plan, then lands on /pricing", async () => {
    const response = await click("wall=playlist_limit&locale=en")

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://energycurve.app/pricing")
    expect(captured).toEqual([
      {
        profileId: "profile_1",
        event: "sales_wall_clicked",
        properties: { wall: "playlist_limit", plan: "free", locale: "en" },
      },
    ])
  })

  it("keeps the Spanish reader in Spanish", async () => {
    const response = await click("wall=ai_ordering_limit&locale=es")

    expect(response.headers.get("location")).toBe("https://energycurve.app/es/pricing")
    expect(captured[0].properties.locale).toBe("es")
  })

  it("counts nothing for a wall that doesn't exist, and still redirects", async () => {
    const response = await click("wall=made_up&locale=en")

    expect(response.status).toBe(303)
    expect(captured).toEqual([])
  })

  it("counts nothing without a session or for a suspended account", async () => {
    state.user = null
    await click("wall=playlist_limit")
    state.user = { id: "user_1", email: "dj@example.com", firstName: null, lastName: null }
    state.suspended = true
    await click("wall=playlist_limit")

    expect(captured).toEqual([])
  })

  it("never keeps anyone off /pricing when the count fails", async () => {
    state.billingFails = true

    const response = await click("wall=score_improved&locale=en")

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://energycurve.app/pricing")
    expect(captured).toEqual([])
  })

  it("is what every wall's button points at", () => {
    for (const wall of SALES_WALLS) {
      expect(salesWallHref(wall, "es")).toBe(`/api/sales-wall?wall=${wall}&locale=es`)
    }
  })
})
