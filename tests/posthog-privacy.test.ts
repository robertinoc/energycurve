import { beforeEach, describe, expect, it, vi } from "vitest"

import { CLIENT_IP_PROPERTIES, stripClientIp } from "@/lib/analytics/posthog-privacy"

/**
 * H-17: the event payload carries no client IP, and the init no longer leans on
 * an option the SDK ignores.
 *
 * This file checks the code. Whether the payload the SDK actually sends is clean
 * is a different question, answered by reading a real request in
 * `e2e/posthog-payload.spec.ts` — the reason H-17 existed is that the code said
 * one thing (`ip: false`) and the SDK did another.
 */

const event = {
  uuid: "e-1",
  event: "tool_result_shown",
  properties: { locale: "es", trackCount: 12, $ip: "203.0.113.7", $lib: "web" },
  $set: { $ip: "203.0.113.7", plan: "free" },
  $set_once: { $ip: "203.0.113.7" },
}

describe("stripClientIp", () => {
  it("removes $ip from the event, the person properties and the set-once properties", () => {
    const cleaned = stripClientIp(event)

    expect(JSON.stringify(cleaned)).not.toContain("203.0.113.7")
    expect(cleaned?.properties).toEqual({ locale: "es", trackCount: 12, $lib: "web" })
    expect(cleaned?.$set).toEqual({ plan: "free" })
    expect(cleaned?.$set_once).toEqual({})
  })

  it("does not edit the event it was given", () => {
    stripClientIp(event)

    expect(event.properties.$ip).toBe("203.0.113.7")
  })

  it("passes a dropped event through as dropped", () => {
    // `null` is how an earlier hook discards an event. Returning an object would
    // resurrect it.
    expect(stripClientIp(null)).toBeNull()
  })

  it("leaves an event with nothing to strip as it was", () => {
    const plain = { uuid: "e-2", event: "$pageview", properties: { locale: "en" } }

    expect(stripClientIp(plain)).toEqual({ ...plain, $set: undefined, $set_once: undefined })
  })

  it("names $ip, which is the property PostHog derives from the connection", () => {
    expect(CLIENT_IP_PROPERTIES).toContain("$ip")
  })
})

const posthog = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_out_capturing: vi.fn(),
  opt_in_capturing: vi.fn(),
  get_distinct_id: vi.fn(() => "anon-1"),
}

vi.mock("posthog-js", () => ({ default: posthog }))

// Read at module load; without a key the runtime never initialises and the
// assertions below would pass because nothing ran.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key"

const { applyConsentToAnalytics, __resetAnalyticsForTests } = await import(
  "@/components/analytics/analytics-runtime"
)

describe("posthog.init", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetAnalyticsForTests()
  })

  it("installs stripClientIp as before_send", () => {
    applyConsentToAnalytics("granted")

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.init.mock.calls[0][1].before_send).toBe(stripClientIp)
  })

  it("no longer passes `ip`, the option the SDK ignores", () => {
    // Keeping it would leave a line that reads like a guarantee and does
    // nothing — which is exactly how three pieces of privacy copy came to rest
    // on it.
    applyConsentToAnalytics("granted")

    expect(posthog.init.mock.calls[0][1]).not.toHaveProperty("ip")
  })

  it("keeps autocapture and session recording off", () => {
    applyConsentToAnalytics("granted")

    expect(posthog.init.mock.calls[0][1]).toMatchObject({
      autocapture: false,
      disable_session_recording: true,
      respect_dnt: true,
    })
  })
})
