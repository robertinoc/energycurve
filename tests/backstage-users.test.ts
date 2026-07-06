import { describe, expect, it } from "vitest"

import { buildBackstageUsers, computeUserKpis } from "@/lib/backstage/users"

const NOW = new Date("2026-07-06T12:00:00Z")

function profile(
  id: string,
  overrides: Partial<{
    email: string
    created_at: string
    updated_at: string
    suspended_at: string | null
  }> = {}
) {
  return {
    id,
    email: overrides.email ?? `${id}@example.com`,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-07-01T00:00:00Z",
    suspended_at: overrides.suspended_at ?? null,
  }
}

describe("buildBackstageUsers", () => {
  it("aggregates playlist and analysis counts per user", () => {
    const users = buildBackstageUsers(
      [profile("a"), profile("b")],
      [{ user_id: "a" }, { user_id: "a" }, { user_id: "b" }],
      [
        { user_id: "a", created_at: "2026-06-01T00:00:00Z" },
        { user_id: "a", created_at: "2026-06-20T00:00:00Z" },
      ]
    )

    const userA = users.find((user) => user.id === "a")
    const userB = users.find((user) => user.id === "b")

    expect(userA).toMatchObject({
      playlistCount: 2,
      analysisCount: 2,
      lastAnalysisAt: "2026-06-20T00:00:00Z",
    })
    expect(userB).toMatchObject({
      playlistCount: 1,
      analysisCount: 0,
      lastAnalysisAt: null,
    })
  })

  it("sorts newest signups first and maps updated_at to lastSeenAt", () => {
    const users = buildBackstageUsers(
      [
        profile("old", { created_at: "2026-01-01T00:00:00Z" }),
        profile("new", {
          created_at: "2026-07-01T00:00:00Z",
          updated_at: "2026-07-05T00:00:00Z",
        }),
      ],
      [],
      []
    )

    expect(users[0].id).toBe("new")
    expect(users[0].lastSeenAt).toBe("2026-07-05T00:00:00Z")
  })
})

describe("computeUserKpis", () => {
  it("computes totals, 30-day signups, and suspension counts", () => {
    const users = buildBackstageUsers(
      [
        profile("recent", { created_at: "2026-06-30T00:00:00Z" }),
        profile("older", { created_at: "2026-01-01T00:00:00Z" }),
        profile("suspended", {
          created_at: "2026-06-20T00:00:00Z",
          suspended_at: "2026-07-01T00:00:00Z",
        }),
      ],
      [],
      [
        { user_id: "recent", created_at: "2026-07-01T00:00:00Z" },
        { user_id: "recent", created_at: "2026-07-02T00:00:00Z" },
        { user_id: "older", created_at: "2026-02-01T00:00:00Z" },
      ]
    )

    expect(computeUserKpis(users, NOW)).toEqual({
      totalUsers: 3,
      newUsers30d: 2,
      usersWithAnalyses: 2,
      totalAnalyses: 3,
      suspendedUsers: 1,
    })
  })
})
