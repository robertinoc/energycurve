/**
 * Residency mode: don't play the same thing at the same club two dates running.
 *
 * The distinction that makes this its own feature, rather than a filter on the
 * global library: a resident does not mind repeating a track, they mind repeating it
 * *in front of the same room*. The library already answers "have I played this
 * before". This answers "have I played this **here**, recently" — which is a
 * different question with a different answer, and the only one that changes what
 * they do next.
 *
 * Pure and free of the database so the rule — which is the part that can quietly be
 * wrong about a date or an off-by-one in "sets ago" — is unit-testable.
 */

import { trackKey } from "./set-comparison"

/**
 * How many previous dates at the venue count as "recent".
 *
 * Three is a judgement, not a measurement, and it's a default rather than a law:
 * a monthly resident is being told roughly "nothing from the last quarter", a
 * weekly one "nothing from the last month". Both read as reasonable, which is the
 * most that can be claimed for a number nobody has data on yet. Overridable per
 * call so it can be raised once someone has an opinion from real use.
 */
export const RESIDENCY_LOOKBACK_SETS = 3

export interface ResidencyTrack {
  artist: string
  name: string
  /** Position in the set being planned, 1-based, for pointing at the right row. */
  position: number
}

/** One past date at the venue. */
export interface PlayedSet {
  playlistId: string
  playlistName: string
  /** ISO timestamp of when it was marked played. */
  playedAt: string
  tracks: readonly { artist: string; name: string }[]
}

export interface ResidencyRepeat {
  position: number
  artist: string
  name: string
  /**
   * 1 = the most recent date at this venue, 2 = the one before it.
   *
   * Reported instead of a raw date because it's the unit the DJ thinks in — "I
   * played that here last time" — and because it stays meaningful whether their
   * residency is weekly or quarterly.
   */
  setsAgo: number
  playedAt: string
  playlistName: string
}

/**
 * Normalises a venue label for comparison.
 *
 * "Club X", "club x" and "Club X " are one venue to the person typing them. Doing
 * this here rather than in SQL keeps the rule visible and testable, and means a
 * stored value is never silently rewritten — what the DJ typed is what they see.
 */
export function normalizeVenue(venue: string | null | undefined): string | null {
  if (!venue) {
    return null
  }

  const normalized = venue.trim().toLowerCase().replace(/\s+/g, " ")

  return normalized.length > 0 ? normalized : null
}

export function sameVenue(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const a = normalizeVenue(left)
  const b = normalizeVenue(right)

  // Two unknown venues are not the same venue. Treating null as a matchable value
  // would make every set with a blank field collide with every other one.
  return a !== null && b !== null && a === b
}

/**
 * Tracks in the planned set that were already played at this venue recently.
 *
 * `pastSets` must be newest first; the caller owns that ordering because it comes
 * from a query that can express it and this function can't verify a timestamp is
 * what it claims to be.
 *
 * Only the *most recent* appearance of a track is reported. A track played at the
 * last three dates is one problem, not three, and listing it three times would bury
 * the tracks played once each.
 */
export function residencyRepeats(
  tracks: readonly ResidencyTrack[],
  pastSets: readonly PlayedSet[],
  lookbackSets: number = RESIDENCY_LOOKBACK_SETS
): ResidencyRepeat[] {
  if (tracks.length === 0 || pastSets.length === 0 || lookbackSets <= 0) {
    return []
  }

  const considered = pastSets.slice(0, lookbackSets)

  /** key → the most recent set it appeared in. */
  const lastSeen = new Map<
    string,
    { setsAgo: number; playedAt: string; playlistName: string }
  >()

  for (const [index, set] of considered.entries()) {
    for (const track of set.tracks) {
      const key = trackKey(track.artist, track.name)

      // First write wins: `considered` is newest first, so the first time a key
      // appears is its most recent play.
      if (!lastSeen.has(key)) {
        lastSeen.set(key, {
          setsAgo: index + 1,
          playedAt: set.playedAt,
          playlistName: set.playlistName,
        })
      }
    }
  }

  const repeats: ResidencyRepeat[] = []

  for (const track of tracks) {
    const seen = lastSeen.get(trackKey(track.artist, track.name))

    if (seen) {
      repeats.push({
        position: track.position,
        artist: track.artist,
        name: track.name,
        setsAgo: seen.setsAgo,
        playedAt: seen.playedAt,
        playlistName: seen.playlistName,
      })
    }
  }

  // Most recently played first: those are the ones a room would actually remember.
  return repeats.sort(
    (left, right) => left.setsAgo - right.setsAgo || left.position - right.position
  )
}

export interface ResidencySummary {
  venue: string | null
  /** Past dates at this venue that were considered. */
  setsConsidered: number
  repeats: ResidencyRepeat[]
  /**
   * True when there is a venue but no played history at it yet.
   *
   * Distinguished from "no repeats" on purpose: "nothing repeats" and "I have
   * nothing to compare against" look identical in a count and mean opposite things
   * to someone deciding whether to trust the check.
   */
  noHistory: boolean
}

export function summarizeResidency(
  venue: string | null,
  tracks: readonly ResidencyTrack[],
  pastSets: readonly PlayedSet[],
  lookbackSets: number = RESIDENCY_LOOKBACK_SETS
): ResidencySummary {
  const considered = Math.min(pastSets.length, Math.max(0, lookbackSets))

  return {
    venue,
    setsConsidered: considered,
    repeats: residencyRepeats(tracks, pastSets, lookbackSets),
    noHistory: normalizeVenue(venue) !== null && pastSets.length === 0,
  }
}
