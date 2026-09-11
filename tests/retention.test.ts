import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * Data retention on `billing_events`.
 *
 * The table stored the complete Stripe event in `payload jsonb` — customer
 * name, email, billing address, country — and nothing ever deleted it. Worse,
 * the FK to `profiles` is `on delete set null`, so a payload **outlived the
 * person it belonged to**: deleting an account left its billing details behind,
 * orphaned and indefinite.
 *
 * The test that matters most is not that old payloads go. It is that the
 * **rows stay** — the primary key is Stripe's event id and it is the only thing
 * stopping a redelivered webhook granting a plan twice.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

const { sweepBillingPayloads, BILLING_PAYLOAD_RETENTION_DAYS } = await import(
  "@/services/retention-service"
)

const PII = {
  customer_email: "dj@example.com",
  customer_name: "Jordi Vidal",
  address: { line1: "Carrer de Pamplona 88", country: "ES" },
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

beforeEach(() => {
  fake = createFakeSupabase({
    billing_events: [
      {
        id: "evt_recent",
        type: "checkout.session.completed",
        profile_id: "profile-1",
        payload: PII,
        processed_at: daysAgo(3),
      },
      {
        id: "evt_old",
        type: "invoice.payment_failed",
        profile_id: "profile-1",
        payload: PII,
        processed_at: daysAgo(BILLING_PAYLOAD_RETENTION_DAYS + 10),
      },
      {
        id: "evt_orphan_recent",
        type: "customer.subscription.deleted",
        profile_id: null,
        payload: PII,
        processed_at: daysAgo(1),
      },
      {
        id: "evt_already_clean",
        type: "customer.subscription.updated",
        profile_id: "profile-1",
        payload: null,
        processed_at: daysAgo(400),
      },
    ],
  })
})

function rowById(id: string) {
  return fake.tables.billing_events.find((row) => row.id === id)
}

describe("what the sweep removes", () => {
  it("drops the payload of an event past the window", async () => {
    await sweepBillingPayloads()

    expect(rowById("evt_old")?.payload).toBeNull()
  })

  it("drops the payload of a deleted account's event immediately, whatever its age", async () => {
    // The event is one day old and would survive the window by months. It does
    // not survive the erasure: when someone deletes their account, the reason to
    // hold their billing details ends that day. An erasure that leaves the data
    // sitting for ninety more days is not an erasure.
    await sweepBillingPayloads()

    expect(rowById("evt_orphan_recent")?.payload).toBeNull()
  })

  it("leaves nothing personal in the rows it scrubbed", async () => {
    await sweepBillingPayloads()

    // Scoped to the scrubbed rows on purpose. The first version of this test
    // serialised the whole table and failed — because `evt_recent` keeps its
    // payload, correctly: it is three days old and belongs to a live account.
    // A retention sweep that emptied everything would pass that assertion and
    // be a bug.
    const scrubbed = ["evt_old", "evt_orphan_recent"].map(rowById)
    const serialised = JSON.stringify(scrubbed)

    expect(serialised).not.toContain("dj@example.com")
    expect(serialised).not.toContain("Jordi Vidal")
    expect(serialised).not.toContain("Carrer de Pamplona")
  })

  it("and the untouched rows still hold theirs, so the sweep is not a truncate", async () => {
    await sweepBillingPayloads()

    expect(JSON.stringify(rowById("evt_recent"))).toContain("dj@example.com")
  })

  it("reports what it did, in counts", async () => {
    await expect(sweepBillingPayloads()).resolves.toEqual({
      agedOut: 1,
      orphaned: 1,
    })
  })
})

describe("what the sweep must never remove", () => {
  it("keeps every row, because the primary key is the idempotency guarantee", async () => {
    const idsBefore = fake.tables.billing_events.map((row) => row.id)

    await sweepBillingPayloads()

    // Deleting the row would let a redelivery of a six-month-old event be
    // processed as new — Stripe can and does redeliver.
    expect(fake.tables.billing_events.map((row) => row.id)).toEqual(idsBefore)
  })

  it("keeps the id, the type and the timestamp, which are the audit trail", async () => {
    await sweepBillingPayloads()

    expect(rowById("evt_old")).toMatchObject({
      id: "evt_old",
      type: "invoice.payment_failed",
      profile_id: "profile-1",
    })
    expect(rowById("evt_old")?.processed_at).toBeTruthy()
  })

  it("leaves a recent event belonging to a live account untouched", async () => {
    await sweepBillingPayloads()

    expect(rowById("evt_recent")?.payload).toEqual(PII)
  })
})

describe("running it more than once", () => {
  it("is idempotent, and the second run reports nothing to do", async () => {
    await sweepBillingPayloads()

    // A daily cron runs ~365 times a year against mostly-clean data. If the
    // second pass kept "finding" the same rows, the counts would be noise and
    // nobody would read them.
    await expect(sweepBillingPayloads()).resolves.toEqual({
      agedOut: 0,
      orphaned: 0,
    })
  })

  it("does not touch a row whose payload is already null", async () => {
    await sweepBillingPayloads()

    expect(rowById("evt_already_clean")?.payload).toBeNull()
  })
})

describe("a configurable window", () => {
  it("scrubs more when the window is shorter", async () => {
    const result = await sweepBillingPayloads({ retentionDays: 2 })

    expect(result.agedOut).toBe(2) // evt_recent (3 days) and evt_old
    expect(rowById("evt_recent")?.payload).toBeNull()
  })
})

describe("when the database refuses", () => {
  it("throws rather than reporting a sweep that did not happen", async () => {
    // A cron that logs "swept 0" when the query failed is how a retention
    // policy quietly stops running.
    fake.failNext("billing_events", "permission denied")

    await expect(sweepBillingPayloads()).rejects.toThrow(/deleted accounts/i)
  })
})
