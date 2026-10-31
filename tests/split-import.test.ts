import { beforeEach, describe, expect, it, vi } from "vitest"

import { tooManyTracksMessage } from "@/lib/playlists/import-limit"
import { assessImport } from "@/lib/playlists/import-readiness"
import { SPLIT_COPY } from "@/lib/playlists/split-copy"

/**
 * The server half of the split: the import action, run for real, with only
 * its edges mocked — the session, the profile, the rate limiter, billing and
 * the writes. What it must get right is all-or-nothing: the right number of
 * sets, each in its planned order, or nothing at all.
 */

type Created = { input: { name: string }; tracks: Array<{ name: string; energyScore: number | null }> }

const created: Created[] = []
const deleted: string[] = []
const state = vi.hoisted(() => ({
  failOn: null as number | null,
  plan: "pro" as "free" | "pro",
  used: 0,
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({
    user: { id: "user_1", email: "dj@example.com", firstName: null, lastName: null },
  }),
  getWorkOS: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`)
  },
}))
vi.mock("@/lib/server-locale", () => ({ getRequestLocale: vi.fn(async () => "en") }))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile_1", email: "dj@example.com", suspended_at: null }),
}))
vi.mock("@/services/rate-limit-service", () => ({ consumeRateLimit: async () => ({ allowed: true }) }))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: state.plan, status: state.plan === "free" ? null : "active" }),
}))
vi.mock("@/services/playlist-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/playlist-service")>()),
  countPlaylists: async () => state.used,
  createPlaylistWithTracks: async (_profileId: string, input: { name: string }, tracks: Created["tracks"]) => {
    if (state.failOn === created.length + 1) {
      throw new Error("insert failed")
    }

    created.push({ input, tracks })

    return { id: `00000000-0000-4000-8000-00000000000${created.length}` }
  },
  deletePlaylist: async (_profileId: string, id: string) => {
    deleted.push(id)
  },
}))

/** A CSV the readers understand: 40 tracks of 6 minutes at 124 BPM, energy 1–10. */
function csv(count = 40, withKeys = true): string {
  const rows = ["Artist,Title,BPM,Key,Time,Energy"]

  for (let i = 0; i < count; i += 1) {
    rows.push(
      `Artist ${i},Track ${i},124,${withKeys ? `${(i % 12) + 1}A` : ""},6:00,${(i % 10) + 1}`
    )
  }

  return rows.join("\n")
}

function form(text: string, split: { count?: number; criterion?: string } = {}): FormData {
  const data = new FormData()

  data.set("file", new File([text], "night.csv", { type: "text/csv" }))
  data.set("context", "main")
  data.set("genre", "house")
  data.set("name", "Night")
  data.set("splitCount", String(split.count ?? 0))
  data.set("splitCriterion", split.criterion ?? "")

  return data
}

async function run(data: FormData) {
  const { importPlaylistAction } = await import("@/app/(en)/dashboard/playlists/actions")

  return importPlaylistAction({ ok: false, message: null } as never, data)
}

beforeEach(() => {
  created.length = 0
  deleted.length = 0
  state.failOn = null
  state.plan = "pro"
  state.used = 0
})

describe("what the form is offered", () => {
  it("40 six-minute tracks play about 3 h 20: offered as 3 or 4 sets, all criteria open", () => {
    const readiness = assessImport(csv())

    expect(readiness.kind).toBe("ready")
    if (readiness.kind !== "ready") return
    expect(readiness.split?.duration).toMatchObject({ method: "measured", minutes: 200 })
    expect(readiness.split?.counts).toEqual([3, 4])
    expect(readiness.split?.harmonic.available).toBe(true)
  })

  it("closes the harmonic criterion when the file carries no keys", () => {
    const readiness = assessImport(csv(40, false))

    if (readiness.kind !== "ready") throw new Error(readiness.kind)
    expect(readiness.split?.harmonic).toMatchObject({ available: false, missingKeys: 40 })
  })

  it("asks nothing for a list of about an hour", () => {
    const readiness = assessImport(csv(11))

    if (readiness.kind !== "ready") throw new Error(readiness.kind)
    expect(readiness.split).toBeNull()
  })

  it("says too many before anything is sent", () => {
    expect(assessImport(csv(81))).toEqual({ kind: "too_many", tracks: 81 })
    expect(tooManyTracksMessage(81, "en")).toContain("81")
  })
})

describe("the import, split", () => {
  it("creates the sets in playing order, named, and lands on the result page", async () => {
    await expect(run(form(csv(), { count: 3, criterion: "own_curve" }))).rejects.toThrow(
      /REDIRECT \/dashboard\/playlists\/split\?ids=.+,.+,.+&criterion=own_curve/
    )

    expect(created.map((set) => set.input.name)).toEqual([
      "Night · Set 1 of 3",
      "Night · Set 2 of 3",
      "Night · Set 3 of 3",
    ])
    expect(created.flatMap((set) => set.tracks.map((track) => track.name)).sort()).toEqual(
      Array.from({ length: 40 }, (_, i) => `Track ${i}`).sort()
    )
  })

  it("stores each set in its suggested order, not in file order", async () => {
    await expect(run(form(csv(), { count: 3, criterion: "continuous" }))).rejects.toThrow(/REDIRECT/)

    // Bands: set 1 is the calmest, and its order climbs.
    const first = created[0].tracks.map((track) => track.energyScore as number)

    expect(Math.max(...first)).toBeLessThanOrEqual(Math.min(...created[1].tracks.map((t) => t.energyScore as number)))
    expect(first[0]).toBeLessThanOrEqual(first.at(-1) as number)
  })

  it("refuses a count the list was not offered, and creates nothing", async () => {
    const result = await run(form(csv(), { count: 2, criterion: "own_curve" }))

    expect(result.message).toBe(SPLIT_COPY.invalidChoice.en)
    expect(created).toHaveLength(0)
  })

  it("refuses harmonic without the keys, even if the form sent it", async () => {
    const result = await run(form(csv(40, false), { count: 3, criterion: "harmonic" }))

    expect(result.message).toBe(SPLIT_COPY.invalidChoice.en)
    expect(created).toHaveLength(0)
  })

  it("checks the plan's room for every set before creating the first", async () => {
    state.plan = "free"
    state.used = 1

    const result = await run(form(csv(), { count: 3, criterion: "own_curve" }))

    expect(result.message).toMatch(/creates 3 sets, and your plan has room for \d more/)
    expect(created).toHaveLength(0)
  })

  it("deletes the sets already made when a later one fails", async () => {
    state.failOn = 3

    const result = await run(form(csv(), { count: 3, criterion: "own_curve" }))

    expect(result.ok).toBe(false)
    expect(created).toHaveLength(2)
    expect(deleted).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ])
  })

  it("without a split, imports one set exactly as before", async () => {
    await expect(run(form(csv()))).rejects.toThrow(/REDIRECT \/dashboard\/playlists\/00000000-0000-4000-8000-000000000001\?imported=1/)
    expect(created).toHaveLength(1)
    expect(created[0].tracks.map((track) => track.name)).toEqual(
      Array.from({ length: 40 }, (_, i) => `Track ${i}`)
    )
  })
})
