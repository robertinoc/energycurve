import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  MIN_COHORT_FOR_TREND,
  buildOpportunities,
} from "@/lib/backstage/opportunities"
import {
  computeUserKpis,
  type BackstageUserRow,
} from "@/lib/backstage/users"

const NOW = new Date("2026-11-28T12:00:00Z")

function user(overrides: Partial<BackstageUserRow> = {}): BackstageUserRow {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    email: overrides.email ?? "dj@example.com",
    name: overrides.name ?? null,
    createdAt: overrides.createdAt ?? "2026-09-01T00:00:00Z",
    lastSeenAt: overrides.lastSeenAt ?? "2026-11-27T00:00:00Z",
    lastSeenObserved: true,
    suspendedAt: overrides.suspendedAt ?? null,
    plan: overrides.plan ?? "free",
    countryCode: overrides.countryCode ?? null,
    utmSource: null,
    referrerDomain: null,
    playlistCount: overrides.playlistCount ?? 1,
    analysisCount: overrides.analysisCount ?? 1,
    analysisCount30d: overrides.analysisCount30d ?? 0,
    analysisCount90d: overrides.analysisCount90d ?? 0,
    lastAnalysisAt: overrides.lastAnalysisAt ?? null,
    firstAnalysisAt:
      overrides.firstAnalysisAt !== undefined
        ? overrides.firstAnalysisAt
        : (overrides.analysisCount ?? 1) > 0
          ? "2026-09-02T00:00:00Z"
          : null,
    firstTouchSource: overrides.firstTouchSource ?? null,
    firstTouchMedium: overrides.firstTouchMedium ?? null,
    firstTouchLanding: null,
    paidAt: overrides.paidAt ?? null,
  }
}

function build(users: BackstageUserRow[]) {
  return buildOpportunities(users, computeUserKpis(users, NOW), NOW)
}

function byId(users: BackstageUserRow[], id: string) {
  return build(users).find((opportunity) => opportunity.id === id)
}

describe("activation trend", () => {
  const cohort = (
    count: number,
    activated: number,
    createdAt: string
  ): BackstageUserRow[] =>
    Array.from({ length: count }, (_, i) =>
      user({ createdAt, analysisCount: i < activated ? 1 : 0 })
    )

  it("flags a fall of 10 points or more as high", () => {
    const users = [
      ...cohort(20, 4, "2026-11-20T00:00:00Z"), // 20% últimos 28d
      ...cohort(20, 12, "2026-10-20T00:00:00Z"), // 60% los 28 anteriores
    ]
    const found = byId(users, "activation-trend")

    expect(found?.severity).toBe("high")
    expect(found?.title).toContain("falling")
    expect(found?.evidence).toContain("4 of 20")
    expect(found?.evidence).toContain("12 of 20")
  })

  it("says nothing below the cohort minimum — a rate from 5 users is noise", () => {
    const users = [
      ...cohort(MIN_COHORT_FOR_TREND - 1, 1, "2026-11-20T00:00:00Z"),
      ...cohort(20, 12, "2026-10-20T00:00:00Z"),
    ]

    expect(byId(users, "activation-trend")).toBeUndefined()
  })
})

describe("early drop and dormant power users", () => {
  it("counts signups older than two weeks with zero analyses", () => {
    const users = [
      user({ createdAt: "2026-11-01T00:00:00Z", analysisCount: 0, playlistCount: 0 }),
      user({ createdAt: "2026-11-27T00:00:00Z", analysisCount: 0, playlistCount: 0 }), // muy nuevo: no cuenta
      user({ analysisCount: 2 }),
    ]
    const found = byId(users, "early-drop")

    expect(found?.title).toContain("1 signed up")
    expect(found?.action?.href).toContain("status=never")
  })

  it("names the power users who went quiet", () => {
    const users = [
      user({
        name: "Hdiji Med",
        analysisCount: 8,
        lastSeenAt: "2026-09-01T00:00:00Z",
      }),
      user({ analysisCount: 1, lastSeenAt: "2026-11-27T00:00:00Z" }),
    ]
    const found = byId(users, "dormant-power-users")

    expect(found?.severity).toBe("high")
    expect(found?.evidence).toContain("Hdiji Med")
  })

  it("suspended accounts trigger neither", () => {
    const users = [
      user({
        suspendedAt: "2026-10-01T00:00:00Z",
        createdAt: "2026-10-01T00:00:00Z",
        analysisCount: 0,
      }),
      user({
        suspendedAt: "2026-10-01T00:00:00Z",
        analysisCount: 9,
        lastSeenAt: "2026-09-01T00:00:00Z",
      }),
    ]

    expect(byId(users, "early-drop")).toBeUndefined()
    expect(byId(users, "dormant-power-users")).toBeUndefined()
  })
})

describe("stuck at the wall", () => {
  it("lists free users at the playlist limit as the upgrade shortlist", () => {
    const users = [
      user({ plan: "free", playlistCount: 3 }),
      user({ plan: "free", playlistCount: 4 }),
      user({ plan: "pro", playlistCount: 9 }),
    ]
    const found = byId(users, "stuck-at-wall")

    expect(found?.title).toContain("2 free users")
    expect(found?.action?.href).toContain("plan=free")
  })
})

describe("channel contrast", () => {
  it("needs the rate minimum, then names best and worst", () => {
    const users = [
      // 25 de instagram, 20 activados (80%)
      ...Array.from({ length: 25 }, (_, i) =>
        user({ firstTouchSource: "instagram", analysisCount: i < 20 ? 1 : 0 })
      ),
      // 20 de chatgpt, 2 activados (10%)
      ...Array.from({ length: 20 }, (_, i) =>
        user({ firstTouchSource: "chatgpt", analysisCount: i < 2 ? 1 : 0 })
      ),
    ]
    const found = byId(users, "channel-contrast")

    expect(found?.title).toContain("Instagram")
    expect(found?.evidence).toContain("AI")
  })

  it("stays silent when no channel reaches the sample", () => {
    const users = Array.from({ length: 5 }, () =>
      user({ firstTouchSource: "instagram" })
    )

    expect(byId(users, "channel-contrast")).toBeUndefined()
  })
})

describe("ordering and emptiness", () => {
  it("sorts high before medium before info", () => {
    const users = [
      // dormido con valor (high) + muro (medium)
      user({ analysisCount: 5, lastSeenAt: "2026-09-01T00:00:00Z" }),
      user({ plan: "free", playlistCount: 3 }),
    ]
    const severities = build(users).map((opportunity) => opportunity.severity)

    expect(severities).toEqual([...severities].sort((a, b) => {
      const order = { high: 0, medium: 1, info: 2 } as const

      return order[a] - order[b]
    }))
  })

  it("an empty dataset flags nothing", () => {
    expect(build([])).toEqual([])
  })
})

describe("where the panel lives", () => {
  const ROOT = join(__dirname, "..")

  it("is its own tab, not a block inside Users — that page got crowded", () => {
    const opportunitiesPage = readFileSync(
      join(ROOT, "app/(en)/backstage/opportunities/page.tsx"),
      "utf8"
    )
    const usersPage = readFileSync(join(ROOT, "app/(en)/backstage/page.tsx"), "utf8")
    const nav = readFileSync(join(ROOT, "app/(en)/backstage/BackstageNav.tsx"), "utf8")
    const layout = readFileSync(join(ROOT, "app/(en)/backstage/layout.tsx"), "utf8")

    expect(opportunitiesPage).toContain("<OpportunitiesPanel")
    expect(usersPage).not.toContain("OpportunitiesPanel")
    expect(nav).toContain("/backstage/opportunities")
    // The new page renders inside the layout whose guard runs first.
    expect(layout).toMatch(/const session = await requireBackstageSession\(\)/)
  })
})
