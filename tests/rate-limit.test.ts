import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * The limiter, after it stopped being a Map.
 *
 * The property worth testing is not "six requests get refused" — the old
 * in-memory version did that too, on the instance that happened to see them. It
 * is that **two servers reach the same conclusion**, which is what the epoch
 * alignment buys and what the old window could not do at any price.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

const { checkRateLimit, windowStart } = await import("@/lib/rate-limit")

const HOUR = 60 * 60_000

beforeEach(() => {
  fake = createFakeSupabase()
})

describe("windowStart", () => {
  it("floors to the window, so every server agrees without talking", () => {
    // The whole point. Three clocks inside the same hour, one bucket.
    expect(windowStart(3_600_000, HOUR)).toBe(3_600_000)
    expect(windowStart(3_600_001, HOUR)).toBe(3_600_000)
    expect(windowStart(7_199_999, HOUR)).toBe(3_600_000)
  })

  it("moves to the next bucket exactly on the boundary", () => {
    expect(windowStart(7_200_000, HOUR)).toBe(7_200_000)
  })
})

describe("counting", () => {
  it("allows up to the limit and refuses after it", async () => {
    const call = () =>
      checkRateLimit({ key: "export:dj", limit: 3, windowMs: HOUR, now: 1_000 })

    expect((await call()).allowed).toBe(true)
    expect((await call()).allowed).toBe(true)
    expect((await call()).allowed).toBe(true)
    expect((await call()).allowed).toBe(false)
  })

  it("counts the same person across two servers as one", async () => {
    // Two instances, same key, same clock: the state is in the database, so the
    // second instance sees what the first one did. This is the assertion the
    // in-memory limiter could never have passed.
    const serverA = () =>
      checkRateLimit({ key: "export:dj", limit: 2, windowMs: HOUR, now: 5_000 })
    const serverB = () =>
      checkRateLimit({ key: "export:dj", limit: 2, windowMs: HOUR, now: 5_050 })

    expect((await serverA()).allowed).toBe(true)
    expect((await serverB()).allowed).toBe(true)
    expect((await serverA()).allowed).toBe(false)
  })

  it("keeps one person's budget away from another's", async () => {
    await checkRateLimit({ key: "export:a", limit: 1, windowMs: HOUR, now: 0 })

    const other = await checkRateLimit({
      key: "export:b",
      limit: 1,
      windowMs: HOUR,
      now: 0,
    })

    expect(other.allowed).toBe(true)
  })

  it("starts fresh in the next window", async () => {
    const spend = (now: number) =>
      checkRateLimit({ key: "export:dj", limit: 1, windowMs: HOUR, now })

    expect((await spend(0)).allowed).toBe(true)
    expect((await spend(HOUR - 1)).allowed).toBe(false)
    expect((await spend(HOUR)).allowed).toBe(true)
  })

  it("reports how long until the window turns over, not the whole window", async () => {
    // Retry-After has to name the wait that is left. Telling someone to come
    // back in an hour when the bucket resets in ninety seconds is a worse answer
    // than no header.
    const result = await checkRateLimit({
      key: "export:dj",
      limit: 1,
      windowMs: HOUR,
      now: HOUR - 90_000,
    })

    expect(result.retryAfterMs).toBe(90_000)
  })
})

describe("when the database is unreachable", () => {
  it("lets the request through rather than taking the product down", async () => {
    // Fails open on purpose, and it is safe for a specific reason rather than a
    // general one: every endpoint behind this limiter needs the same database to
    // do its work, so an open limiter grants access to something that cannot be
    // served anyway. Failing closed would turn a database blip into an outage.
    fake.failNext("rate_limit_buckets", "connection refused")

    const result = await checkRateLimit({
      key: "export:dj",
      limit: 1,
      windowMs: HOUR,
      now: 0,
    })

    expect(result.allowed).toBe(true)
  })
})
