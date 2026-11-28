import { describe, expect, it } from "vitest"

import { countryFlagEmoji, countryName } from "@/lib/backstage/country"
import {
  DEFAULT_SORT,
  acquisitionChannel,
  activityStatus,
  buildUsersCsv,
  countBy,
  formatRelative,
  joinedInPeriod,
  nextSort,
  paginate,
  sortUsers,
  type BackstageUserRow,
} from "@/lib/backstage/users"

const NOW = new Date("2026-10-06T12:00:00Z")

function user(overrides: Partial<BackstageUserRow> = {}): BackstageUserRow {
  return {
    id: overrides.id ?? "u1",
    email: overrides.email ?? "dj@example.com",
    name: overrides.name ?? null,
    createdAt: overrides.createdAt ?? "2026-09-01T00:00:00Z",
    lastSeenAt: overrides.lastSeenAt ?? "2026-10-01T00:00:00Z",
    lastSeenObserved: overrides.lastSeenObserved ?? true,
    suspendedAt: overrides.suspendedAt ?? null,
    plan: overrides.plan ?? "free",
    countryCode: overrides.countryCode ?? null,
    utmSource: overrides.utmSource ?? null,
    referrerDomain: overrides.referrerDomain ?? null,
    playlistCount: overrides.playlistCount ?? 1,
    analysisCount: overrides.analysisCount ?? 0,
    analysisCount30d: overrides.analysisCount30d ?? 0,
    analysisCount90d: overrides.analysisCount90d ?? 0,
    lastAnalysisAt: overrides.lastAnalysisAt ?? null,
    firstAnalysisAt: overrides.firstAnalysisAt ?? null,
    firstTouchSource: overrides.firstTouchSource ?? null,
    firstTouchMedium: overrides.firstTouchMedium ?? null,
    firstTouchLanding: overrides.firstTouchLanding ?? null,
    paidAt: overrides.paidAt ?? null,
  }
}

describe("activityStatus", () => {
  it("suspension wins over everything", () => {
    expect(
      activityStatus(
        user({ suspendedAt: "2026-09-01T00:00:00Z", playlistCount: 0 }),
        NOW
      )
    ).toBe("suspended")
  })

  it("no playlists and no analyses means never used", () => {
    expect(
      activityStatus(user({ playlistCount: 0, analysisCount: 0 }), NOW)
    ).toBe("never")
  })

  it("splits active and inactive at the 30-day line", () => {
    expect(
      activityStatus(user({ lastSeenAt: "2026-09-20T00:00:00Z" }), NOW)
    ).toBe("active")
    expect(
      activityStatus(user({ lastSeenAt: "2026-08-01T00:00:00Z" }), NOW)
    ).toBe("inactive")
  })
})

describe("acquisitionChannel", () => {
  it("groups utm sources into channels (campaign wins over referrer)", () => {
    expect(
      acquisitionChannel({ utmSource: "chatgpt.com", referrerDomain: "google.com" })
    ).toEqual({ kind: "campaign", label: "AI" })
  })

  it("falls back to the referring domain, mapped through the same rules", () => {
    expect(
      acquisitionChannel({ utmSource: null, referrerDomain: "www.google.com" })
    ).toEqual({ kind: "referrer", label: "Google" })
  })

  it("keeps unmatched raw values visible", () => {
    expect(
      acquisitionChannel({ utmSource: "virtuous-frog-06", referrerDomain: null })
        .label
    ).toBe("virtuous-frog-06")
  })

  it("maps PostHog's $direct to Direct, and nothing to unknown", () => {
    expect(
      acquisitionChannel({ utmSource: null, referrerDomain: "$direct" })
    ).toEqual({ kind: "direct", label: "Direct" })
    expect(
      acquisitionChannel({ utmSource: null, referrerDomain: null }).kind
    ).toBe("unknown")
  })
})

describe("formatRelative", () => {
  it("picks the coarsest sensible unit", () => {
    expect(formatRelative("2026-10-06T11:59:40Z", NOW)).toBe("just now")
    expect(formatRelative("2026-10-06T11:10:00Z", NOW)).toBe("50m")
    expect(formatRelative("2026-10-06T02:00:00Z", NOW)).toBe("10h")
    expect(formatRelative("2026-09-29T12:00:00Z", NOW)).toBe("7d")
    expect(formatRelative("2026-07-06T12:00:00Z", NOW)).toBe("3mo")
    expect(formatRelative("2024-10-06T12:00:00Z", NOW)).toBe("2y")
  })
})

describe("sortUsers", () => {
  it("sends null values last in either direction", () => {
    const rows = [
      user({ id: "a", countryCode: null }),
      user({ id: "b", countryCode: "AR" }),
      user({ id: "c", countryCode: "US" }),
    ]

    expect(
      sortUsers(rows, { key: "country", dir: "asc" }).map((row) => row.id)
    ).toEqual(["b", "c", "a"])
    expect(
      sortUsers(rows, { key: "country", dir: "desc" }).map((row) => row.id)
    ).toEqual(["c", "b", "a"])
  })

  it("flips direction on the same column and resets on a new one", () => {
    const flipped = nextSort(DEFAULT_SORT, "joined")

    expect(flipped).toEqual({ key: "joined", dir: "asc" })
    expect(nextSort(flipped, "playlists")).toEqual({
      key: "playlists",
      dir: "desc",
    })
  })
})

describe("paginate", () => {
  const rows = Array.from({ length: 60 }, (_, index) =>
    user({ id: `u${index}` })
  )

  it("slices and reports the window", () => {
    const page2 = paginate(rows, 2, 25)

    expect(page2.items).toHaveLength(25)
    expect(page2.items[0].id).toBe("u25")
    expect([page2.from, page2.to, page2.pageCount]).toEqual([26, 50, 3])
  })

  it("clamps out-of-range pages and survives empty lists", () => {
    expect(paginate(rows, 99, 25).page).toBe(3)
    expect(paginate([], 1, 25)).toMatchObject({ from: 0, to: 0, total: 0 })
  })
})

describe("cohort periods", () => {
  it("this month / last month are calendar windows", () => {
    const joinedSept = user({ createdAt: "2026-09-15T00:00:00Z" })
    const joinedOct = user({ createdAt: "2026-10-02T00:00:00Z" })

    expect(joinedInPeriod(joinedOct, "this_month", NOW)).toBe(true)
    expect(joinedInPeriod(joinedSept, "this_month", NOW)).toBe(false)
    expect(joinedInPeriod(joinedSept, "last_month", NOW)).toBe(true)
    expect(joinedInPeriod(joinedOct, "last_month", NOW)).toBe(false)
    expect(joinedInPeriod(joinedSept, "all", NOW)).toBe(true)
  })
})

describe("countBy", () => {
  it("counts descending and skips nulls", () => {
    const rows = [
      user({ countryCode: "AR" }),
      user({ countryCode: "AR" }),
      user({ countryCode: "US" }),
      user({ countryCode: null }),
    ]

    expect(countBy(rows, (row) => row.countryCode)).toEqual([
      { key: "AR", count: 2 },
      { key: "US", count: 1 },
    ])
  })
})

describe("buildUsersCsv", () => {
  it("quotes every cell and defuses formula injection", () => {
    const csv = buildUsersCsv(
      [user({ email: "=HYPERLINK(evil)@x.com", countryCode: "AR" })],
      NOW
    )

    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain('"\'=HYPERLINK(evil)@x.com"')
    expect(csv).toContain('"AR"')
  })
})

describe("country helpers", () => {
  it("builds the flag from regional indicators", () => {
    expect(countryFlagEmoji("ar")).toBe("🇦🇷")
    expect(countryFlagEmoji("bad")).toBe("")
  })

  it("names countries and falls back to the code", () => {
    expect(countryName("AR")).toBe("Argentina")
    expect(countryName("ZZ")).toBeTruthy()
  })
})

describe("message templates", () => {
  it("greets by name when there is one, plainly when there is not", async () => {
    const { messageGreeting, BACKSTAGE_MESSAGE_TEMPLATES } = await import(
      "@/lib/backstage/message-templates"
    )

    expect(messageGreeting("Viva Vinson")).toBe("Hi Viva Vinson,")
    expect(messageGreeting("  ")).toBe("Hi,")
    expect(messageGreeting(null)).toBe("Hi,")

    for (const template of BACKSTAGE_MESSAGE_TEMPLATES) {
      expect(template.body("Hi Ana,").startsWith("Hi Ana,")).toBe(true)

      if (template.id !== "custom") {
        expect(template.subject.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("resolveRange / joinedInRange", () => {
  it("reads custom dates as UTC days with an inclusive end", async () => {
    const { resolveRange, joinedInRange } = await import("@/lib/backstage/users")
    const range = resolveRange(
      "custom",
      { from: "2026-11-01", to: "2026-11-15" },
      NOW
    )

    expect(joinedInRange({ createdAt: "2026-11-01T00:00:00Z" }, range)).toBe(true)
    // The 15th counts whole: picking an end date means "through that day".
    expect(joinedInRange({ createdAt: "2026-11-15T23:59:00Z" }, range)).toBe(true)
    expect(joinedInRange({ createdAt: "2026-11-16T00:00:00Z" }, range)).toBe(false)
    expect(joinedInRange({ createdAt: "2026-10-31T23:59:00Z" }, range)).toBe(false)
  })

  it("treats empty or garbage fields as open ends, and presets as before", async () => {
    const { resolveRange, joinedInRange } = await import("@/lib/backstage/users")

    expect(
      joinedInRange(
        { createdAt: "2020-01-01T00:00:00Z" },
        resolveRange("custom", { to: "2026-11-15" }, NOW)
      )
    ).toBe(true)
    expect(
      joinedInRange(
        { createdAt: "2020-01-01T00:00:00Z" },
        resolveRange("custom", { from: "not-a-date" }, NOW)
      )
    ).toBe(true)
    expect(resolveRange("all", {}, NOW)).toEqual({ from: null, to: null })
  })
})

describe("mostActiveUsers", () => {
  it("ranks by the window's analyses, breaking ties by playlists then last seen", async () => {
    const { mostActiveUsers } = await import("@/lib/backstage/users")
    const rows = [
      user({ id: "all-time-hero", analysisCount: 50, analysisCount30d: 0, analysisCount90d: 2 }),
      user({ id: "hot", analysisCount: 6, analysisCount30d: 6, analysisCount90d: 6 }),
      user({ id: "tied-more-sets", analysisCount30d: 3, playlistCount: 5, analysisCount: 3 }),
      user({ id: "tied-fewer-sets", analysisCount30d: 3, playlistCount: 1, analysisCount: 3 }),
      user({ id: "idle", analysisCount: 0 }),
    ]

    expect(mostActiveUsers(rows, "30d").map((row) => row.id)).toEqual([
      "hot",
      "tied-more-sets",
      "tied-fewer-sets",
    ])
    // The all-time hero reappears when the window opens up.
    expect(mostActiveUsers(rows, "all")[0].id).toBe("all-time-hero")
  })

  it("never ranks suspended accounts or zero-analysis users", async () => {
    const { mostActiveUsers } = await import("@/lib/backstage/users")
    const rows = [
      user({ id: "banned", analysisCount30d: 9, analysisCount: 9, suspendedAt: "2026-11-01T00:00:00Z" }),
      user({ id: "idle", analysisCount: 0 }),
    ]

    expect(mostActiveUsers(rows, "30d")).toEqual([])
  })

  it("windowed counts come out of buildBackstageUsers", async () => {
    const { buildBackstageUsers } = await import("@/lib/backstage/users")
    const now = new Date("2026-11-28T12:00:00Z")
    const [row] = buildBackstageUsers(
      [
        {
          id: "u1",
          workos_user_id: "wos_u1",
          email: "u1@example.com",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-11-27T00:00:00Z",
          suspended_at: null,
          plan: "free",
          plan_status: null,
          last_seen_at: null,
          last_seen_country: null,
        },
      ],
      [],
      [
        { user_id: "u1", created_at: "2026-11-20T00:00:00Z" }, // 30d y 90d
        { user_id: "u1", created_at: "2026-10-01T00:00:00Z" }, // solo 90d
        { user_id: "u1", created_at: "2026-02-01T00:00:00Z" }, // solo total
      ],
      new Map(),
      new Map(),
      {},
      now
    )

    expect(row.analysisCount).toBe(3)
    expect(row.analysisCount90d).toBe(2)
    expect(row.analysisCount30d).toBe(1)
  })
})
