import { describe, expect, it } from "vitest"

import { currentPeriodStart, quotaState } from "@/lib/product/usage"

describe("currentPeriodStart", () => {
  it("returns the first day of the month a moment falls in", () => {
    expect(currentPeriodStart(new Date("2026-08-14T20:15:00Z"))).toBe("2026-08-01")
    expect(currentPeriodStart(new Date("2026-08-01T00:00:00Z"))).toBe("2026-08-01")
    expect(currentPeriodStart(new Date("2026-08-31T23:59:59Z"))).toBe("2026-08-01")
  })

  it("pads single-digit months so the string sorts and compares correctly", () => {
    // "2026-1-01" would break both the date column and any lexical comparison.
    expect(currentPeriodStart(new Date("2026-01-09T12:00:00Z"))).toBe("2026-01-01")
    expect(currentPeriodStart(new Date("2026-09-09T12:00:00Z"))).toBe("2026-09-01")
  })

  it("rolls over at the year boundary", () => {
    expect(currentPeriodStart(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12-01")
    expect(currentPeriodStart(new Date("2027-01-01T00:00:00Z"))).toBe("2027-01-01")
  })

  it("uses UTC, not the server's local zone", () => {
    // 2026-09-01T00:30 UTC is still 31 August in Buenos Aires. The period has to
    // be the same for the server, the database and every reader, or a quota
    // resets at a different instant depending on who asks.
    expect(currentPeriodStart(new Date("2026-09-01T00:30:00Z"))).toBe("2026-09-01")
    expect(currentPeriodStart(new Date("2026-08-31T23:30:00Z"))).toBe("2026-08-01")
  })
})

describe("quotaState", () => {
  it("allows up to the limit and not past it", () => {
    expect(quotaState(0, 3)).toMatchObject({ allowed: true, remaining: 3 })
    expect(quotaState(2, 3)).toMatchObject({ allowed: true, remaining: 1 })
    expect(quotaState(3, 3)).toMatchObject({ allowed: false, remaining: 0 })
  })

  it("treats null as unlimited", () => {
    const state = quotaState(9_999, null)
    expect(state.allowed).toBe(true)
    expect(state.limit).toBeNull()
    expect(state.remaining).toBeNull()
  })

  it("handles being over the limit without going negative", () => {
    // Happens legitimately: a plan downgraded mid-month, or a limit tightened.
    // The answer is "no more", not a negative remaining.
    expect(quotaState(7, 3)).toMatchObject({ allowed: false, remaining: 0 })
  })

  it("refuses everything on a zero limit", () => {
    expect(quotaState(0, 0)).toMatchObject({ allowed: false, remaining: 0 })
  })

  it("reports the numbers back for display", () => {
    // The API returns these to the client so the message can say "2 of 3" rather
    // than a bare refusal.
    expect(quotaState(2, 3)).toEqual({
      allowed: true,
      used: 2,
      limit: 3,
      remaining: 1,
    })
  })
})
