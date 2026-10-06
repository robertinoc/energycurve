import "server-only"

import { createHash } from "node:crypto"

import type { SiteLocale } from "@/lib/content/site-copy"
import { suggestReorder, type ReorderSuggestion } from "@/lib/engine/recommendations"
import {
  CURRENT_ANALYSIS_ALGORITHM_VERSION,
  type CurveShape,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/**
 * `suggestReorder`, remembered — the half of H-23 that needs no decision.
 *
 * Under ten concurrent users the suggested order was 89.4% of the busy CPU
 * (docs/qa/carga-2026-10.md): the analysis page computed it on every render,
 * about 2.6 s of CPU for an 80-track set, for an answer that only changes
 * when the set does. Taking it off the render is the change that moves the
 * peak, and it is a product decision; this is the small one that is not. It
 * does not touch the optimizer or the score: same inputs, same function, the
 * answer kept.
 *
 * **Correct before fast.** A stale suggestion served over an edited set is
 * worse than a slow one, so the key is every input that can change the result
 * and nothing is invalidated by hand:
 *
 * - each track's resolved energy, **every field**, serialised with sorted keys
 *   — not a hand-picked list, so a field added to `ResolvedTrackEnergy` later
 *   is in the key without anyone remembering to add it;
 * - genre, context, the set's own score, the declared shape, and the locale
 *   (the rationale is written in it);
 * - the engine version, so a deploy that changes scoring cannot be answered
 *   from before it. A deploy also restarts the process, which empties this.
 *
 * Editing a set changes the energies or their order, which changes the key:
 * the old answer is never looked up again and ages out of the LRU.
 *
 * In memory, per process. On Vercel each instance has its own, and how often an
 * instance is reused is not measured — this is the cheap layer, not the fix.
 */

/** Entries kept per process. A suggestion for 80 tracks is a few kilobytes. */
export const SUGGESTION_CACHE_LIMIT = 256

const cache = new Map<string, ReorderSuggestion | null>()

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, stable((value as Record<string, unknown>)[key])])
    )
  }
  return value
}

export function suggestionCacheKey(input: {
  energies: ResolvedTrackEnergy[]
  genre: SupportedGenre
  context: PlaylistContext
  originalScore: number
  locale: SiteLocale
  targetShape: CurveShape | null
}): string {
  const canonical = JSON.stringify(
    stable({
      engine: CURRENT_ANALYSIS_ALGORITHM_VERSION,
      energies: input.energies,
      genre: input.genre,
      context: input.context,
      originalScore: input.originalScore,
      locale: input.locale,
      targetShape: input.targetShape,
    })
  )

  return createHash("sha256").update(canonical).digest("hex")
}

/**
 * Same signature and same answer as `suggestReorder`. Every call gets its own
 * copy, so nothing a caller does to the result reaches the next request.
 */
export function suggestReorderRemembered(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext,
  originalScore: number,
  locale: SiteLocale,
  targetShape: CurveShape | null = null
): ReorderSuggestion | null {
  const key = suggestionCacheKey({
    energies,
    genre,
    context,
    originalScore,
    locale,
    targetShape,
  })

  if (cache.has(key)) {
    const kept = cache.get(key) ?? null
    // Least-recently-used: a hit moves the entry to the end of the Map.
    cache.delete(key)
    cache.set(key, kept)
    return structuredClone(kept)
  }

  const fresh = suggestReorder(
    energies,
    genre,
    context,
    originalScore,
    locale,
    targetShape
  )
  cache.set(key, fresh)

  while (cache.size > SUGGESTION_CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }

  return structuredClone(fresh)
}

/** For tests only. */
export function clearSuggestionCache(): void {
  cache.clear()
}

/** For tests and the scale harness. */
export function suggestionCacheSize(): number {
  return cache.size
}
