/**
 * Pure helpers for persisting a manual track reorder.
 *
 * The service layer applies these in two phases (move everything to temporary
 * positions, then to their final 1..n) so the `unique(playlist_id, position)`
 * constraint never trips mid-update. Keeping the validation + final-position
 * math pure makes it unit-testable without a database.
 */

/**
 * True when `orderedIds` is a permutation of `currentIds` — same length, same
 * set, no duplicates. Guards against a stale/tampered client order touching the
 * wrong rows.
 */
export function isValidReorder(
  currentIds: string[],
  orderedIds: string[]
): boolean {
  if (currentIds.length !== orderedIds.length) {
    return false
  }
  const current = new Set(currentIds)
  const ordered = new Set(orderedIds)
  if (ordered.size !== orderedIds.length) {
    return false // duplicate ids in the requested order
  }
  if (current.size !== ordered.size) {
    return false
  }
  for (const id of orderedIds) {
    if (!current.has(id)) {
      return false
    }
  }
  return true
}

/** Final contiguous 1..n positions for the requested order. */
export function finalPositions(
  orderedIds: string[]
): { id: string; position: number }[] {
  return orderedIds.map((id, index) => ({ id, position: index + 1 }))
}
