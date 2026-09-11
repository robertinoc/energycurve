import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * The durable record of privileged actions.
 *
 * Suspending an account and deleting one are the two irreversible things this
 * product can do to a customer, and the only trace of either used to be a
 * `logInfo` line. Vercel keeps runtime logs for a day on Hobby and a month on
 * Pro, and neither is queryable by "who deleted this account". Migration 0027
 * adds the table; this file is about the three things that make it an audit
 * trail rather than another log: it records, it survives the deletion it
 * records, and it does not quietly become the place a deleted person's address
 * lives forever.
 */

let fake: FakeSupabase
const logError = vi.fn()

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: (...args: unknown[]) => logError(...args),
}))

const { recordAdminAction, getRecentAdminActions } = await import(
  "@/services/admin-audit-service"
)
const { sweepAuditLogEmails, AUDIT_EMAIL_RETENTION_DAYS } = await import(
  "@/services/retention-service"
)

const ADMIN = "admin@energycurve.app"
const TARGET = "11111111-2222-4333-8444-555555555555"

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase({ admin_audit_log: [] })
})

describe("recording", () => {
  it("writes who did what to whom", async () => {
    const written = await recordAdminAction({
      actorEmail: ADMIN,
      action: "user.deleted",
      targetProfileId: TARGET,
      targetEmail: "dj@example.com",
    })

    expect(written).toBe(true)
    expect(fake.tables.admin_audit_log).toHaveLength(1)
    expect(fake.tables.admin_audit_log[0]).toMatchObject({
      actor_email: ADMIN,
      action: "user.deleted",
      target_profile_id: TARGET,
      target_email: "dj@example.com",
    })
  })

  it("distinguishes suspending from lifting a suspension", async () => {
    await recordAdminAction({
      actorEmail: ADMIN,
      action: "user.suspended",
      targetProfileId: TARGET,
      targetEmail: "dj@example.com",
    })
    await recordAdminAction({
      actorEmail: ADMIN,
      action: "user.unsuspended",
      targetProfileId: TARGET,
      targetEmail: "dj@example.com",
    })

    expect(fake.tables.admin_audit_log.map((row) => row.action)).toEqual([
      "user.suspended",
      "user.unsuspended",
    ])
  })
})

describe("when the write fails", () => {
  it("does not throw, so a missing migration cannot break the panel", async () => {
    fake.failNext("admin_audit_log", 'relation "admin_audit_log" does not exist')

    await expect(
      recordAdminAction({
        actorEmail: ADMIN,
        action: "user.deleted",
        targetProfileId: TARGET,
        targetEmail: "dj@example.com",
      })
    ).resolves.toBe(false)
  })

  it("reports the failure at error level, not warn", async () => {
    fake.failNext("admin_audit_log", "boom")

    await recordAdminAction({
      actorEmail: ADMIN,
      action: "user.deleted",
      targetProfileId: TARGET,
      targetEmail: "dj@example.com",
    })

    // Fail-open is the deliberate trade (see the service docblock). What makes
    // it defensible is that "we did something privileged and did not record it"
    // is the loudest line in the log rather than one more warning.
    expect(logError).toHaveBeenCalledWith(
      "admin_audit.write_failed",
      expect.anything(),
      expect.objectContaining({ action: "user.deleted" })
    )
  })

  it("returns an empty list rather than throwing when the table cannot be read", async () => {
    fake.failNext("admin_audit_log", "nope")

    await expect(getRecentAdminActions()).resolves.toEqual([])
  })
})

describe("the row outlives the profile it names", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/0027_admin_audit_log.sql"),
    "utf8"
  )

  it("does not make target_profile_id a foreign key", () => {
    // This is the whole design of the table and it is only expressible in SQL:
    // the point of a 'user.deleted' row is that the profile is gone when someone
    // reads it. An FK would either refuse the write or cascade the evidence
    // away. Asserted against the migration text because there is no database
    // here to ask.
    const columnLine = migration
      .split("\n")
      .find((line) => line.trim().startsWith("target_profile_id"))

    expect(columnLine).toBeDefined()
    expect(columnLine).not.toMatch(/references/i)
  })

  it("ships with RLS enabled, like every other table (decision 22)", () => {
    expect(migration).toMatch(
      /alter table public\.admin_audit_log\s+enable row level security/
    )
  })
})

describe("retention", () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      admin_audit_log: [
        {
          id: "old",
          actor_email: ADMIN,
          action: "user.deleted",
          target_profile_id: TARGET,
          target_email: "long-gone@example.com",
          created_at: daysAgo(AUDIT_EMAIL_RETENTION_DAYS + 30),
        },
        {
          id: "recent",
          actor_email: ADMIN,
          action: "user.suspended",
          target_profile_id: TARGET,
          target_email: "still-here@example.com",
          created_at: daysAgo(10),
        },
      ],
    })
  })

  it("clears the address on aged rows and keeps the action", async () => {
    const cleared = await sweepAuditLogEmails()

    expect(cleared).toBe(1)

    const old = fake.tables.admin_audit_log.find((row) => row.id === "old")
    expect(old?.target_email).toBeNull()
    // The trail itself survives: who acted, what they did, and an id that no
    // longer resolves to a person.
    expect(old?.actor_email).toBe(ADMIN)
    expect(old?.action).toBe("user.deleted")
    expect(old?.target_profile_id).toBe(TARGET)
  })

  it("leaves rows inside the window alone", async () => {
    await sweepAuditLogEmails()

    const recent = fake.tables.admin_audit_log.find((row) => row.id === "recent")
    expect(recent?.target_email).toBe("still-here@example.com")
  })

  it("is idempotent — a second run finds nothing to clear", async () => {
    await sweepAuditLogEmails()

    await expect(sweepAuditLogEmails()).resolves.toBe(0)
  })

  it("throws when the sweep fails, so the cron reports it", async () => {
    fake.failNext("admin_audit_log", "permission denied")

    await expect(sweepAuditLogEmails()).rejects.toThrow()
  })
})
