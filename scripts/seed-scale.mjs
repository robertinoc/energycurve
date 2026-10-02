#!/usr/bin/env node
/**
 * A dev database with enough in it to measure something.
 *
 * ## Why this exists
 *
 * `docs/qa/breaking-points-2026-09.md` ends by saying it cannot answer how long
 * anything takes, and gives the reason: `supabase/seed.sql` makes 3 playlists
 * and 19 tracks. That is a fixture for developing against, not a base to time.
 * This makes the base the load tests in `docs/qa/carga-2026-10.md` ran against.
 *
 * ## The four properties, and why each one is not optional
 *
 * - **Deterministic.** The same `--seed` writes the same rows — same ids, same
 *   names, same BPMs, same timestamps. Two measurements are only comparable if
 *   they ran against the same data; a generator that rolls new numbers every run
 *   makes every comparison an argument about noise. `fingerprint` hashes what is
 *   in the database so that is checked, not assumed.
 * - **Plausible, not noise.** BPMs inside each genre's band in
 *   `GENRE_BPM_PROFILES_V2` (lib/product/strategy.ts), keys in Camelot, energy
 *   1–10, all twelve genres of the enum. `tests/seed-scale.test.ts` fails if the
 *   copy of the band table below stops matching the engine's.
 * - **Reversible.** Every row it writes carries a marker, and `clean` deletes by
 *   the marker — never by count or by date. The three test accounts end the lote
 *   at 0 playlists.
 * - **Never production.** It refuses any Supabase URL that is not the dev
 *   project or a local one, and names the production ref when it sees it.
 *
 * ## Over REST, and what that costs the migration check
 *
 * It writes through PostgREST with the service-role key — the same path the app
 * uses, and the only credential the containers that run this usually have. The
 * migration gate reuses `readMigrations` and `verdictFor` from
 * `scripts/migration-status.mjs`. Over REST it can see tables, columns, enum
 * types and enum values (PostgREST publishes them in its OpenAPI document) and
 * not indexes, RLS or policies, so it gates on what it can see and says which
 * kinds it could not. With `MIGRATION_DB_URL` set it runs the full
 * `migration-status.mjs` instead and requires a clean exit. The one migration
 * that matters most here is visible either way: without `0005` seven of the
 * twelve genres are not in the enum and every insert of them fails with a
 * message that names nothing.
 *
 * ## Usage
 *
 *   node scripts/seed-scale.mjs seed  --seed 7 --users 20 --playlists 10 --tracks 40
 *   node scripts/seed-scale.mjs seed  --seed 7 --owner e2e-pro@energycurve.app --playlists 50 --tracks 600
 *   node scripts/seed-scale.mjs fingerprint --seed 7
 *   node scripts/seed-scale.mjs clean
 *   node scripts/seed-scale.mjs status
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or from
 * `.env.local`. Never prints the key.
 */

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { readMigrations, verdictFor } from "./migration-status.mjs"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

export const DEV_REF = "djoutoutkukpjrdgjqkb"
export const PRODUCTION_REF = "iwzkzybzadsmnwilcity"

/** Every row this writes is findable by one of these. `clean` deletes by them. */
export const MARKER = {
  workosPrefix: "scale_seed_",
  emailDomain: "example.com", // RFC 2606: never routes anywhere
  descriptionPrefix: "[scale-seed:",
}

/**
 * A copy of `GENRE_BPM_PROFILES_V2`. A copy because this is a plain `.mjs` that
 * runs without a TypeScript toolchain; `tests/seed-scale.test.ts` compares it to
 * the engine's table so the copy cannot drift without a test going red.
 */
export const GENRE_BPM = {
  house: [118, 128],
  "deep-house": [112, 124],
  "organic-house": [108, 122],
  "disco-house": [112, 126],
  "tech-house": [120, 130],
  techno: [125, 140],
  "hard-techno": [138, 158],
  "melodic-techno": [116, 126],
  progressive: [116, 126],
  trance: [130, 142],
  "psy-trance": [136, 148],
  bounce: [124, 136],
}

export const GENRES = Object.keys(GENRE_BPM)
export const CONTEXTS = ["opening", "main", "closing"]
export const CAMELOT = Array.from({ length: 12 }, (_, i) => [`${i + 1}A`, `${i + 1}B`]).flat()

/** Fixed epoch for every timestamp, so a re-run writes the same instants. */
const EPOCH = Date.parse("2026-09-01T00:00:00.000Z")

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

/** mulberry32: small, fast, and the same sequence on every machine. */
export function rng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A v4-shaped UUID derived from the seed and a label — stable across runs. */
export function stableUuid(seed, label) {
  const hex = createHash("sha256").update(`${seed}:${label}`).digest("hex")
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

const pick = (random, list) => list[Math.floor(random() * list.length)]
const between = (random, low, high) => low + random() * (high - low)

const WORDS = [
  "Night", "Signal", "Pressure", "Drift", "Pulse", "Echo", "Static", "Velvet",
  "Tunnel", "Orbit", "Granite", "Neon", "Ember", "Hollow", "Circuit", "Mirage",
]

/**
 * The rows for one seed, as plain objects — no I/O. `seed` and `fingerprint`
 * both start here, which is what makes "same seed, same base" checkable.
 */
export function generate({ seed, users, playlists, tracks, owners = [] }) {
  const random = rng(seed)
  const profileRows = []
  const playlistRows = []
  const trackRows = []

  for (let u = 0; u < users; u++) {
    profileRows.push({
      id: stableUuid(seed, `profile:${u}`),
      workos_user_id: `${MARKER.workosPrefix}${seed}_${u}`,
      email: `scale-seed-${seed}-${u}@${MARKER.emailDomain}`,
      plan: "pro",
      plan_status: "active",
      preferred_locale: u % 2 === 0 ? "es" : "en",
      created_at: new Date(EPOCH + u * 60_000).toISOString(),
      updated_at: new Date(EPOCH + u * 60_000).toISOString(),
    })
  }

  // Owners first are generated profiles, then any existing ones passed in (the
  // test accounts, so the app can be logged into against this data).
  const ownerIds = [...profileRows.map((row) => row.id), ...owners]

  ownerIds.forEach((ownerId, o) => {
    for (let p = 0; p < playlists; p++) {
      const genre = GENRES[(o * playlists + p) % GENRES.length]
      const playlistId = stableUuid(seed, `playlist:${ownerId}:${p}`)
      const at = new Date(EPOCH + (o * playlists + p) * 3_600_000).toISOString()

      playlistRows.push({
        id: playlistId,
        user_id: ownerId,
        name: `${pick(random, WORDS)} ${pick(random, WORDS)} ${p + 1}`,
        genre,
        context: CONTEXTS[p % CONTEXTS.length],
        import_source: "seed",
        description: `${MARKER.descriptionPrefix}${seed}] generated by scripts/seed-scale.mjs`,
        created_at: at,
        updated_at: at,
      })

      const [low, high] = GENRE_BPM[genre]
      // A gentle arc with some drops, so the analysis finds something.
      for (let t = 0; t < tracks; t++) {
        const progress = tracks > 1 ? t / (tracks - 1) : 0
        const arc = Math.sin(Math.PI * progress)
        const bpm = Math.round(low + (high - low) * (0.3 + 0.6 * arc) + between(random, -2, 2))
        const energy = Math.max(1, Math.min(10, Math.round(3 + 6 * arc + between(random, -1.5, 1.5))))

        trackRows.push({
          id: stableUuid(seed, `track:${playlistId}:${t}`),
          playlist_id: playlistId,
          position: t + 1,
          artist: `Seed Artist ${pick(random, WORDS)}`,
          name: `${pick(random, WORDS)} ${pick(random, WORDS)}`,
          bpm: Math.max(low - 6, Math.min(high + 6, bpm)),
          musical_key: pick(random, CAMELOT),
          energy_score: energy,
          duration_seconds: Math.round(between(random, 240, 480)),
          genre,
          created_at: at,
        })
      }
    }
  })

  return { profiles: profileRows, playlists: playlistRows, tracks: trackRows }
}

/** sha256 of rows in a canonical order and key order. */
export function fingerprint(rows) {
  const canon = (row) => JSON.stringify(Object.keys(row).sort().map((key) => [key, normalizeValue(row[key])]))
  const sorted = [...rows].map(canon).sort()
  return createHash("sha256").update(sorted.join("\n")).digest("hex")
}

function normalizeValue(value) {
  // PostgREST hands numerics back as numbers and timestamps with "+00:00".
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toISOString()
  }
  return value
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Throws unless `url` is the dev project or a local one. Loudly. */
export function assertDevTarget(url) {
  if (!url) {
    throw new Error("SUPABASE_URL is not set.")
  }
  if (url.includes(PRODUCTION_REF)) {
    throw new Error(
      `REFUSED: ${PRODUCTION_REF} is the PRODUCTION project. This script writes thousands of rows and must never run there.`
    )
  }
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url)
  const dev = url.startsWith(`https://${DEV_REF}.supabase.co`)
  if (!local && !dev) {
    throw new Error(
      `REFUSED: ${url.replace(/\/\/([^.]+)\..*/, "//$1…")} is not the dev project (${DEV_REF}) or a local one.`
    )
  }
}

/** The schema PostgREST publishes, in the shape `verdictFor` reads. */
export function schemaFromOpenApi(openapi) {
  const tables = new Set()
  const columns = new Set()
  const types = new Set()
  const enumValues = new Set()

  for (const [table, definition] of Object.entries(openapi.definitions ?? {})) {
    tables.add(table)
    for (const [column, property] of Object.entries(definition.properties ?? {})) {
      columns.add(`${table}.${column}`)
      const format = property.format ?? ""
      if (Array.isArray(property.enum) && format.startsWith("public.")) {
        const type = format.slice("public.".length)
        types.add(type)
        for (const value of property.enum) enumValues.add(`${type}.${value}`)
      }
    }
  }

  return { tables, columns, types, enumValues }
}

/** The probes REST can answer; the rest are reported, not guessed. */
export function restVerdicts(migrations, schema) {
  const unseen = new Set()
  const results = migrations.map((migration) => {
    if (migration.indexes.length) unseen.add("indexes")
    if (migration.rlsEnabled.length) unseen.add("RLS")
    if (migration.nullable.length) unseen.add("nullability")
    if (migration.policiesDropped.length) unseen.add("policies")

    const visible = {
      ...migration,
      indexes: [],
      rlsEnabled: [],
      nullable: [],
      policiesDropped: [],
    }
    return {
      file: migration.file,
      ...verdictFor(visible, {
        ...schema,
        indexes: new Set(),
        rlsEnabled: new Set(),
        nullable: new Set(),
        policies: new Set(),
      }),
    }
  })
  return { results, unseen: [...unseen] }
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function loadEnv() {
  const env = { ...process.env }
  const file = join(ROOT, ".env.local")
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match && env[match[1]] === undefined) {
        env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "")
      }
    }
  }
  return env
}

function client(env) {
  const base = `${env.SUPABASE_URL}/rest/v1`
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  }

  async function request(method, path, { body, prefer } = {}) {
    const response = await fetch(`${base}/${path}`, {
      method,
      headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`${method} ${path.split("?")[0]} → ${response.status}: ${text.slice(0, 300)}`)
    }
    return response
  }

  return {
    request,
    async openapi() {
      return (await request("GET", "")).json()
    },
    async count(table, filter = "") {
      const response = await request("GET", `${table}?select=id${filter ? `&${filter}` : ""}`, {
        prefer: "count=exact",
      })
      return Number((response.headers.get("content-range") ?? "*/0").split("/")[1])
    },
    async insert(table, rows) {
      for (let i = 0; i < rows.length; i += 500) {
        await request("POST", `${table}?on_conflict=id`, {
          body: rows.slice(i, i + 500),
          prefer: "resolution=ignore-duplicates,return=minimal",
        })
      }
    },
    async selectAll(table, filter, columns = "*") {
      // PostgREST caps a response at 1000 rows; page with the Range header and
      // stop on a short page — the same rule as lib/supabase/paginate.ts.
      const rows = []
      for (let from = 0; ; from += 1000) {
        const response = await fetch(`${base}/${table}?select=${columns}&${filter}&order=id`, {
          headers: { ...headers, Range: `${from}-${from + 999}` },
        })
        if (!response.ok) {
          throw new Error(`GET ${table} → ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }
        const page = await response.json()
        rows.push(...page)
        if (page.length < 1000) return rows
      }
    },
  }
}

async function migrationGate(env, db) {
  if (env.MIGRATION_DB_URL) {
    const run = spawnSync(process.execPath, [join(ROOT, "scripts/migration-status.mjs")], {
      env: { ...process.env, MIGRATION_DB_URL: env.MIGRATION_DB_URL },
      encoding: "utf8",
    })
    process.stdout.write(run.stdout.split("\n").slice(-4).join("\n") + "\n")
    if (run.status !== 0) {
      throw new Error("migration-status.mjs reports missing migrations. Apply them before seeding.")
    }
    return "full check (migration-status.mjs over Postgres)"
  }

  const { results, unseen } = restVerdicts(readMigrations(), schemaFromOpenApi(await db.openapi()))
  const missing = results.filter((result) => result.status === "missing" || result.status === "partial")
  if (missing.length > 0) {
    throw new Error(
      "Migrations missing on this database — seeding would fail with errors that name nothing:\n" +
        missing.map((result) => `  ${result.file}: no ${result.missing.join(", no ")}`).join("\n")
    )
  }
  return `REST check: ${results.length} migrations, none missing among tables, columns and enums` +
    (unseen.length ? ` (not visible over REST: ${unseen.join(", ")})` : "")
}

async function ownerIdsFor(db, emails) {
  const ids = []
  for (const email of emails) {
    const response = await db.request("GET", `profiles?select=id&email=eq.${encodeURIComponent(email)}`)
    const rows = await response.json()
    if (rows.length !== 1) throw new Error(`No single profile for --owner ${email} (found ${rows.length}).`)
    ids.push(rows[0].id)
  }
  return ids
}

async function markedPlaylistIds(db) {
  const rows = await db.selectAll("playlists", `description=like.${encodeURIComponent(MARKER.descriptionPrefix)}*`, "id")
  return rows.map((row) => row.id)
}

async function counts(db) {
  const tables = ["profiles", "playlists", "tracks", "analyses", "playlist_versions"]
  return Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await db.count(table)])))
}

const NUMERIC_FLAGS = ["seed", "users", "playlists", "tracks"]

/**
 * Strict on purpose. An earlier version read `--playlists ""` as 0 — `Number("")`
 * is 0, not NaN — and happily wrote a base with no playlists in it, which is the
 * kind of silent wrong answer this script exists to prevent elsewhere.
 */
export function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = { command, owners: [] }
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i]
    const value = rest[i + 1]
    if (!flag?.startsWith("--") || value === undefined || value === "" || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag ?? "an argument"}.`)
    }
    const name = flag.slice(2)
    if (name === "owner") {
      args.owners.push(value)
    } else if (NUMERIC_FLAGS.includes(name)) {
      if (!/^\d+$/.test(value)) throw new Error(`--${name} must be a whole number, got "${value}".`)
      args[name] = Number(value)
    } else {
      throw new Error(`Unknown flag ${flag}.`)
    }
  }
  return args
}

async function main() {
  const env = loadEnv()
  const args = parseArgs(process.argv.slice(2))
  assertDevTarget(env.SUPABASE_URL)
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.")
  const db = client(env)
  const target = env.SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0]

  if (args.command === "status") {
    console.log(JSON.stringify({ target, ...(await counts(db)), markedPlaylists: (await markedPlaylistIds(db)).length }, null, 2))
    return
  }

  if (args.command === "seed") {
    const seed = args.seed ?? 1
    console.log(`target: ${target}`)
    console.log(`migrations: ${await migrationGate(env, db)}`)
    const before = await counts(db)
    const owners = await ownerIdsFor(db, args.owners)
    const rows = generate({
      seed,
      users: args.users ?? 0,
      playlists: args.playlists ?? 5,
      tracks: args.tracks ?? 40,
      owners,
    })
    const started = Date.now()
    await db.insert("profiles", rows.profiles)
    await db.insert("playlists", rows.playlists)
    await db.insert("tracks", rows.tracks)
    const after = await counts(db)
    console.log(JSON.stringify({
      seed,
      wrote: { profiles: rows.profiles.length, playlists: rows.playlists.length, tracks: rows.tracks.length },
      seconds: Math.round((Date.now() - started) / 100) / 10,
      before,
      after,
      fingerprint: fingerprint([...rows.profiles, ...rows.playlists, ...rows.tracks]),
    }, null, 2))
    return
  }

  if (args.command === "fingerprint") {
    const seed = args.seed ?? 1
    const playlists = await db.selectAll(
      "playlists",
      `description=like.${encodeURIComponent(`${MARKER.descriptionPrefix}${seed}]`)}*`,
      "id,user_id,name,genre,context,import_source,description,created_at,updated_at"
    )
    const ids = playlists.map((row) => row.id)
    const tracks = []
    for (let i = 0; i < ids.length; i += 100) {
      tracks.push(...(await db.selectAll(
        "tracks",
        `playlist_id=in.(${ids.slice(i, i + 100).join(",")})`,
        "id,playlist_id,position,artist,name,bpm,musical_key,energy_score,duration_seconds,genre,created_at"
      )))
    }
    const profiles = await db.selectAll(
      "profiles",
      `workos_user_id=like.${encodeURIComponent(`${MARKER.workosPrefix}${seed}_`)}*`,
      "id,workos_user_id,email,plan,plan_status,preferred_locale,created_at,updated_at"
    )
    console.log(JSON.stringify({
      seed, profiles: profiles.length, playlists: playlists.length, tracks: tracks.length,
      fingerprint: fingerprint([...profiles, ...playlists, ...tracks]),
    }, null, 2))
    return
  }

  if (args.command === "clean") {
    const before = await counts(db)
    const ids = await markedPlaylistIds(db)
    // Children first. Analyses and versions a measurement may have created on
    // these playlists go too: they are as generated as the tracks are.
    for (let i = 0; i < ids.length; i += 100) {
      const list = `in.(${ids.slice(i, i + 100).join(",")})`
      for (const table of ["tracks", "playlist_versions", "analyses", "set_collaborators"]) {
        await db.request("DELETE", `${table}?playlist_id=${list}`).catch((error) => {
          if (!/42703|column .* does not exist/.test(error.message)) throw error
        })
      }
      await db.request("DELETE", `playlists?id=${list}`)
    }
    await db.request("DELETE", `profiles?workos_user_id=like.${encodeURIComponent(MARKER.workosPrefix)}*`)
    const after = await counts(db)
    console.log(JSON.stringify({ target, removedPlaylists: ids.length, before, after }, null, 2))
    return
  }

  console.error("Usage: node scripts/seed-scale.mjs <seed|fingerprint|clean|status> [--seed N --users N --playlists N --tracks N --owner email]")
  process.exit(2)
}

if (process.argv[1] && process.argv[1].endsWith("seed-scale.mjs")) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
