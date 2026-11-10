import { beforeEach, describe, expect, it, vi } from "vitest"

import { CONSENT_COOKIE_NAME, CONSENT_COOKIE_VALUE } from "@/lib/privacy/consent"

/**
 * The three conversion events respect the analytics answer (Robertino's
 * decision of 10/11/2026): `score_improved`, `sales_wall_shown` and
 * `sales_wall_clicked` leave the server only when the browser that caused them
 * said yes.
 *
 * Three cases per event, because the third is the one a bug produces: with
 * consent it is sent, without consent it is not, and when consent cannot be
 * known it is not either. And two promises around them: the other events are
 * untouched, and a failure to read consent never reaches the person's action.
 */

const posthog = vi.hoisted(() => ({ captured: [] as Array<{ distinctId: string; event: string }> }))
const request = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  dnt: null as string | null,
  fails: false,
}))

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture(message: { distinctId: string; event: string }) {
      posthog.captured.push(message)
    }
  },
}))

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (request.fails) throw new Error("cookies() was called outside a request scope")
    return {
      get: (name: string) =>
        name === CONSENT_COOKIE_NAME && request.cookie !== undefined
          ? { name, value: request.cookie }
          : undefined,
    }
  },
  headers: async () => {
    if (request.fails) throw new Error("headers() was called outside a request scope")
    return { get: (name: string) => (name === "dnt" ? request.dnt : null) }
  },
}))

vi.mock("@/lib/observability/logger", () => ({ logWarn: vi.fn(), logError: vi.fn(), logInfo: vi.fn() }))

process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test"

const GATED = ["score_improved", "sales_wall_shown", "sales_wall_clicked"] as const

async function capture(event: string) {
  const { captureServerEvent } = await import("@/lib/analytics/posthog-server")

  await captureServerEvent("profile_1", event as never, { wall: "playlist_limit" })
}

const sent = () => posthog.captured.map((message) => message.event)

beforeEach(() => {
  posthog.captured.length = 0
  request.cookie = undefined
  request.dnt = null
  request.fails = false
})

describe("the consent decision on the server", () => {
  it("reads yes only from the exact mirrored value, and never under Do Not Track", async () => {
    const { consentFromRequest } = await import("@/lib/privacy/server-consent")

    expect(consentFromRequest(CONSENT_COOKIE_VALUE, null)).toBe("granted")
    expect(consentFromRequest(undefined, null)).toBe("absent")
    expect(consentFromRequest("granted", null)).toBe("absent")
    expect(consentFromRequest("granted.v0", null)).toBe("absent")
    expect(consentFromRequest("denied", null)).toBe("absent")
    expect(consentFromRequest(CONSENT_COOKIE_VALUE, "1")).toBe("absent")
    expect(consentFromRequest(CONSENT_COOKIE_VALUE, "yes")).toBe("absent")
    expect(consentFromRequest(CONSENT_COOKIE_VALUE, "0")).toBe("granted")
  })

  it("says unknown, without throwing, when the request cannot be read", async () => {
    const { readServerConsent } = await import("@/lib/privacy/server-consent")
    request.fails = true

    await expect(readServerConsent()).resolves.toBe("unknown")
  })
})

describe.each(GATED)("%s", (event) => {
  it("is sent with consent", async () => {
    request.cookie = CONSENT_COOKIE_VALUE
    await capture(event)

    expect(sent()).toEqual([event])
    expect(posthog.captured[0].distinctId).toBe("profile_1")
  })

  it("is not sent without consent", async () => {
    await capture(event)

    expect(sent()).toEqual([])
  })

  it("is not sent when consent cannot be known", async () => {
    request.cookie = CONSENT_COOKIE_VALUE
    request.fails = true
    await capture(event)

    expect(sent()).toEqual([])
  })

  it("is not sent under Do Not Track, whatever the cookie says", async () => {
    request.cookie = CONSENT_COOKIE_VALUE
    request.dnt = "1"
    await capture(event)

    expect(sent()).toEqual([])
  })

  it("is not sent for a consent of an older version", async () => {
    request.cookie = "granted.v0"
    await capture(event)

    expect(sent()).toEqual([])
  })
})

describe("the events this decision did not cover", () => {
  it.each(["plan_limit_reached", "signup", "checkout_started", "analysis_completed"])(
    "%s is sent as before, without asking",
    async (event) => {
      request.fails = true
      await capture(event)

      expect(sent()).toEqual([event])
    }
  )

  it("lists exactly the three decided events as needing consent", async () => {
    const { requiresConsent } = await import("@/lib/analytics/posthog-server")
    const all = [
      "signup", "playlist_created", "analysis_started", "analysis_completed",
      "checkout_started", "subscription_started", "plan_upgraded", "plan_downgraded",
      "subscription_ended", "plan_limit_reached", "score_improved",
      "sales_wall_shown", "sales_wall_clicked", "payment_failed",
    ] as const

    expect(all.filter((event) => requiresConsent(event))).toEqual([...GATED])
  })
})

describe("the product, when consent cannot be read", () => {
  it("does not throw at the call site, synchronously or later", async () => {
    const { captureServerEvent } = await import("@/lib/analytics/posthog-server")
    request.fails = true

    let result: unknown
    expect(() => {
      result = captureServerEvent("profile_1", "sales_wall_shown", {})
    }).not.toThrow()
    await expect(result).resolves.toBeUndefined()
  })
})
