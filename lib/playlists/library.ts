/**
 * Every record a DJ has, collapsed across their sets.
 *
 * A playlist answers "what's in this night". Nothing answered "what do I
 * actually own, what do I lean on, and what have I never once played" — which
 * is the question that changes what somebody buys next.
 *
 * Grouping is by record, not by row: the same track imported into four sets is
 * four rows and one record. `trackKey` from set-comparison does that matching,
 * so a repeat found here and a repeat found between two sets always agree.
 */

import { trackKey } from "@/lib/playlists/set-comparison"

export interface LibraryInputTrack {
  artist: string
  name: string
  bpm: number | null
  musicalKey: string | null
  playlistId: string
  playlistName: string
}

export interface LibraryEntry {
  key: string
  artist: string
  name: string
  bpm: number | null
  musicalKey: string | null
  /** Distinct sets this record appears in. */
  playlistCount: number
  playlistNames: string[]
  /** False when it has never appeared in a set marked as played. */
  everPlayed: boolean
}

export interface LibrarySummary {
  entries: LibraryEntry[]
  /** Distinct records, which is smaller than the row count. */
  recordCount: number
  /** Records that appear in more than one set. */
  repeatedCount: number
  /** Records that exist in a set but have never been played. */
  neverPlayedCount: number
}

/**
 * Collapses rows into records.
 *
 * `playedKeys` holds the keys of every track in a version marked "played". A
 * record missing from it hasn't been played *as far as we know*, which is a
 * weaker claim than "never played" — the DJ only marks a set as played if they
 * remember to. The UI has to say it that way; this function just reports the
 * fact.
 */
export function buildLibrary(
  tracks: readonly LibraryInputTrack[],
  playedKeys: ReadonlySet<string>
): LibrarySummary {
  const byRecord = new Map<
    string,
    LibraryEntry & { playlistIds: Set<string> }
  >()

  for (const track of tracks) {
    const key = trackKey(track.artist, track.name)
    const existing = byRecord.get(key)

    if (existing) {
      existing.playlistIds.add(track.playlistId)

      if (!existing.playlistNames.includes(track.playlistName)) {
        existing.playlistNames.push(track.playlistName)
      }

      // Fill gaps from later copies: the same record imported twice may carry
      // a BPM in one file and not the other, and a known value beats a null
      // whichever row it arrived on.
      existing.bpm ??= track.bpm
      existing.musicalKey ??= track.musicalKey
      continue
    }

    byRecord.set(key, {
      key,
      artist: track.artist,
      name: track.name,
      bpm: track.bpm,
      musicalKey: track.musicalKey,
      playlistCount: 0,
      playlistNames: [track.playlistName],
      playlistIds: new Set([track.playlistId]),
      everPlayed: playedKeys.has(key),
    })
  }

  const entries = [...byRecord.values()].map((entry) => ({
    key: entry.key,
    artist: entry.artist,
    name: entry.name,
    bpm: entry.bpm,
    musicalKey: entry.musicalKey,
    playlistCount: entry.playlistIds.size,
    playlistNames: entry.playlistNames,
    everPlayed: entry.everPlayed,
  }))

  // Most-used first: the top of this list is what a DJ's sound actually is, and
  // it's usually a shorter list than they expect. Ties alphabetical so the order
  // is stable between loads.
  entries.sort(
    (a, b) =>
      b.playlistCount - a.playlistCount ||
      a.artist.localeCompare(b.artist) ||
      a.name.localeCompare(b.name)
  )

  return {
    entries,
    recordCount: entries.length,
    repeatedCount: entries.filter((entry) => entry.playlistCount > 1).length,
    neverPlayedCount: entries.filter((entry) => !entry.everPlayed).length,
  }
}

export type LibraryFilter = "all" | "repeated" | "never_played"

export function filterLibrary(
  entries: readonly LibraryEntry[],
  filter: LibraryFilter
): LibraryEntry[] {
  if (filter === "repeated") {
    return entries.filter((entry) => entry.playlistCount > 1)
  }

  if (filter === "never_played") {
    return entries.filter((entry) => !entry.everPlayed)
  }

  return [...entries]
}
