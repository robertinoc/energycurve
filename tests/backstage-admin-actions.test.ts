import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  type FakeSupabase,
  type Tables,
} from "./helpers/supabase-fake"

/**
 * Suspending and deleting an account: the two irreversible things this product
 * can do to a customer, and the only two that cannot be undone by a rollback.
 *
 * `services/backstage-service.ts` had no tests at all. That is a gap worth
 * naming rather than quietly filling: the 2026-09 audit's first finding was
 * that suspension had been a *page gate* rather than an authorization, and its
 * fifth was that the record of these actions survived a single day. Both
 * findings are about this file, and neither would have been caught by a test
 * that did not exist.
 *
 * What is asserted here is ordering and scope, not return shapes:
 *
 *   - WorkOS is deleted **before** Supabase. Reverse it and the person can
 *     still log in, and the profile sync recreates the row that was just
 *     removed — a deletion that undoes itself.
 *   - A WorkOS failure that is not a 404 aborts **before** the database is
 *     touched, so a half-deleted account never exists.
 *   - The update in `setUserSuspension` is scoped to one id. Drop that filter
 *     and a single click suspends every account in the product.
 *   - Every action leaves an audit row, because "who suspended this user, and
 *     when" is the question asked after the fact, when the log line is gone.
 */

let fake: FakeSupabase

/** WorkOS deletions, in order, with the database state observed at call time. */
let workosDeletes: Array<{ userId: string; profileRowsAtCallTime: number }>
/** What the WorkOS mock should do when called. */
let workosDeleteBehaviour: () => void

interface AdminAction {
  actorEmail: string
  action: string
  targetProfileId: string
  targetEmail: string | null
  detail?: Record<string, unknown>
}

const recordAdminAction = vi.fn(async (action: AdminAction) => void action)
const sweepBillingPayloads = vi.fn(async () => ({ scrubbed: 0 }))

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => fake,
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  getWorkOS: () => ({
    userManagement: {
      deleteUser: async (userId: string) => {
        // Recording the row count *at call time* is what makes the ordering
        // assertion real. Comparing two spies would only prove which mock ran
        // first; this proves the database still held the profile when WorkOS
        // was asked to drop it.
        workosDeletes.push({
          userId,
          profileRowsAtCallTime: (fake.tables.profiles ?? []).length,
        })
        workosDeleteBehaviour()
      },
    },
  }),
}))

vi.mock("@/services/admin-audit-service", () => ({
  recordAdminAction: (action: AdminAction) => recordAdminAction(action),
}))

vi.mock("@/services/retention-service", () => ({
  sweepBillingPayloads: () => sweepBillingPayloads(),
}))

vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const service = await import("@/services/backstage-service")

const ACTOR = "admin@energycurve.app"

function seedProfiles(): Tables {
  return {
    profiles: [
      {
        id: "profile-target",
        email: "dj@example.com",
        workos_user_id: "workos-target",
        suspended_at: null,
      },
      {
        id: "profile-bystander",
        email: "someone-else@example.com",
        workos_user_id: "workos-bystander",
        suspended_at: null,
      },
    ],
  }
}

function profile(id: string) {
  return (fake.tables.profiles ?? []).find((row) => row.id === id)
}

beforeEach(() => {
  fake = createFakeSupabase(seedProfiles())
  workosDeletes = []
  workosDeleteBehaviour = () => {}
  recordAdminAction.mockClear()
  sweepBillingPayloads.mockClear()
  sweepBillingPayloads.mockResolvedValue({ scrubbed: 0 })
})

describe("deleting an account", () => {
  it("removes the WorkOS user before the profile row", async () => {
    await service.deleteUserEverywhere("profile-target", ACTOR)

    expect(workosDeletes).toHaveLength(1)
    // Both profiles were still present when WorkOS was called: the database
    // had not been touched yet.
    expect(workosDeletes[0]?.profileRowsAtCallTime).toBe(2)
    expect(profile("profile-target")).toBeUndefined()
  })

  it("deletes only the requested profile", async () => {
    await service.deleteUserEverywhere("profile-target", ACTOR)

    expect(profile("profile-bystander")).toBeDefined()
  })

  it("aborts without touching the database when WorkOS fails", async () => {
    workosDeleteBehaviour = () => {
      throw Object.assign(new Error("WorkOS is down"), { status: 500 })
    }

    await expect(
      service.deleteUserEverywhere("profile-target", ACTOR)
    ).rejects.toThrow(/WorkOS/)

    // The account must survive intact. A profile removed here while the WorkOS
    // user lives on is the worst of both: the person can still authenticate,
    // and the row that described them is gone.
    expect(profile("profile-target")).toBeDefined()
    expect(
      fake.log.some((s) => s.table === "profiles" && s.op === "delete")
    ).toBe(false)
  })

  it("treats an already-deleted WorkOS user as success and finishes the job", async () => {
    workosDeleteBehaviour = () => {
      throw Object.assign(new Error("Not Found"), { status: 404 })
    }

    await expect(
      service.deleteUserEverywhere("profile-target", ACTOR)
    ).resolves.toEqual({ email: "dj@example.com" })

    // Retrying a deletion that half-succeeded has to converge, not deadlock.
    expect(profile("profile-target")).toBeUndefined()
  })

  it("never calls WorkOS for a profile that does not exist", async () => {
    await expect(
      service.deleteUserEverywhere("profile-missing", ACTOR)
    ).rejects.toThrow(/not found/i)

    expect(workosDeletes).toHaveLength(0)
  })

  it("records the deletion in the audit log, with who did it", async () => {
    await service.deleteUserEverywhere("profile-target", ACTOR)

    expect(recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.deleted",
        actorEmail: ACTOR,
        targetProfileId: "profile-target",
        targetEmail: "dj@example.com",
      })
    )
  })

  it("still reports success when scrubbing billing payloads fails", async () => {
    sweepBillingPayloads.mockRejectedValue(new Error("sweep exploded"))

    // The account is already gone by this point. Throwing here would report a
    // deletion that happened as one that did not, and the daily sweep picks up
    // the orphaned payload anyway.
    await expect(
      service.deleteUserEverywhere("profile-target", ACTOR)
    ).resolves.toEqual({ email: "dj@example.com" })
  })
})

describe("suspending an account", () => {
  it("stamps suspended_at on the target", async () => {
    const before = Date.now()

    await service.setUserSuspension("profile-target", true, ACTOR)

    const stamped = profile("profile-target")?.suspended_at
    expect(typeof stamped).toBe("string")
    expect(Date.parse(stamped as string)).toBeGreaterThanOrEqual(before - 1000)
  })

  it("suspends only the target, never every account at once", async () => {
    await service.setUserSuspension("profile-target", true, ACTOR)

    // The failure this guards against is a single missing `.eq("id", …)` on an
    // update, which would suspend the entire customer base from one click.
    expect(profile("profile-bystander")?.suspended_at).toBeNull()
  })

  it("clears suspended_at when lifting a suspension", async () => {
    await service.setUserSuspension("profile-target", true, ACTOR)
    await service.setUserSuspension("profile-target", false, ACTOR)

    expect(profile("profile-target")?.suspended_at).toBeNull()
  })

  it("records suspending and unsuspending as different actions", async () => {
    await service.setUserSuspension("profile-target", true, ACTOR)
    await service.setUserSuspension("profile-target", false, ACTOR)

    expect(recordAdminAction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "user.suspended",
        targetProfileId: "profile-target",
        targetEmail: "dj@example.com",
        actorEmail: ACTOR,
      })
    )
    expect(recordAdminAction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: "user.unsuspended" })
    )
  })

  it("fails loudly when the profile cannot be updated", async () => {
    fake.failNext("profiles", "connection reset")

    await expect(
      service.setUserSuspension("profile-target", true, ACTOR)
    ).rejects.toThrow(/suspension/i)

    // A suspension that silently did nothing is worse than one that errored:
    // the admin walks away believing the account is locked.
    expect(recordAdminAction).not.toHaveBeenCalled()
  })
})

describe("looking up a profile for a route handler", () => {
  it("returns the email for a known profile", async () => {
    await expect(
      service.getBackstageProfileEmail("profile-target")
    ).resolves.toBe("dj@example.com")
  })

  it("returns null rather than throwing for an unknown one", async () => {
    await expect(
      service.getBackstageProfileEmail("profile-missing")
    ).resolves.toBeNull()
  })
})
