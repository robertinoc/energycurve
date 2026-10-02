import { readFileSync } from "node:fs"
import { writeFileSync } from "node:fs"

import { describe, expect, it, vi } from "vitest"

import { assertDevTarget, stableUuid } from "../../scripts/seed-scale.mjs"

/**
 * The four breaking points of docs/qa/breaking-points-2026-09.md — plus the
 * fifth this lote found — measured with real services against the dev database
 * at volumes written by scripts/seed-scale.mjs.
 *
 * Each level is one generated profile, seeded beforehand:
 *
 *   node scripts/seed-scale.mjs seed --seed <seed> --users 1 --playlists <P> --tracks <T>
 *
 * The services are the real ones — the point is to measure the code that runs,
 * not a model of it — so this must never see production. The guard below and
 * the one in the generator both refuse it.
 */

// The services under measurement never call WorkOS on these paths; the module is
// mocked only because it cannot load outside Next (it imports next/cache).
vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: vi.fn(), getWorkOS: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }))

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/)
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "")
  }
}
assertDevTarget(process.env.SUPABASE_URL)

const { getSupabaseAdminClient } = await import("@/lib/supabase/server")
const { getDashboardSnapshot } = await import("@/services/dashboard-service")
const { listPlaylists, reorderTracks, getOwnedPlaylistWithTracks } = await import(
  "@/services/playlist-service"
)
const { buildAccountExport } = await import("@/services/data-export-service")

export const LEVELS = [
  { seed: 1601, playlists: 10, tracks: 50 },
  { seed: 1602, playlists: 25, tracks: 60 },
  { seed: 1603, playlists: 100, tracks: 300 },
  { seed: 1604, playlists: 400, tracks: 10 },
  { seed: 1605, playlists: 60, tracks: 1000 },
] as const

async function timed<T>(fn: () => Promise<T>, runs = 3): Promise<{ value: T; ms: number[]; median: number }> {
  const ms: number[] = []
  let value!: T
  for (let i = 0; i < runs; i++) {
    const started = performance.now()
    value = await fn()
    ms.push(Math.round(performance.now() - started))
  }
  const sorted = [...ms].sort((a, b) => a - b)
  return { value, ms, median: sorted[Math.floor(sorted.length / 2)] }
}

const results: Record<string, unknown> = {}

describe("breaking points, with numbers", () => {
  it("PostgREST `in()` filters: how many ids fit in one request", async () => {
    // listPlaylists and the export both filter tracks with `.in("playlist_id", ids)`,
    // and a GET carries the list in its URL. Probed with ids that match nothing.
    const supabase = getSupabaseAdminClient()
    const probe: Record<number, string> = {}
    for (const n of [100, 200, 250, 300, 350, 400, 500, 800]) {
      const ids = Array.from({ length: n }, (_, i) => stableUuid(999, `probe:${i}`))
      const { error } = await supabase.from("tracks").select("id").in("playlist_id", ids).limit(1)
      probe[n] = error ? `error: ${String((error as { message?: string }).message ?? error).slice(0, 80)}` : "ok"
    }
    results.inFilter = probe
    expect(Object.keys(probe).length).toBeGreaterThan(0)
  })

  for (const level of LEVELS) {
    it(`level ${level.playlists} playlists × ${level.tracks} tracks`, async () => {
      const supabase = getSupabaseAdminClient()
      const profileId = stableUuid(level.seed, "profile:0")
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).single()
      expect(profile, `seed ${level.seed} first`).toBeTruthy()

      const truthTracks = level.playlists * level.tracks
      const user = {
        id: profile!.workos_user_id as string,
        email: profile!.email as string,
        firstName: null,
        lastName: null,
      }

      // Each measurement records its own failure rather than aborting the row:
      // at 400 playlists the dashboard throws, and that is a result, not a reason
      // to skip measuring the export.
      const safe = async <T,>(fn: () => Promise<T>, runs = 3) => {
        try {
          return { ...(await timed(fn, runs)), error: null as string | null }
        } catch (caught) {
          return { value: null as T | null, ms: [] as number[], median: 0, error: String((caught as Error).message) }
        }
      }

      const dashboard = await safe(() => getDashboardSnapshot(user))
      const list = await safe(() => listPlaylists(profileId))
      const listed = list.value ? list.value.reduce((sum, p) => sum + p.trackCount, 0) : null
      const exported = await safe(() => buildAccountExport(profileId), 1)

      results[`level_${level.playlists}x${level.tracks}`] = {
        truth: { playlists: level.playlists, tracks: truthTracks },
        dashboard: dashboard.error
          ? { error: dashboard.error }
          : {
              ms: dashboard.ms,
              playlistCount: dashboard.value!.playlistCount,
              trackCount: dashboard.value!.trackCount,
              correct:
                dashboard.value!.trackCount === truthTracks &&
                dashboard.value!.playlistCount === level.playlists,
            },
        listPlaylists: list.error
          ? { error: list.error }
          : {
              ms: list.ms,
              rows: list.value!.length,
              sumOfTrackCounts: listed,
              correct: listed === truthTracks && list.value!.length === level.playlists,
              playlistsShowingZero: list.value!.filter((p) => p.trackCount === 0).length,
            },
        export: exported.error
          ? { error: exported.error }
          : {
              ms: exported.ms,
              playlists: exported.value?.playlists.length ?? null,
              tracks: exported.value?.tracks.length ?? null,
              correct:
                exported.value?.tracks.length === truthTracks &&
                exported.value?.playlists.length === level.playlists,
            },
      }
    })
  }

  it("reorder: one full reversal, by set size", async () => {
    const reorder: Record<string, unknown> = {}
    for (const level of [LEVELS[0], LEVELS[2], LEVELS[4]]) {
      const profileId = stableUuid(level.seed, "profile:0")
      const playlistId = stableUuid(level.seed, `playlist:${profileId}:0`)
      const before = await getOwnedPlaylistWithTracks(profileId, playlistId)
      const ids = before!.tracks.map((track) => track.id).reverse()
      const started = performance.now()
      let error: string | null = null
      try {
        await reorderTracks(profileId, playlistId, ids)
      } catch (caught) {
        error = String((caught as Error).message)
      }
      const ms = Math.round(performance.now() - started)
      const after = await getOwnedPlaylistWithTracks(profileId, playlistId)
      reorder[`${level.tracks} tracks`] = {
        ms,
        error,
        correct: JSON.stringify(after!.tracks.map((t) => t.id)) === JSON.stringify(ids),
      }
    }
    results.reorder = reorder
  })

  it("writes the numbers down", () => {
    writeFileSync("tests/perf/.last-run.json", JSON.stringify(results, null, 2))
    console.log(JSON.stringify(results, null, 2))
  })
})
