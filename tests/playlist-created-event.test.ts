import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `playlist_created` has to say which playlist, on every path that makes one.
 *
 * Step 1.2 (docs/conversion-plan.md) exists so that more imported sets get
 * analysed, and telling whether it worked means following a set from
 * `playlist_created` to `analysis_completed` by its id. The hand-built path
 * sent `playlistId`; the imports did not. A funnel keyed on it would have
 * measured only the path nobody was asking about, and would not have said so.
 */

const events = vi.hoisted(
  () => [] as Array<{ event: string; properties: Record<string, unknown> }>
)
const created = vi.hoisted(() => [] as string[])

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
vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServerEvent: (_profileId: string, event: string, properties: Record<string, unknown>) => {
    events.push({ event, properties })
  },
}))
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile_1", email: "dj@example.com", suspended_at: null }),
}))
vi.mock("@/services/rate-limit-service", () => ({ consumeRateLimit: async () => ({ allowed: true }) }))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: "pro", status: "active" }),
}))
vi.mock("@/services/playlist-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/playlist-service")>()),
  countPlaylists: async () => 0,
  createPlaylistWithTracks: async () => {
    const id = `00000000-0000-4000-8000-00000000000${created.length + 1}`

    created.push(id)

    return { id }
  },
  deletePlaylist: async () => {},
}))

/** 40 tracks of 6 minutes: long enough for the import to offer a split. */
function csv(): string {
  const rows = ["Artist,Title,BPM,Key,Time,Energy"]

  for (let i = 0; i < 40; i += 1) {
    rows.push(`Artist ${i},Track ${i},124,${(i % 12) + 1}A,6:00,${(i % 10) + 1}`)
  }

  return rows.join("\n")
}

async function importFile(split: { count?: number; criterion?: string } = {}) {
  const data = new FormData()

  data.set("file", new File([csv()], "night.csv", { type: "text/csv" }))
  data.set("context", "main")
  data.set("genre", "house")
  data.set("name", "Night")
  data.set("splitCount", String(split.count ?? 0))
  data.set("splitCriterion", split.criterion ?? "")

  const { importPlaylistAction } = await import("@/app/(en)/dashboard/playlists/actions")

  await expect(importPlaylistAction({ ok: false, message: null } as never, data)).rejects.toThrow(
    /^REDIRECT /
  )
}

const createdEvents = () => events.filter((one) => one.event === "playlist_created")

beforeEach(() => {
  events.length = 0
  created.length = 0
})

describe("playlist_created says which playlist", () => {
  it("an imported file names the playlist it created", async () => {
    await importFile()

    expect(created).toHaveLength(1)
    expect(createdEvents()).toHaveLength(1)
    expect(createdEvents()[0].properties).toMatchObject({
      playlistId: created[0],
      via: "import",
    })
  })

  it("an import split into sets is still one event, and names every set", async () => {
    await importFile({ count: 3, criterion: "own_curve" })

    expect(created).toHaveLength(3)
    // One event, as before: the count of `playlist_created` must not jump
    // because of where the id was added.
    expect(createdEvents()).toHaveLength(1)
    expect(createdEvents()[0].properties).toMatchObject({
      playlistId: created[0],
      playlistIds: created.join(","),
      splitInto: 3,
    })
  })

  it("every place that emits it sends the id, under the same name", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(en)/dashboard/playlists/actions.ts"),
      "utf8"
    )
    const emitters = [
      ...source.matchAll(/captureServerEvent\(\s*[\w.]+,\s*"playlist_created",\s*\{([^}]*)\}/g),
    ].map((match) => match[1])

    // Manual, file import, split import, audio files. A fifth path has to
    // show up here, and has to carry the id too.
    expect(emitters).toHaveLength(4)

    for (const body of emitters) {
      expect(body, body.trim()).toMatch(/^\s*playlistId[,:]/m)
    }
  })

  it("the two analysis events already carry it, under the same name", () => {
    const source = readFileSync(join(process.cwd(), "services/analysis-service.ts"), "utf8")

    for (const event of ["analysis_started", "analysis_completed"]) {
      const body = new RegExp(
        `captureServerEvent\\(\\s*[\\w.]+,\\s*"${event}",\\s*\\{([^}]*)\\}`
      ).exec(source)?.[1]

      expect(body, event).toBeTruthy()
      expect(body, event).toMatch(/^\s*playlistId[,:]/m)
    }
  })
})
