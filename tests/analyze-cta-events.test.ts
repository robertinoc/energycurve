import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `analyze_cta_click` is sent from the browser precisely because that is where
 * consent is respected (step 1.2 of docs/conversion-plan.md). A visitor who
 * said no, or who never answered, is not counted.
 */

const posthog = {
  init: vi.fn(),
  capture: vi.fn(),
  reset: vi.fn(),
  opt_out_capturing: vi.fn(),
  opt_in_capturing: vi.fn(),
}

vi.mock("posthog-js", () => ({ default: posthog }))

let consentState: "unset" | "granted" | "denied" = "granted"

vi.mock("@/lib/privacy/consent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/privacy/consent")>()

  return { ...actual, readConsent: () => consentState }
})

// Before the import: the runtime reads the key at load time, and without one
// everything below would pass because nothing can be sent at all.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key"

const { applyConsentToAnalytics, __resetAnalyticsForTests } = await import(
  "@/components/analytics/analytics-runtime"
)
const { captureAnalyzeCtaClick } = await import("@/lib/analytics/analyze-cta-events")

const CLICK = { placement: "import_summary", firstAnalysis: true, locale: "es" } as const

beforeEach(() => {
  vi.clearAllMocks()
  consentState = "granted"
  __resetAnalyticsForTests()
})

describe("the click on the way into the analysis", () => {
  it("is sent when analytics were accepted, with where it came from", () => {
    applyConsentToAnalytics("granted")

    captureAnalyzeCtaClick(CLICK)

    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith("analyze_cta_click", CLICK)
  })

  it("is not sent when they were declined", () => {
    applyConsentToAnalytics("granted")
    consentState = "denied"

    captureAnalyzeCtaClick(CLICK)

    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it("is not sent while the question is unanswered", () => {
    consentState = "unset"

    captureAnalyzeCtaClick(CLICK)

    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it("carries nothing about the set", () => {
    applyConsentToAnalytics("granted")

    captureAnalyzeCtaClick(CLICK)

    expect(Object.keys(posthog.capture.mock.calls[0][1]).sort()).toEqual([
      "firstAnalysis",
      "locale",
      "placement",
    ])
  })
})
