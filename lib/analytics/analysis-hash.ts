/**
 * Stable content hash for an analysis input. Two analyses with the same
 * curve, genre, and context are the same analysis — the history table
 * dedupes on this so page reloads don't inflate the "playlists analyzed"
 * KPI. FNV-1a over the canonical JSON; collisions are acceptable (worst
 * case: a skipped or extra history row, never data loss).
 */
export function computeAnalysisInputHash(input: {
  curve: number[]
  genre: string
  context: string
}): string {
  const canonical = JSON.stringify([input.curve, input.genre, input.context])
  let hash = 0x811c9dc5

  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}
