import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The scheduled retention sweep's endpoint.
 *
 * It deletes data on a timer with no human in the loop, so the only thing
 * between the internet and it is one header check. That makes the negative
 * cases the point of this file.
 */

const sweepBillingPayloads = vi.fn(async () => ({ agedOut: 4, orphaned: 1 }))
const sweepDeletedAccounts = vi.fn<
  () => Promise<{ deleted: number; failed: number }>
>()

vi.mock("@/services/retention-service", () => ({ sweepBillingPayloads }))

/**
 * Mocked rather than left to load, and the reason is a real dependency and not
 * a test artefact: since 22/09/2026 this route also executes account deletions,
 * which means deleting a WorkOS user, which pulls the authkit SDK into the
 * module graph. That is inherent to erasure — the WorkOS user is half of what
 * has to go — so the mock is the right answer rather than a shim.
 */
vi.mock("@/services/account-deletion-service", () => ({ sweepDeletedAccounts }))
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

  // Implementations, not just call history. `clearAllMocks` resets the calls and
  // leaves the implementation, so the `mockRejectedValue` set by the failure
  // test below used to leak into every describe declared after it — which is
  // how a new block added on 22/09 got a 500 it had not asked for. Restating
  // the happy path here makes the order of the file stop mattering.
  sweepBillingPayloads.mockResolvedValue({ agedOut: 4, orphaned: 1 })
  sweepDeletedAccounts.mockResolvedValue({ deleted: 0, failed: 0 })
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

describe("the account-deletion sweep", () => {
  it("runs, and reports what it did", async () => {
    sweepDeletedAccounts.mockResolvedValue({ deleted: 2, failed: 0 })

    const response = await call(`Bearer ${SECRET}`)
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body.accountsDeleted).toBe(2)
    expect(body.accountDeletionsFailed).toBe(0)
  })

  it("never runs for an unauthorized caller", async () => {
    // The one sweep here that deletes whole accounts rather than clearing a
    // column, so it is the one where the header check matters most.
    await call("Bearer not-the-secret")

    expect(sweepDeletedAccounts).not.toHaveBeenCalled()
  })

  it("does not take the rest of the sweep down when it fails", async () => {
    // Its own try, like every sweep in this route. Three retention windows that
    // did run must not be reported as a failed sweep because a fourth thing —
    // one that needs migration 0031 — could not.
    sweepDeletedAccounts.mockRejectedValue(new Error("WorkOS is down"))

    const response = await call(`Bearer ${SECRET}`)
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.accountsDeleted).toBeNull()
    expect(sweepBillingPayloads).toHaveBeenCalled()
  })
})
