/**
 * Comparing two orders of a set.
 *
 * The question is the one a DJ asks the morning after: "I planned this, I played
 * that — what actually changed?" Answering it with a number ("7.4 became 6.9")
 * is almost useless; the useful answer names the tracks that moved, the ones that
 * never got played, and where the curve came apart.
 *
 * Pure, so those judgements are testable without a database or a gig.
 */

import type { VersionTrack } from "@/lib/playlists/versions"

export interface MovedTrack {
  trackId: string
  artist: string
  name: string
  from: number
  to: number
  /** Positive when it ended up later in the set than planned. */
  delta: number
}

export interface DiffTrack {
  trackId: string
  artist: string
  name: string
  position: number
}

export interface VersionDiff {
  /** Same track, different position. Ordered by how far it moved. */
  moved: MovedTrack[]
  /** In the plan, absent from what happened — skipped. */
  removed: DiffTrack[]
  /** Played but never planned. */
  added: DiffTrack[]
  /** Tracks that stayed exactly where they were put. */
  unchangedCount: number
  /** True when nothing at all differs. */
  identical: boolean
  /**
   * Both curves, aligned by position, for an overlay. Null when either version
   * predates resolved-energy capture — an honest gap beats a fabricated line.
   */
  curves: { before: number[]; after: number[] } | null
}

function label(track: VersionTrack): DiffTrack {
  return {
    trackId: track.trackId,
    artist: track.artist,
    name: track.name,
    position: track.position,
  }
}

/**
 * Reads both curves only if both versions actually recorded resolved energies.
 *
 * A version captured before that field existed has nulls throughout. Filling
 * those with zeros would draw a cliff to the floor that never happened, which is
 * worse than drawing nothing.
 */
function curvesOf(
  before: readonly VersionTrack[],
  after: readonly VersionTrack[]
): { before: number[]; after: number[] } | null {
  const usable = (tracks: readonly VersionTrack[]) =>
    tracks.length > 0 &&
    tracks.every((track) => typeof track.resolvedEnergy === "number")

  if (!usable(before) || !usable(after)) {
    return null
  }

  return {
    before: before.map((track) => track.resolvedEnergy as number),
    after: after.map((track) => track.resolvedEnergy as number),
  }
}

/**
 * What changed between two orders of the same set.
 *
 * `before` is the plan, `after` is what happened. The asymmetry matters: a track
 * in `before` but not `after` was **skipped**, and one in `after` only was played
 * unplanned — calling both "different" would lose the distinction the DJ cares
 * about most.
 */
export function diffVersions(
  before: readonly VersionTrack[],
  after: readonly VersionTrack[]
): VersionDiff {
  const beforeById = new Map(before.map((track) => [track.trackId, track]))
  const afterById = new Map(after.map((track) => [track.trackId, track]))

  const moved: MovedTrack[] = []
  let unchangedCount = 0

  for (const track of after) {
    const original = beforeById.get(track.trackId)

    if (!original) {
      continue
    }

    if (original.position === track.position) {
      unchangedCount += 1
      continue
    }

    moved.push({
      trackId: track.trackId,
      artist: track.artist,
      name: track.name,
      from: original.position,
      to: track.position,
      delta: track.position - original.position,
    })
  }

  // Biggest movement first: a track that slid one slot is noise, one that jumped
  // eight is the story. Ties break on final position so the list is stable.
  moved.sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.to - b.to
  )

  const removed = before
    .filter((track) => !afterById.has(track.trackId))
    .map(label)
  const added = after
    .filter((track) => !beforeById.has(track.trackId))
    .map(label)

  return {
    moved,
    removed,
    added,
    unchangedCount,
    identical:
      moved.length === 0 && removed.length === 0 && added.length === 0,
    curves: curvesOf(before, after),
  }
}

/** Score change between two versions, or null when either was never scored. */
export function scoreDelta(
  before: number | null,
  after: number | null
): number | null {
  if (before === null || after === null) {
    return null
  }

  // One decimal, matching how scores are shown everywhere else. Without rounding
  // a 0.1 difference surfaces as 0.09999999999999964.
  return Math.round((after - before) * 10) / 10
}

/** Never zoom an overlay tighter than this many energy points. */
export const MIN_CURVE_SPAN = 3

/**
 * Vertical range for drawing two curves on one axis: their shared extremes,
 * padded out to a minimum span.
 *
 * Cropping instead of fixing the axis at 0–10 is what makes the difference
 * legible — two sets living between 5.5 and 9 would otherwise be squashed into a
 * third of the height. Both lines share this one transform, so the comparison
 * stays truthful.
 *
 * The minimum span is the part that stops it lying. Scaling to the data alone
 * would magnify two orders differing by 0.2 into a mountain range, which is how
 * auto-scaled charts routinely mislead; a floor of three energy points keeps a
 * near-identical pair looking near-identical.
 */
export function curveDomain(values: readonly number[]): {
  min: number
  max: number
} {
  if (values.length === 0) {
    return { min: 0, max: 10 }
  }

  const low = Math.min(...values)
  const high = Math.max(...values)
  const slack = (Math.max(high - low, MIN_CURVE_SPAN) - (high - low)) / 2

  return {
    min: Math.max(0, low - slack - 0.25),
    max: Math.min(10, high + slack + 0.25),
  }
}
