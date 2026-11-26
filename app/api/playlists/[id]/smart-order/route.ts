import { createHash } from "node:crypto"

import Anthropic from "@anthropic-ai/sdk"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { aiOrderingUpgrade } from "@/lib/product/sales-walls"
import { CONTEXT_DISPLAY_NAMES } from "@/lib/content/analysis-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { optimizeOrder, REORDER_MAX_TRACKS } from "@/lib/engine/reorder"
import { classifyFailure } from "@/lib/smart-order/classify-failure"
import {
  runSmartOrder,
  type ClaudeCallOutcome,
  type SmartOrderResult,
} from "@/lib/smart-order/run"
import { logError, logInfo } from "@/lib/observability/logger"
import { isSuspended, SUSPENDED_RESPONSE } from "@/lib/auth/suspension"
import { consumeRateLimit } from "@/services/rate-limit-service"
import {
  GENRE_LABELS,
  parseCurveShape,
  type CurveShape,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { quotaFor } from "@/lib/product/capabilities"
import {
  countPlacedIds,
  encodeSmartOrderEvent,
  type SmartOrderEvent,
} from "@/lib/smart-order/stream"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { getProfileBilling } from "@/services/billing-service"
import { consumeQuota, readQuota } from "@/services/usage-service"
import { recordSmartOrderRun } from "@/services/smart-order-run-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import type { ResolvedTrackEnergy } from "@/types/analysis"

export const dynamic = "force-dynamic"

/**
 * Without this the platform decides; with it the platform still has the last
 * word, so our own deadline below must fire first.
 *
 * 300 is the ceiling AND the default on this project's actual plan (Hobby with
 * Fluid compute — read from the Vercel project API and the duration docs on
 * 26/11/2026, not assumed). The previous value, 60, came with a comment
 * claiming 60s was "the ceiling on every Vercel plan": it isn't, and that
 * belief is what made the kill look unavoidable. The generation has no bound
 * of its own while it streams (see SMART_ORDER_DEADLINE_MS), so the platform
 * killed the function at 60s, the NDJSON stream ended without a terminal
 * event, and the DJ paid for an attempt that delivered nothing — not even the
 * heuristic this route exists to fall back to.
 */
export const maxDuration = 300

/**
 * Zone 4 of the analysis redesign: smart ordering. Calls the Claude API from
 * the server (the key never reaches the client), asks for a strict-JSON
 * reorder of the playlist, validates it against the exact track-id set, and
 * falls back to a local heuristic (ascending energy + two deliberate
 * breathers) when the API is unavailable, slow, or answers invalidly.
 */

// SmartOrderResult and the two guarantees around producing one (a terminal
// event always goes out; the Claude call has a real wall-clock bound) live in
// lib/smart-order/run.ts, where they are testable without HTTP or the SDK.

/**
 * Bounds the time to response HEADERS only. The SDK's `timeout` option arms a
 * timer around the fetch and clears it in the fetch's own `finally` — and
 * `fetch()` resolves when headers arrive, not when the body ends (verified in
 * `fetchWithTimeout`, `@anthropic-ai/sdk/client.mjs`, v0.115.0). On a
 * streaming call that is a couple of seconds in, so this constant never fired
 * mid-generation and was not the budget it read as. It stays because a
 * connection that can't even produce headers in 40s deserves to fail fast.
 */
const CLAUDE_TIMEOUT_MS = 40_000

/**
 * The real budget: wall clock over the WHOLE Claude call, stream included.
 *
 * When it expires, the upstream request is aborted (every extra second of an
 * abandoned stream is billed — an aborted attempt costs the input tokens plus
 * whatever output was generated up to the cut), the DJ gets the heuristic
 * order with `reason: "timeout"`, and the stream still ends with `done`.
 *
 * The value comes from measurement (26/11/2026, claude-opus-5, low effort,
 * short track aliases): 80 tracks — the REORDER_MAX_TRACKS ceiling — answered
 * well under this, see the PR table. Margin to the 300s platform kill:
 * deadline + heuristic for 80 tracks (~2s measured) + quota/record writes
 * still leaves minutes to spare.
 */
const SMART_ORDER_DEADLINE_MS = 120_000

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
/**
 * Last resort for sets too long to search: ascending energy with two breathers.
 *
 * Reads no keys, which is exactly why it is the last resort and not the
 * fallback. Kept for sets past `REORDER_MAX_TRACKS`, where the alternative is
 * no order at all.
 */
function ascendingEnergyOrder(
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

/**
 * The order used when the model doesn't answer.
 *
 * This used to be a pure energy sort that read no keys at all — which meant the
 * product had two reorder paths, one that weighs harmony and one that ignores
 * it, and the one that ignores it was the one that ran whenever the other
 * failed. An alpha user asked whether the reordering respects harmonic
 * compatibility; the honest answer was "yes, except in the order you are
 * actually looking at".
 *
 * `optimizeOrder` is the same engine behind the analysis suggestions: energy
 * curve plus a weighted harmonic ratio, and it already degrades to energy-only
 * when too few tracks have a readable key. Reusing it costs nothing and closes
 * the gap.
 */
function heuristicOrder(
  tracks: { id: string; energy: number; position: number }[],
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null
): SmartOrderResult {
  if (energies.length > REORDER_MAX_TRACKS) {
    return ascendingEnergyOrder(tracks)
  }

  const optimized = optimizeOrder(energies, genre, context, shape)

  return {
    order: optimized.order.map((index) => tracks[index].id),
    rationale: "",
    breathers: [],
    source: "fallback",
  }
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
   * Aborting this signal drops the upstream connection mid-stream — it is how
   * the deadline in `runSmartOrder` stops a generation that won't finish in
   * time from billing until it finishes on its own.
   */
  signal: AbortSignal,
  /**
   * Called as the model commits each track id. Advisory only — the answer is
   * still validated in full below, so a run that reports 40/40 can still be
   * discarded and fall back to the heuristic.
   */
  onPlaced?: (placed: number) => void
): Promise<ClaudeCallOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, reason: "not_configured" }
  }

  /**
   * The model never sees the database uuids: each track is named by its
   * 1-based position as a string ("1".."80"). A uuid is ~27 tokens and the
   * model has to think about and then re-emit every one of them; at 80 tracks
   * that alone was ~3,000 output tokens before a word of rationale. Short
   * aliases cut the measured 80-track answer from ~98s to well inside the
   * deadline (see the PR table) and make the order cheaper to produce —
   * the answer is mapped back to real ids right below, and validation runs on
   * the real ids, so nothing downstream changes.
   */
  const idOfAlias = new Map(tracks.map((track, index) => [String(index + 1), track.id]))

  /**
   * No retry. The SDK retries timeouts, so one retry doubles the wall clock
   * this route has already budgeted with SMART_ORDER_DEADLINE_MS. We already
   * have a fallback; a second attempt inside the same request is strictly
   * worse than using it.
   */
  const client = new Anthropic({ maxRetries: 0 })

  const stream = client.messages.stream(
    {
      model: process.env.SMART_ORDER_MODEL || "claude-opus-5",
      /**
       * Reasoning tokens are output tokens, so they draw from this budget too.
       * A ceiling that isn't reached costs nothing, and a truncated answer is
       * not a JSON document — so the ceiling stays generous and the cost bound
       * is the deadline, which cuts a runaway by wall clock rather than by
       * leaving it a malformed answer to pay for.
       */
      max_tokens: 64000,
      /**
       * `effort` matters here. On Claude Opus 5 thinking is ON by default and
       * the default effort is `high` (per the current effort docs) — this
       * route was written against the previous generation, where omitting
       * `thinking` meant no thinking at all.
       *
       * `medium` was the first step down, and production showed it was not
       * enough: on 26/11/2026, the day the account had credit again, three
       * 21-track orderings ran past the then-60s ceiling without placing a
       * single track. `low` is a measured choice, not a guess: with short
       * aliases it ordered 80 tracks — REORDER_MAX_TRACKS — validly and
       * comfortably inside the deadline, where `medium` with uuids took ~98s
       * for the same set (26/11 measurements, table in the PR). At low effort
       * the model still thinks on hard inputs, just less; the order is
       * validated either way, and an invalid answer falls back to the
       * heuristic.
       */
      output_config: {
        effort: "low",
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
            tracks: tracks.map(({ title, artist, bpm, key, energy }, index) => ({
              id: String(index + 1),
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
    { timeout: CLAUDE_TIMEOUT_MS, signal }
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

  // The `timeout` above only covers the wait for headers, which for a stream
  // is the first second. The whole-call budget lives in runSmartOrder's race
  // (SMART_ORDER_DEADLINE_MS): when it expires, the `signal` above aborts this
  // stream and this await rejects with APIUserAbortError.
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

  // The model answered in aliases; translate back to real ids before
  // validating. An unknown alias maps to nothing and a duplicated alias maps
  // to a duplicated id — both fail the same permutation check as before.
  const order = Array.isArray(parsed.order)
    ? parsed.order.map((alias) =>
        typeof alias === "string" ? idOfAlias.get(alias) : undefined
      )
    : null

  const ids = new Set(tracks.map((track) => track.id))

  // Discard the whole answer if any id is missing, duplicated, or unknown.
  if (!isValidOrder(order, ids)) {
    return { ok: false, reason: "invalid_answer" }
  }

  const breathers = Array.isArray(parsed.breathers)
    ? parsed.breathers
        .map((alias) =>
          typeof alias === "string" ? idOfAlias.get(alias) : undefined
        )
        .filter((id): id is string => typeof id === "string" && ids.has(id))
    : []

  return {
    ok: true,
    value: {
      order,
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

  // Suspension is checked here and not only at the dashboard shell: this is the
  // one route that costs real money per call, and a page gate does not stop a
  // live session from calling an API. `profile` already carries the flag.
  if (isSuspended(profile)) {
    return NextResponse.json(SUSPENDED_RESPONSE.body, {
      status: SUSPENDED_RESPONSE.status,
    })
  }

  const playlist = await getOwnedPlaylistWithTracks(profile.id, id)

  if (!playlist) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  if (!playlist.genre || !playlist.context || playlist.tracks.length < 2) {
    return NextResponse.json({ error: "not_analyzable" }, { status: 422 })

  }

  const rate = await consumeRateLimit({
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

  // Narrowed once here: the 422 above already proved both are set, but the
  // closure below is past TypeScript's reach.
  const genre: SupportedGenre = playlist.genre
  const context: PlaylistContext = playlist.context
  const shape: CurveShape | null = parseCurveShape(playlist.target_shape)

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

    // What unlocks more, so the client can name the right plan rather than
    // hardcoding one that may move. This said "pro_plus" to everyone, FREE
    // included, whose next step is PRO.
    const upgradeTo = aiOrderingUpgrade(billing.plan, billing.status)

    // The page normally shows the wall before the click (the button is off once
    // the month is spent); this is the race — another tab, a stale page — and
    // the workbench answers it with the same wall, so it counts as shown here.
    if (upgradeTo) {
      captureServerEvent(profile.id, "sales_wall_shown", {
        wall: "ai_ordering_limit",
        plan: billing.plan,
        used: quota.used,
        limit: quota.limit,
      })
    }

    return NextResponse.json(
      {
        error: "quota_exceeded",
        capability: "ai_ordering",
        used: quota.used,
        limit: quota.limit,
        upgradeTo,
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
      let closed = false
      const send = (event: SmartOrderEvent) => {
        // A progress callback can race the terminal event by a tick; writing
        // into a closed controller would turn a finished order into a crash.
        if (!closed) {
          controller.enqueue(encoder.encode(encodeSmartOrderEvent(event)))
        }
      }

      await runSmartOrder(
        {
          total,
          deadlineMs: SMART_ORDER_DEADLINE_MS,
          callClaude: (signal, onPlaced) =>
            claudeOrder(
              tracks,
              genreName,
              contextName,
              analysis.targetCurve,
              signal,
              onPlaced
            ),
          heuristic: () => heuristicOrder(tracks, energies, genre, context, shape),
          classify: classifyFailure,
          afterResult: async (result) => {
            // Charged on the Claude path only. A fallback to the local
            // heuristic still returns a usable order, but it cost nothing and
            // shouldn't spend an allowance the user would rather keep for a
            // real one.
            if (result.source === "claude") {
              await consumeQuota(profile.id, "ai_ordering", aiLimit)
            }

            // The record the backstage reads to say whether smart ordering
            // works. The log line below says the same thing, but nobody reads
            // logs, and the quota above can't stand in for it: it is charged
            // only on the Claude path, so a fallback leaves no trace there.
            // Never throws.
            await recordSmartOrderRun({
              source: result.source,
              reason: result.reason ?? null,
            })

            logInfo("smart_order.completed", {
              profileId: profile.id,
              playlistId: playlist.id,
              source: result.source,
              // The field that makes a fallback report actionable:
              // "not_configured" is a deploy problem, "timeout" is a budget
              // problem, and they were indistinguishable from the outside
              // until now.
              reason: result.reason ?? null,
              trackCount: total,
              quotaCharged: result.source === "claude",
            })

            // Only an answer the model actually produced is worth keeping: the
            // cache exists so the same tracklist isn't paid for twice. Caching
            // a fallback made "try again in a minute" a lie — the retry hit
            // the cached heuristic and Claude was never asked again for that
            // tracklist as long as the process lived.
            if (result.source === "claude") {
              if (cache.size >= CACHE_MAX_ENTRIES) {
                const oldest = cache.keys().next().value
                if (oldest) {
                  cache.delete(oldest)
                }
              }
              cache.set(key, result)
            }
          },
          // An expired budget is the deadline doing its job, not a fault — at
          // info so a genuinely broken key or a schema change stays visible in
          // the error stream instead of drowning in timeouts.
          onTimeout: (deadlineMs) => {
            logInfo("smart_order.claude_timed_out", {
              profileId: profile.id,
              playlistId: playlist.id,
              budgetMs: deadlineMs,
            })
          },
          onFailure: (error, reason) => {
            if (reason === "timeout") {
              // The SDK's own header timeout, as opposed to our stream
              // deadline (that one reports through onTimeout).
              logInfo("smart_order.claude_timed_out", {
                profileId: profile.id,
                playlistId: playlist.id,
                budgetMs: CLAUDE_TIMEOUT_MS,
              })
            } else if (reason === "unfunded") {
              // Its own event name, not a `reason` field on the shared one.
              // The banner deliberately tells the DJ nothing about this, so
              // the log is the *only* place it surfaces — and it has to be
              // greppable and alertable on its own, because unlike everything
              // else in this chain it will not stop until somebody pays an
              // invoice. Every smart order is silently running on the
              // heuristic for as long as it is true.
              logError("smart_order.claude_unfunded", error, {
                profileId: profile.id,
                playlistId: playlist.id,
                status: error instanceof Anthropic.APIError ? error.status : null,
                apiErrorType:
                  error instanceof Anthropic.APIError ? error.type : null,
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
          },
          onUnexpected: (error) => {
            logError("smart_order.stream_unexpected", error, {
              profileId: profile.id,
              playlistId: playlist.id,
            })
          },
        },
        send
      )

      closed = true
      controller.close()
    },
  })

  return new Response(body, { headers: NDJSON_HEADERS })
}
