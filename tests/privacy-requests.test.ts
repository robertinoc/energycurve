import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  OWNER,
  STRANGER,
  type FakeSupabase,
} from "./helpers/supabase-fake"

/**
 * The queue behind the three rights that are not a switch.
 *
 * What is worth testing here is not "does it insert a row" — it is the three
 * properties the compliance claim rests on, each of which fails quietly:
 *
 * 1. **Requests are scoped by profile.** `services/` is the access-control
 *    surface of this product, because RLS runs with zero policies and every
 *    query goes through the service-role key. A rights request holds free text
 *    somebody wrote about their own data, so a missing `.eq` here leaks the most
 *    unpredictable personal data in the schema to the wrong account.
 * 2. **The deadline is stored, thirty days out.** A deadline computed on read is
 *    a function of today's policy. If it drifts, nothing on any screen looks
 *    wrong — the row just quietly promises something else.
 * 3. **Closing a request is idempotent.** Two clicks must not overwrite the
 *    first resolution with a second one, because the first is the one that
 *    happened inside the deadline.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => fake,
}))

vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const service = await import("@/services/privacy-request-service")

const NOW = new Date("2026-09-22T10:00:00.000Z")

function seed() {
  return {
    privacy_requests: [
      {
        id: "req-owner-open",
        profile_id: OWNER,
        kind: "restrict",
        details: "Please stop using my venue names",
        requester_email: "owner@example.com",
        status: "open",
        due_at: "2026-10-22T10:00:00.000Z",
        resolved_at: null,
        resolution_note: null,
        created_at: "2026-09-22T10:00:00.000Z",
      },
      {
        id: "req-stranger-open",
        profile_id: STRANGER,
        kind: "rectify_email",
        details: "New address is other@example.com",
        requester_email: "stranger@example.com",
        status: "open",
        due_at: "2026-09-25T10:00:00.000Z",
        resolved_at: null,
        resolution_note: null,
        created_at: "2026-08-26T10:00:00.000Z",
      },
    ],
  }
}

beforeEach(() => {
  fake = createFakeSupabase(seed())
})

describe("a request belongs to one profile", () => {
  it("does not hand a stranger the owner's request", async () => {
    const requests = await service.listPrivacyRequestsForProfile(STRANGER)

    expect(requests.map((request) => request.id)).toEqual([
      "req-stranger-open",
    ])
  })

  it("and hands the owner their own", async () => {
    const requests = await service.listPrivacyRequestsForProfile(OWNER)

    expect(requests.map((request) => request.id)).toEqual(["req-owner-open"])
  })

  it("never returns the free text somebody else wrote", async () => {
    // A sweep over the whole serialised result rather than an assertion per
    // field. The data-export bug of 11/09 is the precedent: filtering the
    // internal columns table by table missed the five tables nobody thought of,
    // and only a sweep over the whole document caught it.
    const serialised = JSON.stringify(
      await service.listPrivacyRequestsForProfile(OWNER)
    )

    expect(serialised).not.toContain("other@example.com")
    expect(serialised).not.toContain("stranger@example.com")
  })

  it("counts only this profile's open requests", async () => {
    await expect(service.countOpenPrivacyRequests(OWNER)).resolves.toBe(1)
  })
})

describe("the deadline", () => {
  it("is stored on the row, thirty days out", async () => {
    const created = await service.createPrivacyRequest({
      profileId: OWNER,
      kind: "object",
      details: null,
      requesterEmail: "owner@example.com",
      now: NOW,
    })

    expect(created).not.toBeNull()
    // 30 calendar days, which is what Art. 12(3) means by a month — the
    // procedure document is explicit that it is not working days.
    expect(created?.dueAt).toBe("2026-10-22T10:00:00.000Z")
  })

  it("is thirty days and not a month of a variable length", () => {
    // Pinned as a number so a well-meaning change to "one calendar month" has
    // to be a deliberate one. February would make a month 28 days, which is
    // shorter than the regulation allows.
    expect(service.PRIVACY_REQUEST_DEADLINE_DAYS).toBe(30)
  })
})

describe("closing a request", () => {
  it("records the outcome and the time", async () => {
    await expect(
      service.resolvePrivacyRequest({
        requestId: "req-owner-open",
        status: "answered",
        note: "Restricted the venue fields",
        now: NOW,
      })
    ).resolves.toBe(true)

    const row = fake.tables.privacy_requests.find(
      (candidate) => candidate.id === "req-owner-open"
    )

    expect(row?.status).toBe("answered")
    expect(row?.resolved_at).toBe(NOW.toISOString())
    expect(row?.resolution_note).toBe("Restricted the venue fields")
  })

  it("is idempotent: a second close changes nothing and says so", async () => {
    await service.resolvePrivacyRequest({
      requestId: "req-owner-open",
      status: "answered",
      note: "first",
      now: NOW,
    })

    await expect(
      service.resolvePrivacyRequest({
        requestId: "req-owner-open",
        status: "refused",
        note: "second",
        now: new Date("2026-10-30T10:00:00.000Z"),
      })
    ).resolves.toBe(false)

    const row = fake.tables.privacy_requests.find(
      (candidate) => candidate.id === "req-owner-open"
    )

    // The first resolution is the one that happened inside the deadline, so it
    // is the one that has to survive.
    expect(row?.resolution_note).toBe("first")
    expect(row?.resolved_at).toBe(NOW.toISOString())
  })

  it("reports a request that does not exist the same as one already closed", async () => {
    await expect(
      service.resolvePrivacyRequest({
        requestId: "req-does-not-exist",
        status: "answered",
        note: "",
      })
    ).resolves.toBe(false)
  })
})

describe("the panel's view", () => {
  it("is sorted by what is due soonest and carries the day count", async () => {
    const open = await service.listOpenPrivacyRequests(25, NOW)

    expect(open.map((request) => request.id)).toEqual([
      "req-stranger-open",
      "req-owner-open",
    ])
    expect(open[0].daysUntilDue).toBe(3)
    expect(open[1].daysUntilDue).toBe(30)
  })

  it("reports an overdue request as a negative number", async () => {
    const open = await service.listOpenPrivacyRequests(
      25,
      new Date("2026-10-01T10:00:00.000Z")
    )

    const overdue = open.find((request) => request.id === "req-stranger-open")

    expect(overdue?.daysUntilDue).toBeLessThan(0)
  })
})

describe("a row that does not match the schema", () => {
  it("is dropped rather than rendered under the wrong label", async () => {
    // Unreachable through this code — the check constraints refuse it — but not
    // unreachable from the SQL editor. The label is what tells the reader which
    // legal deadline applies, so a request shown under the wrong one is worse
    // than one that does not show.
    fake.tables.privacy_requests.push({
      id: "req-bogus",
      profile_id: OWNER,
      kind: "erase_everything",
      details: null,
      requester_email: null,
      status: "open",
      due_at: "2026-10-22T10:00:00.000Z",
      resolved_at: null,
      resolution_note: null,
      created_at: "2026-09-22T10:00:00.000Z",
    })

    const requests = await service.listPrivacyRequestsForProfile(OWNER)

    expect(requests.map((request) => request.id)).toEqual(["req-owner-open"])
  })
})

describe("when the count cannot be read", () => {
  it("fails closed rather than letting the queue grow unbounded", async () => {
    fake.failNext("privacy_requests", "connection reset")

    const count = await service.countOpenPrivacyRequests(OWNER)

    // Infinity, so the caller's `>= MAX_OPEN_REQUESTS` refuses. Refusing one
    // legitimate request costs somebody an email to hello@ — which the copy
    // names, with the same deadline. Allowing an unknown number costs the queue.
    expect(count).toBe(Number.POSITIVE_INFINITY)
  })
})
