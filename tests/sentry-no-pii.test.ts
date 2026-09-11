import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The end-to-end version of the scrubbing test, and the one that would actually
 * catch a regression.
 *
 * `tests/sentry-reporter.test.ts` checks the scrubber in isolation. This drives
 * the real path — `logError` → `reportToSentry` → `fetch` — and reads the bytes
 * that would leave the machine. A unit test on the scrubber stays green if
 * someone later passes raw metadata around it.
 */

const sent: string[] = []

beforeEach(() => {
  sent.length = 0
  vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/99")
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      sent.push(init.body)
      return new Response("{}", { status: 200 })
    })
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("what actually leaves the process", () => {
  it("never sends an email, even though the logger receives one", async () => {
    const { logError } = await import("@/lib/observability/logger")
    const { resetReporterBudget } = await import("@/lib/observability/sentry")

    resetReporterBudget()

    // The shape lib/auth/password-reset.ts really logs.
    logError("auth.password_reset_failed", new Error("workos said no"), {
      email: "dj@example.com",
      profileId: "p-1",
    })

    await vi.waitFor(() => expect(sent).toHaveLength(1))

    expect(sent[0]).not.toContain("dj@example.com")
    expect(sent[0]).not.toContain("example.com")
    // And it is still useful: the id and the fault survive.
    expect(sent[0]).toContain("p-1")
    expect(sent[0]).toContain("workos said no")
  })

  it("sends nothing at all when no DSN is configured", async () => {
    vi.stubEnv("SENTRY_DSN", "")

    const { logError } = await import("@/lib/observability/logger")
    const { resetReporterBudget } = await import("@/lib/observability/sentry")

    resetReporterBudget()
    logError("x.failed", new Error("boom"), { profileId: "p-1" })

    // Nothing queued, and nothing thrown: an unconfigured reporter is a no-op,
    // not a failure. This is the state every local machine runs in.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sent).toHaveLength(0)
  })
})
