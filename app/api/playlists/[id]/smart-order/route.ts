import { createHash } from "node:crypto"

import Anthropic from "@anthropic-ai/sdk"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { CONTEXT_DISPLAY_NAMES } from "@/lib/content/analysis-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { logError, logInfo } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { GENRE_LABELS } from "@/lib/product/strategy"
import { quotaFor } from "@/lib/product/capabilities"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { getProfileBilling } from "@/services/billing-service"
import { consumeQuota, readQuota } from "@/services/usage-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * Zone 4 of the analysis redesign: smart ordering. Calls the Claude API from
 * the server (the key never reaches the client), asks for a strict-JSON
 * reorder of the playlist, validates it against the exact track-id set, and
 * falls back to a local heuristic (ascending energy + two deliberate
 * breathers) when the API is unavailable, slow, or answers invalidly.
 */

interface SmartOrderResult {
  order: string[]
  rationale: string
  breathers: string[]
  source: "claude" | "fallback"
}

// Per-playlist cache: the same tracklist (+ genre/context) always returns the
// same answer, so repeated clicks don't burn tokens. In-memory — resets on
// deploy, which is fine for a cost cap.
const cache = new Map<string, SmartOrderResult>()
const CACHE_MAX_ENTRIES = 200

function cacheKey(
  playlistId: string,
  tracks: { id: string; bpm: number | null; key: string | null; energy: number }[],
  genre: string,
  context: string
): string {
  const hash = createHash("sha1")
    .update(JSON.stringify({ tracks, genre, context }))
    .digest("hex")
  return `${playlistId}:${hash}`
}

/** Local heuristic: ascending energy with two deliberate breathers (the two
 * lowest-energy tracks) re-inserted at ~35% and ~72% of the set. */
function heuristicOrder(
  tracks: { id: string; energy: number; position: number }[]
): SmartOrderResult {
  const ascending = [...tracks].sort(
    (a, b) => a.energy - b.energy || a.position - b.position
  )

  const order = ascending.map((track) => track.id)
  const breathers: string[] = []

  if (order.length >= 6) {
    // The two lowest-energy tracks become the breathers: pulled from the
    // front of the ascending ramp and dropped at 35% / 72% of the set.
    const [first, second] = order.splice(0, 2)
    const at35 = Math.round(0.35 * (tracks.length - 1))
    const at72 = Math.round(0.72 * (tracks.length - 1))
    order.splice(Math.min(at35, order.length), 0, first)
    order.splice(Math.min(at72, order.length), 0, second)
    breathers.push(first, second)
  }

  return { order, rationale: "", breathers, source: "fallback" }
}

/** Strict permutation check: same ids, nothing missing, nothing extra. */
function isValidOrder(order: unknown, ids: ReadonlySet<string>): order is string[] {
  return (
    Array.isArray(order) &&
    order.length === ids.size &&
    order.every((id): id is string => typeof id === "string" && ids.has(id)) &&
    new Set(order).size === order.length
  )
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    order: {
      type: "array",
      items: { type: "string" },
      description: "Every track id exactly once, in the new play order.",
    },
    rationale: {
      type: "string",
      description: "One short paragraph explaining the order, in English.",
    },
    breathers: {
      type: "array",
      items: { type: "string" },
      description: "Track ids used as deliberate breathers (1-2).",
    },
  },
  required: ["order", "rationale", "breathers"],
  additionalProperties: false,
} as const

async function claudeOrder(
  tracks: {
    id: string
    title: string
    artist: string
    bpm: number | null
    key: string | null
    energy: number
  }[],
  genre: string,
  context: string,
  targetCurve: number[]
): Promise<Omit<SmartOrderResult, "source"> | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }

  const client = new Anthropic({ maxRetries: 1 })

  const response = await client.messages.create(
    {
      model: process.env.SMART_ORDER_MODEL || "claude-opus-5",
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      system:
        "You are an expert DJ set architect. You reorder tracklists to follow " +
        "an ideal energy curve while keeping transitions mixable. Rules: " +
        "1) follow the ideal curve for the given context as closely as possible; " +
        "2) maximize harmonically compatible consecutive transitions on the " +
        "Camelot wheel (same key, ±1 hour, or relative major/minor); " +
        "3) place 1-2 deliberate breathers (short energy dips) mid-set; " +
        "4) end on a strong, high-energy closer; " +
        "5) never place two tracks by the same artist back to back. " +
        "Return every track id exactly once.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            context,
            genre,
            ideal_curve: targetCurve,
            tracks: tracks.map(({ id, title, artist, bpm, key, energy }) => ({
              id,
              title,
              artist,
              bpm,
              key,
              energy,
            })),
          }),
        },
      ],
    },
    { timeout: 55_000 }
  )

  if (response.stop_reason === "refusal") {
    return null
  }

  const text = response.content.find((block) => block.type === "text")?.text

  if (!text) {
    return null
  }

  const parsed = JSON.parse(text) as {
    order?: unknown
    rationale?: unknown
    breathers?: unknown
  }

  const ids = new Set(tracks.map((track) => track.id))

  // Discard the whole answer if any id is missing, duplicated, or unknown.
  if (!isValidOrder(parsed.order, ids)) {
    return null
  }

  const breathers = Array.isArray(parsed.breathers)
    ? parsed.breathers.filter(
        (id): id is string => typeof id === "string" && ids.has(id)
      )
    : []

  return {
    order: parsed.order,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
    breathers,
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user } = await withAuth()

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const playlist = await getOwnedPlaylistWithTracks(profile.id, id)

  if (!playlist) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  if (!playlist.genre || !playlist.context || playlist.tracks.length < 2) {
    return NextResponse.json({ error: "not_analyzable" }, { status: 422 })
  }

  const rate = checkRateLimit({
    key: `smart-order:${profile.id}`,
    limit: 6,
    windowMs: 5 * 60_000,
  })

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
      }
    )
  }

  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )
  const tracks = playlist.tracks.map((track, index) => ({
    id: track.id,
    title: track.name,
    artist: track.artist,
    bpm: track.bpm,
    key: track.musical_key,
    energy: energies[index]?.score ?? 0,
    position: track.position,
  }))

  const key = cacheKey(
    playlist.id,
    tracks.map(({ id, bpm, key: musicalKey, energy }) => ({
      id,
      bpm,
      key: musicalKey,
      energy,
    })),
    playlist.genre,
    playlist.context
  )
  const cached = cache.get(key)

  if (cached) {
    // Deliberately before the quota gate: a cache hit makes no Claude call, so
    // charging for it would meter our infrastructure rather than our cost — and
    // would make someone's monthly allowance depend on when we last deployed,
    // since the cache is per-process and resets.
    return NextResponse.json(cached)
  }

  // The only quota that maps to real money per use. Read before calling Claude
  // so an over-limit user is refused instead of billed-for-and-refused.
  const billing = await getProfileBilling(profile.id)
  const aiLimit = quotaFor(billing.plan, billing.status, "ai_ordering")
  const quota = await readQuota(profile.id, "ai_ordering", aiLimit)

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        capability: "ai_ordering",
        used: quota.used,
        limit: quota.limit,
        // What unlocks more, so the client can name the right plan rather than
        // hardcoding one that may move.
        upgradeTo: "pro_plus",
      },
      { status: 402 }
    )
  }

  // Ideal curve from the same engine that scores the set.
  const analysis = analyzePlaylist({
    curve: tracks.map((track) => track.energy),
    genre: playlist.genre,
    context: playlist.context,
    trackMeta: energies.map((entry) => ({
      source: entry.source,
      bpm: entry.bpm,
    })),
  })

  const contextName =
    CONTEXT_DISPLAY_NAMES[playlist.context]?.en ?? playlist.context
  const genreName = GENRE_LABELS[playlist.genre] ?? playlist.genre

  let result: SmartOrderResult

  try {
    const claude = await claudeOrder(
      tracks,
      genreName,
      contextName,
      analysis.targetCurve
    )
    result = claude
      ? { ...claude, source: "claude" }
      : heuristicOrder(tracks)
  } catch (error) {
    logError("smart_order.claude_failed", error, {
      profileId: profile.id,
      playlistId: playlist.id,
    })
    result = heuristicOrder(tracks)
  }

  // Charged on the Claude path only. A fallback to the local heuristic still
  // returns a usable order, but it cost nothing and shouldn't spend an allowance
  // the user would rather keep for a real one.
  if (result.source === "claude") {
    await consumeQuota(profile.id, "ai_ordering", aiLimit)
  }

  logInfo("smart_order.completed", {
    profileId: profile.id,
    playlistId: playlist.id,
    source: result.source,
    trackCount: tracks.length,
    quotaCharged: result.source === "claude",
  })

  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) {
      cache.delete(oldest)
    }
  }
  cache.set(key, result)

  return NextResponse.json(result)
}
