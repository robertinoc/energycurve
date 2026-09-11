import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * The uptime probe an external monitor watches, and the thing a Supabase
 * free-tier pause takes down first (it did, on 2026-07-28 — which is why
 * `.github/workflows/keep-supabase-alive.yml` exists).
 *
 * Two properties matter and neither was tested: it must answer 503 when the
 * database is unreachable, because a monitor that only ever sees 200 is
 * decoration; and it must not leak configuration, because it is public.
 */

let fake: FakeSupabase
let supabaseConfigured = true
let workosConfigured = true
/** Set by the one test that needs connecting itself to fail. */
let clientThrows: Error | null = null

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => {
    if (clientThrows) throw clientThrows
    return fake
  },
}))
vi.mock("@/lib/config/infrastructure-status", () => ({
  getInfrastructureStatus: () => ({ supabaseConfigured, workosConfigured }),
}))

const { GET } = await import("@/app/api/health/route")

beforeEach(() => {
  fake = createFakeSupabase({ profiles: [{ id: "profile-1" }] })
  supabaseConfigured = true
  workosConfigured = true
  clientThrows = null
})

describe("when everything is reachable", () => {
  it("answers 200 with the shape a monitor reads", async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      database: "ok",
      auth: "configured",
    })
  })
})

describe("when the database is not", () => {
  it("answers 503 on a query error, not 200 with a sad message", async () => {
    fake.failNext("profiles", "connection refused")

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      database: "unreachable",
    })
  })

  it("answers 503 when the client itself throws", async () => {
    // A paused Supabase project fails at connect time, before any query — the
    // 2026-07-28 outage. The route's try/catch is what turns that into a 503
    // instead of an unhandled 500 the monitor reads as "the site is down"
    // without saying which part.
    clientThrows = new Error("project is paused")

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      database: "unreachable",
    })
  })

  it("reports not_configured rather than a false ok when there is no Supabase", async () => {
    supabaseConfigured = false

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      database: "not_configured",
    })
  })
})

describe("what it refuses to say", () => {
  it("leaks no URL, key, version, count or environment name", async () => {
    const body = await (await GET()).text()

    for (const leak of [
      "supabase.co",
      "SUPABASE",
      "eyJ",
      "sk_",
      "whsec_",
      "count",
      "version",
      "NODE_ENV",
      "vercel",
    ]) {
      expect(body.toLowerCase()).not.toContain(leak.toLowerCase())
    }
  })

  it("says only status, database, auth and a timestamp", async () => {
    const body = (await (await GET()).json()) as Record<string, unknown>

    expect(Object.keys(body).sort()).toEqual([
      "auth",
      "database",
      "status",
      "timestamp",
    ])
  })
})
