import "server-only"

import {
  buildLookupQuery,
  chooseLookupMatch,
  parseLookupSong,
  type LookupResult,
  type RawLookupSong,
} from "@/lib/audio/title-lookup"
import { logError, logInfo } from "@/lib/observability/logger"
import { normalizeForMatch } from "@/lib/playlists/audio-match"

/**
 * The network side of title lookup, kept apart from the parsing so the decisions
 * are testable without mocking fetch.
 *
 * Optional, like every other integration here: with no key configured the feature
 * reports itself unavailable and nothing else changes. That keeps local dev and
 * preview deploys working without anyone holding a key.
 *
 * Runs server-side rather than from the browser for two reasons. The key would be
 * public in a client bundle, and their rate limit is per account — so a hundred
 * browsers sharing one key would exhaust it in bursts nobody could see, where one
 * server can pace itself.
 */

const API_BASE = "https://api.getsongbpm.com/search/"

/** Their documented ceiling. We stay well under it; see the delay below. */
export const REQUESTS_PER_HOUR = 3000

/**
 * Pause between calls in a batch.
 *
 * 3,000/hour is 1.2 per second, and a thirty-track playlist at 250 ms takes about
 * eight seconds — comfortably inside the limit while leaving room for other users
 * on the same key. Deliberately not parallel: a burst of thirty is exactly the
 * shape that trips a rate limiter, and nobody is waiting on this synchronously.
 */
const DELAY_MS = 250

export function isTitleLookupConfigured(): boolean {
  return Boolean(process.env.GETSONGBPM_API_KEY)
}

async function lookupOne(
  artist: string,
  title: string
): Promise<LookupResult | null> {
  const key = process.env.GETSONGBPM_API_KEY
  const query = buildLookupQuery(artist, title)

  if (!key || !query) {
    return null
  }

  const url = `${API_BASE}?api_key=${encodeURIComponent(key)}&type=both&lookup=${encodeURIComponent(query)}`

  try {
    const response = await fetch(url, {
      // Their terms ask for identification, and it's how they'd reach us if we
      // ever became a problem for them.
      headers: { "User-Agent": "EnergyCurve (energycurve.app)" },
      // A slow third party must not hold a request open: this is a convenience,
      // and the track keeps its missing data if the lookup is unavailable.
      signal: AbortSignal.timeout(6000),
    })

    if (!response.ok) {
      logError(
        "lookup.http_error",
        new Error(`getsongbpm ${response.status}`),
        {}
      )
      return null
    }

    const payload = (await response.json()) as { search?: unknown }

    // They return an object with an `error` field instead of an array when there
    // are no results, which is why this checks the shape rather than the status.
    if (!Array.isArray(payload.search)) {
      return null
    }

    const candidates = (payload.search as RawLookupSong[])
      .map(parseLookupSong)
      .filter((entry): entry is LookupResult => entry !== null)

    return chooseLookupMatch(artist, title, candidates, normalizeForMatch)
  } catch (error) {
    // Includes the timeout. Never thrown onward: a lookup that failed leaves the
    // track exactly as it was, which is a worse outcome than success and a much
    // better one than a failed request.
    logError("lookup.failed", error, {})
    return null
  }
}

export interface LookupRequest {
  trackId: string
  artist: string
  title: string
}

export interface LookupOutcome {
  trackId: string
  result: LookupResult | null
}

/**
 * Looks up a batch, sequentially and paced.
 *
 * Every entry comes back, matched or not, so the caller can show the DJ what was
 * found and what wasn't — a silent partial result reads as a bug when half the
 * tracks don't change.
 */
export async function lookupTracks(
  requests: readonly LookupRequest[]
): Promise<LookupOutcome[]> {
  if (!isTitleLookupConfigured()) {
    return requests.map((request) => ({ trackId: request.trackId, result: null }))
  }

  const outcomes: LookupOutcome[] = []

  for (const [index, request] of requests.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }

    outcomes.push({
      trackId: request.trackId,
      result: await lookupOne(request.artist, request.title),
    })
  }

  logInfo("lookup.batch", {
    asked: requests.length,
    found: outcomes.filter((outcome) => outcome.result !== null).length,
  })

  return outcomes
}
