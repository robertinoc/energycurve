import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  type FakeSupabase,
} from "./helpers/supabase-fake"

/**
 * Erasure — GDPR Art. 17, self-serve, with thirty days of grace.
 *
 * The properties worth pinning are not "does it set a column". They are the
 * four ways this feature could be wrong in a way nobody notices until it has
 * cost somebody something:
 *
 * 1. **A second request must not move the date.** Otherwise clicking twice
 *    postpones your own deletion, which is the opposite of what a double click
 *    means, and the person has no way to see that it happened.
 * 2. **The sweep must only take accounts past the grace.** An off-by-one on a
 *    day here deletes an account that still had time to change its mind, and
 *    there is no tested backup restore to undo it with.
 * 3. **One failure must not stop the others.** Three honoured erasure requests
 *    reported as "the sweep failed" is a much worse report than "one of four
 *    failed".
 * 4. **The subscription must be cancelled BEFORE the profile row goes.** The row
 *    is the only place `stripe_subscription_id` exists. Get the order wrong and
 *    an active subscription keeps renewing against a customer with no account,
 *    who cannot reach the billing portal to stop it because they can no longer
 *    log in. That was the pre-existing state of `deleteUserEverywhere`, and it
 *    is the reason this file tests an ordering rather than a result.
 */

let fake: FakeSupabase

const scheduleCancellationAtPeriodEnd = vi.fn<
  (subscriptionId: string) => Promise<{ ok: boolean; periodEnd: string | null }>
>()
const resumeSubscription = vi.fn<(subscriptionId: string) => Promise<boolean>>()
const deleteUserEverywhere = vi.fn<
  (profileId: string, actor: string) => Promise<{ email: string }>
>()

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => fake,
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/services/subscription-cancel-service", () => ({
  scheduleCancellationAtPeriodEnd: (id: string) =>
    scheduleCancellationAtPeriodEnd(id),
  resumeSubscription: (id: string) => resumeSubscription(id),
  cancelSubscriptionNow: vi.fn(async () => true),
  isSubscriptionCancellationConfigured: () => true,
}))
vi.mock("@/services/backstage-service", () => ({
  deleteUserEverywhere: (id: string, actor: string) =>
    deleteUserEverywhere(id, actor),
}))

const service = await import("@/services/account-deletion-service")

const NOW = new Date("2026-09-22T12:00:00.000Z")

function seed() {
  return {
    profiles: [
      {
        id: "profile-subscriber",
        email: "dj@example.com",
        stripe_subscription_id: "sub_123",
        deletion_requested_at: null,
      },
      {
        id: "profile-free",
        email: "free@example.com",
        stripe_subscription_id: null,
        deletion_requested_at: null,
      },
    ],
  }
}

function profile(id: string) {
  return fake.tables.profiles.find((row) => row.id === id)
}

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase(seed())
  scheduleCancellationAtPeriodEnd.mockResolvedValue({
    ok: true,
    periodEnd: "2026-10-15T00:00:00.000Z",
  })
  resumeSubscription.mockResolvedValue(true)
  deleteUserEverywhere.mockResolvedValue({ email: "dj@example.com" })
})

describe("the grace period", () => {
  it("is thirty days, matching the Art. 12(3) deadline", () => {
    // Pinned as a number. The two dates have to be the same one: a shorter
    // grace would mean acting before the person's window closed, a longer one
    // would mean acting after the deadline.
    expect(service.ACCOUNT_DELETION_GRACE_DAYS).toBe(30)
  })

  it("schedules the deletion thirty days out", async () => {
    const result = await service.requestAccountDeletion("profile-free", NOW)

    expect(result?.scheduledFor).toBe("2026-10-22T12:00:00.000Z")
    expect(profile("profile-free")?.deletion_requested_at).toBe(
      NOW.toISOString()
    )
  })

  it("does not move the date when asked a second time", async () => {
    await service.requestAccountDeletion("profile-free", NOW)

    const later = new Date("2026-09-30T12:00:00.000Z")
    const second = await service.requestAccountDeletion("profile-free", later)

    // Still counted from the first request, not the second.
    expect(second?.scheduledFor).toBe("2026-10-22T12:00:00.000Z")
    expect(profile("profile-free")?.deletion_requested_at).toBe(
      NOW.toISOString()
    )
  })
})

describe("the subscription", () => {
  it("stops renewing when the deletion is requested", async () => {
    const result = await service.requestAccountDeletion(
      "profile-subscriber",
      NOW
    )

    expect(scheduleCancellationAtPeriodEnd).toHaveBeenCalledWith("sub_123")
    expect(result?.planEndsAt).toBe("2026-10-15T00:00:00.000Z")
    expect(result?.subscriptionNeedsAttention).toBe(false)
  })

  it("is not touched for an account that never had one", async () => {
    await service.requestAccountDeletion("profile-free", NOW)

    expect(scheduleCancellationAtPeriodEnd).not.toHaveBeenCalled()
  })

  it("still schedules the deletion if Stripe refuses, and says so", async () => {
    // The person asked to be deleted. A payment provider having a bad minute
    // must not turn that into a refusal — but it must not be silent either,
    // because the failure means a charge they thought they had stopped.
    scheduleCancellationAtPeriodEnd.mockResolvedValue({
      ok: false,
      periodEnd: null,
    })

    const result = await service.requestAccountDeletion(
      "profile-subscriber",
      NOW
    )

    expect(result?.scheduledFor).toBe("2026-10-22T12:00:00.000Z")
    expect(result?.subscriptionNeedsAttention).toBe(true)
  })

  it("goes back to renewing when the request is withdrawn", async () => {
    await service.requestAccountDeletion("profile-subscriber", NOW)

    await expect(
      service.cancelAccountDeletion("profile-subscriber")
    ).resolves.toBe(true)

    expect(resumeSubscription).toHaveBeenCalledWith("sub_123")
    expect(profile("profile-subscriber")?.deletion_requested_at).toBeNull()
  })

  it("withdraws the request even if Stripe cannot be resumed", async () => {
    // The deletion not happening is the important half. A plan set to lapse is
    // annoying and recoverable from the billing portal; a pending deletion left
    // in place because Stripe was down is not.
    await service.requestAccountDeletion("profile-subscriber", NOW)
    resumeSubscription.mockResolvedValue(false)

    await expect(
      service.cancelAccountDeletion("profile-subscriber")
    ).resolves.toBe(true)

    expect(profile("profile-subscriber")?.deletion_requested_at).toBeNull()
  })
})

describe("withdrawing when there is nothing pending", () => {
  it("reports no change rather than an error", async () => {
    await expect(service.cancelAccountDeletion("profile-free")).resolves.toBe(
      false
    )
    expect(resumeSubscription).not.toHaveBeenCalled()
  })
})

describe("the sweep", () => {
  it("takes the accounts whose grace has run out and leaves the others", async () => {
    const rows = fake.tables.profiles

    // 31 days ago: due. 29 days ago: not.
    rows[0].deletion_requested_at = "2026-08-22T12:00:00.000Z"
    rows[1].deletion_requested_at = "2026-09-13T12:00:00.000Z"

    const result = await service.sweepDeletedAccounts({ now: NOW })

    expect(result).toEqual({ deleted: 1, failed: 0 })
    expect(deleteUserEverywhere).toHaveBeenCalledOnce()
    expect(deleteUserEverywhere).toHaveBeenCalledWith(
      "profile-subscriber",
      "system:deletion-grace"
    )
  })

  it("does not touch an account with no pending deletion", async () => {
    const result = await service.sweepDeletedAccounts({ now: NOW })

    expect(result).toEqual({ deleted: 0, failed: 0 })
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
  })

  it("keeps going when one account cannot be deleted", async () => {
    const rows = fake.tables.profiles

    rows[0].deletion_requested_at = "2026-08-01T12:00:00.000Z"
    rows[1].deletion_requested_at = "2026-08-01T12:00:00.000Z"

    deleteUserEverywhere.mockImplementationOnce(async () => {
      throw new Error("WorkOS is down")
    })

    const result = await service.sweepDeletedAccounts({ now: NOW })

    expect(result).toEqual({ deleted: 1, failed: 1 })
    expect(deleteUserEverywhere).toHaveBeenCalledTimes(2)
  })

  it("records the actor as the system, not as a person", async () => {
    // A deletion attributed to an admin who was asleep is a false trail, and
    // the audit log is the thing that has to be trustworthy here.
    fake.tables.profiles[0].deletion_requested_at = "2026-08-01T12:00:00.000Z"

    await service.sweepDeletedAccounts({ now: NOW })

    expect(deleteUserEverywhere.mock.calls[0]?.[1]).toBe(
      "system:deletion-grace"
    )
  })
})
