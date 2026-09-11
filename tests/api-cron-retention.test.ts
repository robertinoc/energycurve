import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The scheduled retention sweep's endpoint.
 *
 * It deletes data on a timer with no human in the loop, so the only thing
 * between the internet and it is one header check. That makes the negative
 * cases the point of this file.
 */

const sweepBillingPayloads = vi.fn(async () => ({ agedOut: 4, orphaned: 1 }))

vi.mock("@/services/retention-service", () => ({ sweepBillingPayloads }))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const { GET } = await import("@/app/api/cron/retention/route")

const SECRET = "cron_secret_value_for_tests"

function call(authorization?: string) {
  return GET(
    new Request("https://energycurve.app/api/cron/retention", {
      headers: authorization ? { authorization } : {},
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("CRON_SECRET", SECRET)
})

describe("who is allowed to trigger it", () => {
  it("refuses a request with no authorization header", async () => {
    expect((await call()).status).toBe(401)
    expect(sweepBillingPayloads).not.toHaveBeenCalled()
  })

  it("refuses the wrong secret", async () => {
    expect((await call("Bearer not-the-secret")).status).toBe(401)
    expect(sweepBillingPayloads).not.toHaveBeenCalled()
  })

  it("refuses the right secret sent without the Bearer scheme", async () => {
    expect((await call(SECRET)).status).toBe(401)
    expect(sweepBillingPayloads).not.toHaveBeenCalled()
  })

  it("runs for the configured secret, so the refusals mean something", async () => {
    const response = await call(`Bearer ${SECRET}`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      agedOut: 4,
      orphaned: 1,
    })
  })
})

describe("when no secret is configured", () => {
  it("answers 503 and runs nothing, rather than running for anyone", async () => {
    // The direction of this default is the whole decision. A route that deletes
    // data and treats "unconfigured" as "open" is worse than one that never
    // runs — a sweep that does not happen is a compliance gap; a sweep anyone
    // can trigger is an outage waiting for a bored stranger.
    vi.stubEnv("CRON_SECRET", "")

    expect((await call()).status).toBe(503)
    expect((await call("Bearer ")).status).toBe(503)
    expect(sweepBillingPayloads).not.toHaveBeenCalled()
  })
})

describe("when the sweep fails", () => {
  it("answers 500 without leaking the database error", async () => {
    sweepBillingPayloads.mockRejectedValue(new Error("permission denied for table"))

    const response = await call(`Bearer ${SECRET}`)
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).not.toContain("permission denied")
  })
})
