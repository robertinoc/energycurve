/**
 * Pure rules for set version history.
 *
 * Kept out of the service so the decisions that matter — when a version is worth
 * recording, and which ones get thrown away — are testable without a database.
 */

export const VERSION_KINDS = ["imported", "curated", "ai", "played"] as const
export type VersionKind = (typeof VERSION_KINDS)[number]

export interface VersionTrack {
  trackId: string
  position: number
  artist: string
  name: string
  bpm: number | null
  /** The DJ's manual override, when they set one. Usually null. */
  energyScore: number | null
  /**
   * The energy the engine actually resolved for this track at capture time.
   *
   * Stored because `energyScore` alone can't rebuild the curve — it's null for
   * every track whose energy came from BPM, which is most of them. Without this a
   * comparison between two versions could only say "the score changed", never
   * *where* the shape went wrong. Null on versions captured before this field
   * existed, so any reader has to degrade rather than assume.
   */
  resolvedEnergy?: number | null
}

export interface PlaylistVersion {
  id: string
  kind: VersionKind
  tracks: VersionTrack[]
  setScore: number | null
  createdAt: string
}

/**
 * How many versions a playlist keeps.
 *
 * A cap exists because capture is automatic: a DJ who nudges one track twenty
 * times would otherwise accumulate twenty rows of noise, and the useful
 * comparison is always "now versus a few steps ago, or versus where I started".
 * The number is generous enough that nobody hits it in a single editing session.
 */
export const MAX_VERSIONS_PER_PLAYLIST = 20

export function isVersionKind(value: unknown): value is VersionKind {
  return (
    typeof value === "string" && (VERSION_KINDS as readonly string[]).includes(value)
  )
}

/**
 * Whether two orders are the same set in the same sequence.
 *
 * Compared by track id only. Editing a track's BPM doesn't make the *order* a
 * new version, and treating it as one would bury the orders that matter under
 * near-identical rows.
 */
export function sameOrder(
  a: readonly { trackId: string }[],
  b: readonly { trackId: string }[]
): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => entry.trackId === b[index].trackId)
  )
}

/**
 * Which versions to delete once a new one has been recorded.
 *
 * Two rules, and the second one is the important one: **the `imported` version is
 * never pruned.** It's the only row that can answer "was my original order
 * actually worse?", it can never be recreated once gone, and it is by definition
 * the oldest — so plain "keep the newest N" would delete exactly the version
 * worth keeping forever.
 *
 * Expects newest-first, the order the table is read in.
 */
export function versionsToPrune<T extends { id: string; kind: VersionKind }>(
  newestFirst: readonly T[],
  keep = MAX_VERSIONS_PER_PLAYLIST
): T[] {
  const prunable = newestFirst.filter((version) => version.kind !== "imported")
  const protectedCount = newestFirst.length - prunable.length

  // The imported row occupies one of the kept slots rather than sitting outside
  // the budget, so "keep 20" means 20 rows in total and not 21.
  const budget = Math.max(0, keep - protectedCount)

  return prunable.slice(budget)
}

/** Builds a snapshot from the playlist's current tracks, in their saved order. */
export function snapshotOf(
  tracks: readonly {
    id: string
    position: number
    artist: string
    name: string
    bpm: number | null
    energy_score: number | null
  }[],
  /** Resolved energy per track id, when the caller has already computed it. */
  resolved?: ReadonlyMap<string, number>
): VersionTrack[] {
  return [...tracks]
    .sort((a, b) => a.position - b.position)
    .map((track, index) => ({
      trackId: track.id,
      // Renumbered 1..n rather than copied. A snapshot's positions describe the
      // sequence, and carrying a gap from a mid-edit state would make two
      // identical orders look different.
      position: index + 1,
      artist: track.artist,
      name: track.name,
      bpm: track.bpm,
      energyScore: track.energy_score,
      resolvedEnergy: resolved?.get(track.id) ?? null,
    }))
}

/**
 * Parses a stored snapshot back into typed tracks, dropping anything malformed.
 *
 * The column is `jsonb`, so a row written by an older shape of this code — or by
 * hand — must degrade to a shorter version rather than crash the history page.
 */
export function parseSnapshot(value: unknown): VersionTrack[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return []
    }

    const record = entry as Record<string, unknown>

    if (
      typeof record.trackId !== "string" ||
      typeof record.position !== "number" ||
      typeof record.artist !== "string" ||
      typeof record.name !== "string"
    ) {
      return []
    }

    return [
      {
        trackId: record.trackId,
        position: record.position,
        artist: record.artist,
        name: record.name,
        bpm: typeof record.bpm === "number" ? record.bpm : null,
        energyScore:
          typeof record.energyScore === "number" ? record.energyScore : null,
        resolvedEnergy:
          typeof record.resolvedEnergy === "number" ? record.resolvedEnergy : null,
      },
    ]
  })
}

/**
 * Track ids a version can be restored to, filtered to the ones that still exist.
 *
 * Returns null when the set has gained a track the version says nothing about,
 * because placing only the tracks it does mention would drop the new one out of
 * the playlist entirely. A *deleted* track is fine: the version still orders
 * everything that remains.
 */
export function restorableOrder(
  version: readonly VersionTrack[],
  currentTrackIds: readonly string[]
): string[] | null {
  const current = new Set(currentTrackIds)
  const order = version
    .map((entry) => entry.trackId)
    .filter((trackId) => current.has(trackId))

  return order.length === currentTrackIds.length ? order : null
}
