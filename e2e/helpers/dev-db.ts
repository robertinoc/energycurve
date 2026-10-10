import { spawnSync } from "node:child_process"
import { join } from "node:path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { readAppEnv, repoRoot } from "./env-file"

/**
 * The dev database, for the specs that need volume or a state the interface
 * cannot reach in a reasonable time.
 *
 * Two things live here and nothing else:
 *
 * - **Volume** comes from `scripts/seed-scale.mjs`, run as a child process and
 *   never edited from here. It already refuses the production project by name,
 *   writes only rows it can find again by a marker, and its `clean` was
 *   verified to put dev back the way it was. A spec that wrote its own volume
 *   would be a second generator with none of those properties.
 * - **Reads to count against**, through the service role. A spec that checks a
 *   number the interface shows needs the number the database holds, read by a
 *   path that is not the one under test.
 */

/** The dev ref `scripts/seed-scale.mjs` accepts. Anything else is refused here too. */
const DEV_REF = "djoutoutkukpjrdgjqkb"

export function devDbConfigured(): boolean {
  const url = readAppEnv("SUPABASE_URL")

  return Boolean(url && readAppEnv("SUPABASE_SERVICE_ROLE_KEY") && url.includes(DEV_REF))
}

/**
 * Why a volume spec did not run. Skipped, never passed: the whole point of
 * these specs is a number, and a green tick over a number nobody read is the
 * exact failure the lote 17 defects were.
 */
export const DEV_DB_SKIP_REASON =
  "No dev database to seed: SUPABASE_URL must point at the dev project " +
  `(${DEV_REF}) and SUPABASE_SERVICE_ROLE_KEY must be set, in the environment or in .env.local. ` +
  "Skipped, not passed — no volume was seeded and nothing was counted."

let client: SupabaseClient | null = null

export function devDb(): SupabaseClient {
  if (!devDbConfigured()) {
    throw new Error(DEV_DB_SKIP_REASON)
  }

  client ??= createClient(
    readAppEnv("SUPABASE_URL"),
    readAppEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  )

  return client
}

export async function profileIdFor(email: string): Promise<string> {
  const { data, error } = await devDb()
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())

  if (error) throw new Error(`Reading the profile of ${email}: ${error.message}`)
  if (!data || data.length !== 1) {
    throw new Error(`Expected one profile for ${email}, found ${data?.length ?? 0}.`)
  }

  return data[0].id as string
}

/** Playlists the account owns right now, counted by the database. */
export async function ownedPlaylistCount(profileId: string): Promise<number> {
  const { count, error } = await devDb()
    .from("playlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId)

  if (error) throw new Error(`Counting playlists: ${error.message}`)

  return count ?? 0
}

/** Every playlist of the account with its track count, by the database. */
export async function playlistTrackCounts(
  profileId: string
): Promise<Map<string, { name: string; count: number; createdAt: string }>> {
  const out = new Map<string, { name: string; count: number; createdAt: string }>()

  // Paged by hand, ordered by the primary key: the account can own more
  // playlists than one PostgREST response returns.
  for (let from = 0; ; from += 500) {
    const { data, error } = await devDb()
      .from("playlists")
      .select("id, name, created_at, tracks(count)")
      .eq("user_id", profileId)
      .order("id", { ascending: true })
      .range(from, from + 499)

    if (error) throw new Error(`Reading playlist counts: ${error.message}`)

    for (const row of data ?? []) {
      const tracks = row.tracks as Array<{ count: number }> | null
      out.set(row.id as string, {
        name: row.name as string,
        count: tracks?.[0]?.count ?? 0,
        createdAt: row.created_at as string,
      })
    }

    if (!data || data.length < 500) return out
  }
}

interface SeedStatus {
  target: string
  markedPlaylists: number
}

/**
 * Runs `scripts/seed-scale.mjs` with these arguments and returns its JSON.
 *
 * Synchronous on purpose: the specs that use it run one at a time in the
 * authenticated shard, and a seed that is still writing when the page opens
 * is a race the test would lose some of the time.
 */
export function seedScale(args: string[]): Record<string, unknown> {
  const result = spawnSync(
    process.execPath,
    [join(repoRoot(), "scripts", "seed-scale.mjs"), ...args],
    { cwd: repoRoot(), encoding: "utf8", timeout: 180_000 }
  )

  if (result.status !== 0) {
    throw new Error(
      `seed-scale ${args[0]} exited ${result.status}: ${(result.stderr || result.stdout).slice(-800)}`
    )
  }

  // `seed` prints two plain lines (target, migrations) before its JSON.
  const json = result.stdout.slice(result.stdout.indexOf("{"))

  return JSON.parse(json) as Record<string, unknown>
}

export function seedStatus(): SeedStatus {
  return seedScale(["status"]) as unknown as SeedStatus
}

/** Playlists a given seed wrote, by the marker `seed-scale.mjs` puts in the description. */
export async function seededPlaylistIds(seed: number): Promise<string[]> {
  const { data, error } = await devDb()
    .from("playlists")
    .select("id")
    .like("description", `[scale-seed:${seed}]%`)

  if (error) throw new Error(`Finding seed ${seed}: ${error.message}`)

  return (data ?? []).map((row) => row.id as string)
}

/**
 * Deletes what these seeds wrote, and nothing else.
 *
 * Through `seed-scale.mjs clean --seed N`, one seed at a time — never a bare
 * `clean`, and the reason cost another session its measurement: a bare `clean`
 * deletes every marked row in dev, whoever seeded it. On 06/10/2026 a
 * debugging run of this file cleaned 31 playlists where it had seeded one; the
 * other 30 belonged to the lote 18 session, which was measuring against them.
 *
 * This used to be a delete of its own, written here before `--seed` existed.
 * Now the generator that writes the rows is the only thing that removes them,
 * so the marker, the escaping of the seed number and the children it clears
 * live in one place. `seededPlaylistIds` stays as the independent read the
 * spec closes with: it checks the generator's work by a path that is not the
 * generator.
 */
export async function deleteSeeds(seeds: readonly number[]): Promise<void> {
  for (const seed of seeds) {
    seedScale(["clean", "--seed", String(seed)])
  }
}

/** Tracks of one playlist with their BPM, in the order the database stores them. */
export async function tracksInOrder(playlistId: string): Promise<Array<{ id: string; bpm: number | null }>> {
  const rows: Array<{ id: string; bpm: number | null }> = []

  for (let from = 0; ; from += 1000) {
    const { data, error } = await devDb()
      .from("tracks")
      .select("id, bpm")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999)

    if (error) throw new Error(`Reading track order: ${error.message}`)

    rows.push(...(data ?? []).map((row) => ({ id: row.id as string, bpm: row.bpm === null ? null : Number(row.bpm) })))

    if (!data || data.length < 1000) return rows
  }
}
