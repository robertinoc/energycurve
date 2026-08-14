import { CURRENT_ANALYSIS_ALGORITHM_VERSION } from "@/lib/product/strategy"

/**
 * Stable content hash for an analysis input. Two analyses with the same
 * curve, genre, context, and engine version are the same analysis — the
 * history table dedupes on this so page reloads don't inflate the "playlists
 * analyzed" KPI. The algorithm version is part of the hash so re-analyzing a
 * set after an engine upgrade records a fresh snapshot instead of deduping
 * against a stale score. FNV-1a over the canonical JSON; collisions are
 * acceptable (worst case: a skipped or extra history row, never data loss).
 */
export function computeAnalysisInputHash(input: {
  curve: number[]
  genre: string
  context: string
  /**
   * Declared target shape. Part of the hash because it changes the score: a DJ
   * who switches from the derived target to `after_hours` and re-analyzes must
   * get a fresh history row, not a dedupe against the old score.
   *
   * The wall-clock slot is deliberately NOT here. It carries zero penalty by
   * design, so including it would mint history rows with identical scores —
   * exactly the noise this dedupe exists to prevent.
   */
  targetShape?: string | null
  algorithmVersion?: number
}): string {
  const canonical = JSON.stringify([
    input.curve,
    input.genre,
    input.context,
    input.targetShape ?? null,
    input.algorithmVersion ?? CURRENT_ANALYSIS_ALGORITHM_VERSION,
  ])
  let hash = 0x811c9dc5

  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}
