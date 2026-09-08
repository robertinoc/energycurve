import { createHash } from "node:crypto"

import Anthropic from "@anthropic-ai/sdk"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { CONTEXT_DISPLAY_NAMES } from "@/lib/content/analysis-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { classifyFailure } from "@/lib/smart-order/classify-failure"
import type { SmartOrderFallbackReason } from "@/lib/smart-order/stream"
import { logError, logInfo } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { GENRE_LABELS } from "@/lib/product/strategy"
import { quotaFor } from "@/lib/product/capabilities"
import {
  countPlacedIds,
  encodeSmartOrderEvent,
  type SmartOrderEvent,
} from "@/lib/smart-order/stream"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { getProfileBilling } from "@/services/billing-service"
import { consumeQuota, readQuota } from "@/services/usage-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * Without this the platform decides, and its default (10-15s) is far below what
 * a reorder actually costs — so the function was being killed mid-flight and
 * every request fell back to the heuristic. 60s is the ceiling on every Vercel
 * plan including Hobby, so it needs no plan-specific tuning.
 */
export const maxDuration = 60

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
  /**
   * Why the heuristic was used, when it was.
   *
   * The banner used to say "Claude didn't answer in time" for *every* fallback
   * — a missing key, an invalid answer and a thrown error all rendered as a
   * timeout. That is the product asserting a cause it doesn't know, and it made
   * the one bug a user actually hit impossible to report accurately.
   */
  reason?: SmartOrderFallbackReason
}

/**
 * Deliberately below `maxDuration`, with room for what happens after the model
 * returns (quota write, cache, closing the stream). The platform killing the
 * function returns a 504 with no body, which the client can only report as
 * "unavailable"; aborting ourselves first means we still return the heuristic
 * order and can say why.
 *
 * 45s left no headroom at all: paired with the SDK's retry it could reach 90s
 * of wall clock against a 60s ceiling, so a single slow attempt guaranteed the
 * platform kill this constant exists to avoid. See `maxRetries` below.
 */
const CLAUDE_TIMEOUT_MS = 40_000

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

/** Headers that keep a chunked response from being buffered into one blob. */
const NDJSON_HEADERS = {
  "content-type": "application/x-ndjson; charset=utf-8",
  // Vercel's cache and any intermediary proxy will happily buffer a response of
  // unknown length, which would defeat the entire point of streaming this.
  "cache-control": "no-store, no-transform",
  "x-accel-buffering": "no",
} as const

/** A complete, already-known sequence of events. */
function ndjson(events: SmartOrderEvent[]): Response {
  return new Response(events.map(encodeSmartOrderEvent).join(""), {
    headers: NDJSON_HEADERS,
  })
}

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
  targetCurve: number[],
  /**
   * Called as the model commits each track id. Advisory only — the answer is
   * still validated in full below, so a run that reports 40/40 can still be
   * discarded and fall back to the heuristic.
   */
  onPlaced?: (placed: number) => void
): Promise<
  | { ok: true; value: Omit<SmartOrderResult, "source" | "reason"> }
  | { ok: false; reason: SmartOrderFallbackReason }
> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, reason: "not_configured" }
  }

  /**
   * No retry. The SDK retries timeouts, so with a 40s per-request budget one
   * retry can spend 80s of wall clock against this function's 60s ceiling —
   * the platform then kills us mid-flight and the caller gets a bodiless 504
   * instead of the heuristic order we were holding all along. We already have a
   * fallback; a second attempt inside the same request is strictly worse than
   * using it.
   */
  const client = new Anthropic({ maxRetries: 0 })

  const stream = client.messages.stream(
    {
      model: process.env.SMART_ORDER_MODEL || "claude-opus-5",
      /**
       * Reasoning tokens are output tokens, so they draw from this budget too —
       * and on this model thinking is on by default. At 16000 a long think plus
       * a 26-id array plus the rationale could reach the cap, and a truncated
       * answer is not a JSON document: it hit `JSON.parse` and surfaced as a
       * generic error. There is no per-request cost to a ceiling that isn't
       * reached, and this call streams, so nothing here risks an HTTP timeout.
       */
      max_tokens: 64000,
      /**
       * `effort` matters here, and its absence was the other half of the
       * timeouts. On Claude Opus 5 thinking is ON by default and the default
       * effort is `high` — this route was written against the previous
       * generation, where omitting `thinking` meant no thinking at all. So a
       * 26-track reorder was silently running the deepest reasoning setting
       * available, for a task whose hard part is a constraint shuffle rather
       * than a chain of inference.
       *
       * `medium` keeps the judgement that matters (harmonic transitions, where
       * the breathers land) and gets the answer back inside the request budget.
       */
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: RESPONSE_SCHEMA },
      },
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
    { timeout: CLAUDE_TIMEOUT_MS }
  )

  if (onPlaced) {
    let accumulated = ""
    let lastPlaced = 0

    stream.on("text", (delta) => {
      accumulated += delta
      const placed = countPlacedIds(accumulated)

      // Monotonic by construction, but guard anyway: a bar that goes backwards
      // reads as a bug even when the underlying count is right.
      if (placed > lastPlaced) {
        lastPlaced = placed
        onPlaced(placed)
      }
    })
  }

  const response = await stream.finalMessage()

  if (response.stop_reason === "refusal") {
    return { ok: false, reason: "refusal" }
  }

  // A capped or context-exceeded answer is a partial JSON document. Named
  // rather than parsed: feeding it to JSON.parse throws, and a thrown parse
  // error reported as "something went wrong" is how this failure hid.
  if (
    response.stop_reason === "max_tokens" ||
    response.stop_reason === "model_context_window_exceeded"
  ) {
    logInfo("smart_order.answer_truncated", {
      stopReason: response.stop_reason,
      maxTokens: 64000,
      outputTokens: response.usage?.output_tokens ?? null,
    })

    return { ok: false, reason: "truncated" }
  }

  const text = response.content.find((block) => block.type === "text")?.text

  if (!text) {
    return { ok: false, reason: "invalid_answer" }
  }

  let parsed: {
    order?: unknown
    rationale?: unknown
    breathers?: unknown
  }

  try {
    parsed = JSON.parse(text)
  } catch {
    // Structured outputs make this close to impossible, which is exactly why it
    // must not be the branch that swallows every other failure.
    return { ok: false, reason: "invalid_answer" }
  }

  const ids = new Set(tracks.map((track) => track.id))

  // Discard the whole answer if any id is missing, duplicated, or unknown.
  if (!isValidOrder(parsed.order, ids)) {
    return { ok: false, reason: "invalid_answer" }
  }

  const breathers = Array.isArray(parsed.breathers)
    ? parsed.breathers.filter(
        (id): id is string => typeof id === "string" && ids.has(id)
      )
    : []

  return {
    ok: true,
    value: {
      order: parsed.order,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
      breathers,
    },
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
    //
    // Still answered as a stream so the client has exactly one response shape
    // to parse; it just arrives complete in a single event.
    return ndjson([
      { type: "done", order: cached.order, source: cached.source },
    ])
  }

  // The only quota that maps to real money per use. Read before calling Claude
  // so an over-limit user is refused instead of billed-for-and-refused.
  const billing = await getProfileBilling(profile.id)
  const aiLimit = quotaFor(billing.plan, billing.status, "ai_ordering")
  const quota = await readQuota(profile.id, "ai_ordering", aiLimit)

  if (!quota.allowed) {
    captureServerEvent(profile.id, "plan_limit_reached", {
      capability: "ai_ordering",
      plan: billing.plan,
      used: quota.used,
      limit: quota.limit,
    })

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

  // Everything that can fail with a meaningful status code — auth, ownership,
  // quota, the cache hit — has already answered above. Only now do we commit to
  // a 200 with a body that arrives over time, because once the first byte is
  // out the status code can no longer be changed.
  const encoder = new TextEncoder()
  const total = tracks.length

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SmartOrderEvent) => {
        controller.enqueue(encoder.encode(encodeSmartOrderEvent(event)))
      }

      send({ type: "start", total })

      let result: SmartOrderResult

      try {
        const claude = await claudeOrder(
          tracks,
          genreName,
          contextName,
          analysis.targetCurve,
          (placed) => send({ type: "progress", placed, total })
        )
        result = claude.ok
          ? { ...claude.value, source: "claude" }
          : { ...heuristicOrder(tracks), reason: claude.reason }
      } catch (error) {
        // An aborted request is the budget doing its job, not a fault — it is
        // logged at info so a genuinely broken key or a schema change stays
        // visible in the error stream instead of drowning in timeouts.
        const reason = classifyFailure(error)

        if (reason === "timeout") {
          logInfo("smart_order.claude_timed_out", {
            profileId: profile.id,
            playlistId: playlist.id,
            budgetMs: CLAUDE_TIMEOUT_MS,
          })
        } else {
          logError("smart_order.claude_failed", error, {
            profileId: profile.id,
            playlistId: playlist.id,
            reason,
            status: error instanceof Anthropic.APIError ? error.status : null,
            errorName: error instanceof Error ? error.name : null,
          })
        }

        result = { ...heuristicOrder(tracks), reason }
      }

      // Charged on the Claude path only. A fallback to the local heuristic still
      // returns a usable order, but it cost nothing and shouldn't spend an
      // allowance the user would rather keep for a real one.
      if (result.source === "claude") {
        await consumeQuota(profile.id, "ai_ordering", aiLimit)
      }

      logInfo("smart_order.completed", {
        profileId: profile.id,
        playlistId: playlist.id,
        source: result.source,
        // The field that makes a fallback report actionable: "not_configured"
        // is a deploy problem, "timeout" is a budget problem, and they were
        // indistinguishable from the outside until now.
        reason: result.reason ?? null,
        trackCount: total,
        quotaCharged: result.source === "claude",
      })

      if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest) {
          cache.delete(oldest)
        }
      }
      cache.set(key, result)

      send({
        type: "done",
        order: result.order,
        source: result.source,
        reason: result.reason,
      })
      controller.close()
    },
  })

  return new Response(body, { headers: NDJSON_HEADERS })
}
