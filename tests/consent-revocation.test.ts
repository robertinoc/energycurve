import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * What withdrawing consent actually reaches.
 *
 * `tests/consent.test.ts` and `e2e/consent.spec.ts` already prove that saying
 * no keeps analytics off. This file asks the harder half, which is the one the
 * compliance task names: once someone has said **yes** and then changes their
 * mind, does that reach the third party — or only our own call sites?
 *
 * Art. 7(3): withdrawing has to be as easy as giving, and it has to take effect.
 * A revocation that stops us sending while leaving the vendor's SDK live, its
 * cookies set and its identifier attached to a person is not a withdrawal; it is
 * a pause on one caller.
 */

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

let consentState: "unset" | "granted" | "denied" = "granted"

vi.mock("@/lib/privacy/consent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/privacy/consent")>()

  return { ...actual, readConsent: () => consentState }
})

/**
 * Set before the import, because the module reads the key at load time and a
 * missing key switches the whole thing off — which would make every assertion
 * below pass for the wrong reason.
 */
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key"

const { applyConsentToAnalytics, __resetAnalyticsForTests } = await import(
  "@/components/analytics/analytics-runtime"
)

describe("the switch that turns all of this off", () => {
  it("has a key in this suite, so nothing below passes vacuously", () => {
    expect(process.env.NEXT_PUBLIC_POSTHOG_KEY).toBeTruthy()
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  consentState = "granted"
  __resetAnalyticsForTests()
})

describe("saying yes", () => {
  it("initialises the SDK once, not on every call", () => {
    applyConsentToAnalytics("granted")
    applyConsentToAnalytics("granted")

    expect(posthog.init).toHaveBeenCalledTimes(1)
  })

  it("reports that analytics may run", () => {
    expect(applyConsentToAnalytics("granted")).toBe(true)
  })
})

describe("changing your mind", () => {
  beforeEach(() => {
    applyConsentToAnalytics("granted")
    vi.clearAllMocks()
  })

  it("tells the SDK to stop, rather than only stopping our callers", () => {
    consentState = "denied"

    applyConsentToAnalytics("denied")

    // Without this, `initialized` stays true forever and every consumer that
    // asks "may I?" is told yes — the SDK keeps its cookies and its timers, and
    // the only thing that stopped was us calling capture().
    expect(posthog.opt_out_capturing).toHaveBeenCalled()
  })

  it("drops the identifier the vendor holds", () => {
    consentState = "denied"

    applyConsentToAnalytics("denied")

    // `reset()` clears the distinct id and the stored properties. Leaving them
    // means the third party still holds an id tied to a person who withdrew.
    expect(posthog.reset).toHaveBeenCalled()
  })

  it("answers no afterwards, even though the SDK was already initialised", () => {
    consentState = "denied"

    expect(applyConsentToAnalytics("denied")).toBe(false)
  })

  it("treats returning to unset as a withdrawal too", () => {
    // "Change my choice" clears the answer rather than setting denied. If only
    // `denied` triggered the teardown, the button that exists to undo consent
    // would be the one path that doesn't.
    consentState = "unset"

    applyConsentToAnalytics("unset")

    expect(posthog.opt_out_capturing).toHaveBeenCalled()
    expect(posthog.reset).toHaveBeenCalled()
  })

  it("does not re-initialise on the way back to yes", () => {
    consentState = "denied"
    applyConsentToAnalytics("denied")
    vi.clearAllMocks()

    consentState = "granted"
    applyConsentToAnalytics("granted")

    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.opt_in_capturing).toHaveBeenCalled()
  })
})

describe("before any answer", () => {
  it("does not initialise anything", () => {
    consentState = "unset"

    expect(applyConsentToAnalytics("unset")).toBe(false)
    expect(posthog.init).not.toHaveBeenCalled()
    // Nothing to tear down, so nothing is torn down — calling opt_out on an
    // uninitialised SDK is a no-op at best and an error at worst.
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled()
  })
})
