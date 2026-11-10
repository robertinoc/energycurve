import { beforeEach, describe, expect, it, vi } from "vitest"

import { CONSENT_COOKIE_NAME, CONSENT_COOKIE_VALUE } from "@/lib/privacy/consent"

/**
 * The sales-wall redirect with the real analytics module behind it, not a mock:
 * the route is where a click turns into `sales_wall_clicked`, and it is the one
 * caller that returns before the event is sent (a 303 to /pricing). Whatever
 * the consent is, or whether it can be read at all, the person lands on the
 * plans — the event is what is lost, never the redirect.
 */

const posthog = vi.hoisted(() => ({ captured: [] as string[] }))
const request = vi.hoisted(() => ({ cookie: undefined as string | undefined, fails: false }))

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture(message: { event: string }) {
      posthog.captured.push(message.event)
    }
  },
}))
vi.mock("next/headers", () => ({
  cookies: async () => {
    if (request.fails) throw new Error("no request scope")
    return {
      get: (name: string) =>
        name === CONSENT_COOKIE_NAME && request.cookie ? { name, value: request.cookie } : undefined,
    }
  },
  headers: async () => ({ get: () => null }),
}))
vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: { id: "user_1", email: "dj@example.com", firstName: null, lastName: null } }),
}))
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile_1", suspended_at: null }),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: "free", status: null }),
}))

process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test"

async function click() {
  const { GET } = await import("@/app/api/sales-wall/route")
  const response = await GET(new Request("https://energycurve.app/api/sales-wall?wall=playlist_limit&locale=en"))

  // The consent read is a promise the route does not wait for; let it settle
  // before looking at what was sent.
  await new Promise((resolve) => setTimeout(resolve, 0))

  return response
}

beforeEach(() => {
  posthog.captured.length = 0
  request.cookie = undefined
  request.fails = false
})

describe("a sales-wall click and the analytics answer", () => {
  it("is counted, and redirected, with consent", async () => {
    request.cookie = CONSENT_COOKIE_VALUE
    const response = await click()

    expect(response.status).toBe(303)
    expect(posthog.captured).toEqual(["sales_wall_clicked"])
  })

  it("is redirected and not counted without consent", async () => {
    const response = await click()

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://energycurve.app/pricing")
    expect(posthog.captured).toEqual([])
  })

  it("is redirected and not counted when consent cannot be read", async () => {
    request.cookie = CONSENT_COOKIE_VALUE
    request.fails = true
    const response = await click()

    expect(response.status).toBe(303)
    expect(posthog.captured).toEqual([])
  })
})
