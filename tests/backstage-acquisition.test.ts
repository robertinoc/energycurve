import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  MIN_PAID_FOR_SOURCE_SPLIT,
  MIN_SAMPLE_FOR_RATE,
  UNKNOWN_SOURCE,
  cohortsBySource,
  conversionBySource,
  firstAnalysisTiming,
  median,
  paidConversion,
  signupsByToolLanding,
  toolOfLanding,
  type AcquisitionUserInput,
} from "@/lib/backstage/acquisition"
import { computeUserKpis, type BackstageUserRow } from "@/lib/backstage/users"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * Lote 20, tasks 4–8: the acquisition section of the backstage. What this file
 * holds the code to, in the words of the brief: every number says what it is
 * out of, "unknown" is a first-class category and never a zero, below the
 * declared minimum there is no rate, nothing implies a cause it cannot
 * measure — and every new read sits behind the backstage's access control.
 */

const NOW = new Date("2026-10-20T12:00:00Z") // a Tuesday

function input(overrides: Partial<AcquisitionUserInput> = {}): AcquisitionUserInput {
  return {
    id: overrides.id ?? "u",
    createdAt: overrides.createdAt ?? "2026-10-19T10:00:00Z",
    plan: overrides.plan ?? "free",
    firstTouchSource: overrides.firstTouchSource ?? null,
    firstTouchMedium: overrides.firstTouchMedium ?? null,
    firstTouchLanding: overrides.firstTouchLanding ?? null,
    firstAnalysisAt: overrides.firstAnalysisAt ?? null,
    paidAt: overrides.paidAt ?? null,
  }
}

const many = (n: number, make: (i: number) => Partial<AcquisitionUserInput>) =>
  Array.from({ length: n }, (_, i) => input({ id: `u${i}`, ...make(i) }))

describe("task 4: signups by source and weekly cohort", () => {
  const measured = { available: true, since: "2026-10-12T00:00:00Z" }

  it("puts Unknown first even when it is the smallest, and counts it", () => {
    const table = cohortsBySource(
      [
        ...many(5, () => ({ firstTouchSource: "instagram" })),
        input({ id: "x", firstTouchSource: null }),
      ],
      measured,
      NOW
    )

    expect(table.sources).toEqual([UNKNOWN_SOURCE, "instagram"])
    expect(table.rows[0]).toMatchObject({ week: "2026-10-19", total: 6 })
    expect(table.rows[0]!.bySource).toEqual({ instagram: 5, [UNKNOWN_SOURCE]: 1 })
  })

  it("weeks start on Monday, the newest first, with older signups in one row", () => {
    const table = cohortsBySource(
      [
        input({ id: "mon", createdAt: "2026-10-19T00:00:00Z" }),
        input({ id: "sun", createdAt: "2026-10-18T23:59:59Z" }),
        input({ id: "old", createdAt: "2025-01-01T00:00:00Z" }),
      ],
      measured,
      NOW
    )

    expect(table.rows.map((row) => row.week).slice(0, 2)).toEqual(["2026-10-19", "2026-10-12"])
    expect(table.rows.at(-1)).toMatchObject({ week: "earlier", total: 1 })
    expect(table.rows.reduce((sum, row) => sum + row.total, 0)).toBe(table.total)
  })

  it("splits Unknown by why, and the parts add up to it", () => {
    const table = cohortsBySource(
      [
        input({ id: "before", createdAt: "2026-10-01T00:00:00Z" }),
        input({ id: "after", createdAt: "2026-10-15T00:00:00Z" }),
        input({ id: "known", createdAt: "2026-10-15T00:00:00Z", firstTouchSource: "google" }),
      ],
      measured,
      NOW
    )

    expect(table.unknownByReason).toEqual({
      not_measured: 0,
      before_measurement: 1,
      no_touch: 1,
    })
  })

  it("calls everyone 'not measured' when the columns are not there, never 'direct'", () => {
    const table = cohortsBySource(many(3, () => ({})), { available: false, since: null }, NOW)

    expect(table.sources).toEqual([UNKNOWN_SOURCE])
    expect(table.unknownByReason.not_measured).toBe(3)
  })
})

describe("task 5: signup → first analysis, by source", () => {
  it("gives no rate below the minimum sample, only the counts", () => {
    const { rows } = conversionBySource([
      ...many(3, (i) => ({ firstTouchSource: "reddit", firstAnalysisAt: i < 2 ? "2026-10-19T11:00:00Z" : null })),
    ])
    const reddit = rows.find((row) => row.source === "reddit")!

    expect(reddit.analysed).toEqual({ count: 2, of: 3, rate: null })
  })

  it("gives the rate from the minimum on, with both counts", () => {
    const { rows } = conversionBySource(
      many(MIN_SAMPLE_FOR_RATE, (i) => ({
        firstTouchSource: "google",
        firstAnalysisAt: i < 5 ? "2026-10-19T11:00:00Z" : null,
      }))
    )

    expect(rows.find((row) => row.source === "google")!.analysed).toEqual({
      count: 5,
      of: MIN_SAMPLE_FOR_RATE,
      rate: 5 / MIN_SAMPLE_FOR_RATE,
    })
  })

  it("lists Unknown first, as a row of its own, even with nobody in it", () => {
    const { rows } = conversionBySource(many(2, () => ({ firstTouchSource: "x" })))

    expect(rows[0]).toEqual({ source: UNKNOWN_SOURCE, analysed: { count: 0, of: 0, rate: null } })
  })
})

describe("task 6: the free tools", () => {
  it("knows each tool page in both languages", () => {
    expect(toolOfLanding("/tools/energy-curve")).toBe("energy_curve")
    expect(toolOfLanding("/es/herramientas/curva-de-energia")).toBe("energy_curve")
    expect(toolOfLanding("/es/herramientas/rueda-camelot")).toBe("camelot_wheel")
    expect(toolOfLanding("/es/herramientas/compatibilidad-tonalidad-bpm")).toBe("key_bpm")
    expect(toolOfLanding("/tools/traktor-rekordbox-converter")).toBe("playlist_converter")
    expect(toolOfLanding("/tools")).toBeNull()
    expect(toolOfLanding(null)).toBeNull()
  })

  it("counts signups who landed on a tool, out of signups with a known landing", () => {
    const result = signupsByToolLanding([
      input({ id: "a", firstTouchLanding: "/es/herramientas/curva-de-energia", firstAnalysisAt: "2026-10-19T11:00:00Z" }),
      input({ id: "b", firstTouchLanding: "/tools/energy-curve" }),
      input({ id: "c", firstTouchLanding: "/pricing" }),
      input({ id: "d" }),
    ])

    expect(result.withLanding).toBe(3)
    expect(result.rows.find((row) => row.tool === "energy_curve")).toEqual({
      tool: "energy_curve",
      signups: 2,
      analysed: { count: 1, of: 2, rate: null },
    })
  })
})

describe("task 7: Free → Pro", () => {
  const paidAfter = (days: number) => new Date(Date.parse("2026-09-01T00:00:00Z") + days * 86_400_000).toISOString()

  it("takes the median of days from signup to the first checkout", () => {
    const result = paidConversion([
      ...[1, 2, 3, 10, 30].map((days, i) =>
        input({ id: `p${i}`, createdAt: "2026-09-01T00:00:00Z", paidAt: paidAfter(days), plan: "pro" })
      ),
      ...many(5, () => ({})),
    ])

    expect(result.paid).toEqual({ count: 5, of: 10, rate: null })
    expect(result.medianDays).toBe(3)
  })

  it("does not split by source under the minimum, and says how many it has", () => {
    const result = paidConversion(
      many(MIN_PAID_FOR_SOURCE_SPLIT - 1, () => ({
        firstTouchSource: "instagram",
        createdAt: "2026-09-01T00:00:00Z",
        paidAt: paidAfter(4),
      }))
    )

    expect(result.bySource).toBeNull()
    expect(result.paidWithKnownSource).toBe(MIN_PAID_FOR_SOURCE_SPLIT - 1)
  })

  it("splits by source from the minimum on, Unknown first", () => {
    const result = paidConversion(
      many(MIN_PAID_FOR_SOURCE_SPLIT, () => ({
        firstTouchSource: "instagram",
        createdAt: "2026-09-01T00:00:00Z",
        paidAt: paidAfter(4),
      }))
    )

    expect(result.bySource?.map((row) => row.source)).toEqual([UNKNOWN_SOURCE, "instagram"])
    expect(result.bySource?.[1]).toEqual({ source: "instagram", paid: 20, medianDays: 4 })
  })

  it("keeps paid plans with no checkout out of the count, and says how many", () => {
    const result = paidConversion([input({ id: "granted", plan: "pro_plus" })])

    expect(result.paid.count).toBe(0)
    expect(result.paidWithoutCheckout).toBe(1)
  })
})

describe("task 8: time to first analysis, tied to the Never used KPI", () => {
  function row(overrides: Partial<BackstageUserRow>): BackstageUserRow {
    return {
      id: "u",
      email: "dj@example.com",
      name: null,
      createdAt: "2026-10-01T00:00:00Z",
      lastSeenAt: "2026-10-19T00:00:00Z",
      lastSeenObserved: true,
      suspendedAt: null,
      plan: "free",
      countryCode: null,
      utmSource: null,
      referrerDomain: null,
      playlistCount: 0,
      analysisCount: 0,
      lastAnalysisAt: null,
      firstAnalysisAt: null,
      firstTouchSource: null,
      firstTouchMedium: null,
      firstTouchLanding: null,
      paidAt: null,
      ...overrides,
    }
  }

  const users = [
    row({ id: "fast", playlistCount: 1, analysisCount: 1, firstAnalysisAt: "2026-10-01T02:00:00Z" }),
    row({ id: "slow", playlistCount: 1, analysisCount: 3, firstAnalysisAt: "2026-10-03T00:00:00Z" }),
    row({ id: "imported", playlistCount: 2 }),
    row({ id: "never-1" }),
    row({ id: "never-2" }),
    row({ id: "suspended", suspendedAt: "2026-10-02T00:00:00Z" }),
  ]

  it("counts the never-used exactly as the KPI card does", () => {
    const timing = firstAnalysisTiming(users, NOW)

    expect(timing.neverUsed).toBe(computeUserKpis(users, NOW).neverUsedUsers)
    expect(timing.neverUsed + timing.importedOnly + timing.suspended).toBe(timing.never)
    expect(timing).toMatchObject({ never: 4, neverUsed: 2, importedOnly: 1, suspended: 1 })
  })

  it("gives no median below the minimum", () => {
    expect(firstAnalysisTiming(users, NOW).medianHours).toBeNull()
  })

  it("medians: the middle one, or the mean of the two middle ones", () => {
    expect(median([5, 1, 3, 2, 4])).toBe(3)
    expect(median([1, 2, 3, 4, 5, 6])).toBe(3.5)
    expect(median([1, 2])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The service: two new reads, paged, counted by the database, failing alone
// ---------------------------------------------------------------------------

let fake: FakeSupabase
let missingFirstTouchColumns = false

/** The fake, except that selecting first_touch_* fails like PostgREST without 0034. */
function client() {
  return {
    ...fake,
    from(table: string) {
      const builder = fake.from(table)

      if (table !== "profiles" || !missingFirstTouchColumns) {
        return builder
      }

      const select = builder.select.bind(builder)

      return Object.assign(builder, {
        select(columns?: string, options?: { count?: string; head?: boolean }) {
          if (columns?.includes("first_touch") || options?.head) {
            const failure = {
              data: null,
              count: null,
              error: { code: "42703", message: "column profiles.first_touch_source does not exist" },
            }
            const chain: Record<string, unknown> = {}

            for (const method of ["order", "range", "not", "eq", "is"]) {
              chain[method] = () => chain
            }

            chain.then = (resolve: (value: typeof failure) => unknown) => resolve(failure)

            return chain
          }

          return select(columns, options)
        },
      })
    },
  }
}

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => client() }))
vi.mock("@/lib/observability/logger", () => ({ logInfo: vi.fn(), logError: vi.fn(), logWarn: vi.fn() }))
vi.mock("@/lib/backstage/posthog-reporting", () => ({ fetchBackstagePersonFacts: async () => new Map() }))
vi.mock("@workos-inc/authkit-nextjs", () => ({ getWorkOS: vi.fn(), withAuth: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`)
  },
}))

const profile = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  workos_user_id: `w-${id}`,
  email: `${id}@example.com`,
  created_at: "2026-10-10T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
  suspended_at: null,
  plan: "free",
  plan_status: null,
  last_seen_at: null,
  last_seen_country: null,
  first_touch_source: null,
  first_touch_medium: null,
  first_touch_landing: null,
  first_touch_recorded_at: null,
  ...extra,
})

describe("the snapshot's acquisition reads", () => {
  beforeEach(() => {
    missingFirstTouchColumns = false
    fake = createFakeSupabase({
      profiles: [
        profile("a", {
          first_touch_source: "producthunt",
          first_touch_medium: "directory",
          first_touch_landing: "/",
          first_touch_recorded_at: "2026-10-12T09:00:00Z",
        }),
        profile("b", { first_touch_source: "google", first_touch_recorded_at: "2026-10-11T08:00:00Z" }),
        profile("c", { plan: "pro", plan_status: "active" }),
      ],
      playlists: [],
      analyses: [
        { id: "an2", user_id: "a", created_at: "2026-10-13T00:00:00Z" },
        { id: "an1", user_id: "a", created_at: "2026-10-11T00:00:00Z" },
      ],
      billing_events: [
        { id: "evt_3", type: "customer.subscription.updated", profile_id: "c", processed_at: "2026-10-01T00:00:00Z" },
        { id: "evt_2", type: "checkout.session.completed", profile_id: "c", processed_at: "2026-10-16T00:00:00Z" },
        { id: "evt_1", type: "checkout.session.completed", profile_id: "c", processed_at: "2026-10-15T00:00:00Z" },
        { id: "evt_0", type: "checkout.session.completed", profile_id: null, processed_at: "2026-10-01T00:00:00Z" },
      ],
    })
  })

  it("carries each user's first touch, first analysis and first checkout", async () => {
    const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")
    const { users } = await getBackstageUsersSnapshot()
    const byId = new Map(users.map((user) => [user.id, user]))

    expect(byId.get("a")).toMatchObject({
      firstTouchSource: "producthunt",
      firstTouchLanding: "/",
      firstAnalysisAt: "2026-10-11T00:00:00Z",
    })
    // The earliest completed checkout, not a later one, and not another type.
    expect(byId.get("c")?.paidAt).toBe("2026-10-15T00:00:00Z")
    expect(byId.get("b")?.paidAt).toBeNull()
  })

  it("dates the measurement from the first touch recorded, and counts with the database", async () => {
    const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")
    const { acquisition } = await getBackstageUsersSnapshot()

    expect(acquisition.measurement).toEqual({ available: true, since: "2026-10-11T08:00:00Z" })
    expect(acquisition.counts).toEqual({ profiles: 3, recordedTouches: 2 })

    // Counted, not fetched: the two head queries returned no rows.
    const heads = fake.log.filter(
      (statement) => statement.table === "profiles" && statement.op === "select" && statement.rowsReturned === 0
    )

    expect(heads.length).toBeGreaterThanOrEqual(2)
  })

  it("pages the new reads past PostgREST's 1,000 rows", async () => {
    fake = createFakeSupabase({
      profiles: Array.from({ length: 1200 }, (_, i) =>
        profile(`p${String(i).padStart(5, "0")}`, { first_touch_source: "x", first_touch_recorded_at: "2026-10-12T00:00:00Z" })
      ),
      playlists: [],
      analyses: [],
      billing_events: Array.from({ length: 1100 }, (_, i) => ({
        id: `evt_${String(i).padStart(5, "0")}`,
        type: "checkout.session.completed",
        profile_id: `p${String(i).padStart(5, "0")}`,
        processed_at: "2026-10-15T00:00:00Z",
      })),
    })
    const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")
    const { users } = await getBackstageUsersSnapshot()

    expect(users.filter((user) => user.firstTouchSource === "x")).toHaveLength(1200)
    expect(users.filter((user) => user.paidAt)).toHaveLength(1100)
  })

  it("still lists every user when migration 0034 is missing, and says so", async () => {
    missingFirstTouchColumns = true
    const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")
    const snapshot = await getBackstageUsersSnapshot()

    expect(snapshot.users).toHaveLength(3)
    expect(snapshot.users.every((user) => user.firstTouchSource === null)).toBe(true)
    expect(snapshot.acquisition.measurement).toEqual({ available: false, since: null })
    expect(snapshot.acquisition.counts.recordedTouches).toBeNull()
    // The checkout read does not depend on 0034.
    expect(snapshot.users.find((user) => user.id === "c")?.paidAt).toBe("2026-10-15T00:00:00Z")
  })
})

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

describe("every new read is behind the backstage's access control", () => {
  const ROOT = process.cwd()
  const GUARDED = ["app/(en)/backstage/", "app/api/backstage/"]
  const NEW_READS = ["getBackstageUsersSnapshot", "fetchToolUsage"]

  function sourceFiles(dir: string): string[] {
    const out: string[] = []

    for (const name of readdirSync(dir)) {
      const path = join(dir, name)

      if (statSync(path).isDirectory()) {
        out.push(...sourceFiles(path))
      } else if (/\.(ts|tsx)$/.test(name)) {
        out.push(path)
      }
    }

    return out
  }

  it("is only called from pages and routes under /backstage", () => {
    const outside: string[] = []

    for (const dir of ["app", "components"]) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const rel = relative(ROOT, file)
        const text = readFileSync(file, "utf8")

        if (NEW_READS.some((name) => text.includes(`${name}(`)) && !GUARDED.some((dir) => rel.startsWith(dir))) {
          outside.push(rel)
        }
      }
    }

    expect(outside).toEqual([])
  })

  it("renders inside the backstage layout, which runs the guard before anything else", () => {
    const layout = readFileSync(join(ROOT, "app/(en)/backstage/layout.tsx"), "utf8")
    const page = readFileSync(join(ROOT, "app/(en)/backstage/page.tsx"), "utf8")

    expect(page).toContain("<AcquisitionDashboard")
    expect(layout).toMatch(/const session = await requireBackstageSession\(\)/)
  })
})

describe("the guard those pages run", () => {
  async function guardFor(user: { id: string; email: string } | null) {
    const { withAuth } = await import("@workos-inc/authkit-nextjs")

    vi.mocked(withAuth).mockResolvedValue({ user } as never)

    const { requireBackstageSession } = await import("@/lib/backstage/guard")

    return requireBackstageSession()
  }

  it("sends an anonymous visitor to log in", async () => {
    await expect(guardFor(null)).rejects.toThrow(/REDIRECT .*\/login/)
  })

  it("sends a signed-in account that is not an admin to its dashboard", async () => {
    await expect(guardFor({ id: "w1", email: "dj@example.com" })).rejects.toThrow(
      /REDIRECT .*\/dashboard/
    )
  })

  it("lets an admin through", async () => {
    vi.stubEnv("BACKSTAGE_ADMIN_EMAILS", "admin@example.com")

    await expect(guardFor({ id: "w2", email: "admin@example.com" })).resolves.toMatchObject({
      email: "admin@example.com",
    })

    vi.unstubAllEnvs()
  })
})
