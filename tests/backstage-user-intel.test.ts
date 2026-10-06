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
    lastAnalysisAt: overrides.lastAnalysisAt ?? null,
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
