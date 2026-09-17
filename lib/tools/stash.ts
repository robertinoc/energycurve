import type { ImportedTrack, ImportSource } from "@/lib/playlists/imported-track"
import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"

/**
 * The set a visitor analysed on the free tool, kept across the trip to signup.
 *
 * The problem this solves is small and it loses people: someone drops a
 * playlist in, likes the curve, clicks "show me how to fix it", signs up — and
 * lands in an empty dashboard being asked for the file they just gave us. The
 * one thing they wanted is now three steps away and they have to go find the
 * export again.
 *
 * **localStorage, not a server.** There is deliberately no backend here. The
 * tool's promise is that the playlist never leaves the browser, and a "hold my
 * set while I sign up" endpoint would quietly end that — the set would be on
 * our disk, belonging to nobody, before the account existed. Keeping it in the
 * same browser that parsed it keeps the promise literally true.
 *
 * It is a convenience and it is allowed to fail. Private windows, cleared site
 * data and a full quota all make this a no-op, and the dashboard's normal import
 * is right there. Every accessor is wrapped accordingly.
 */

const KEY = "energycurve:tool-stash"

/** A week. Long enough for "I'll finish signing up tonight", short enough that
 *  a set from a month ago doesn't reappear out of nowhere. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** Rejects a stash whose shape predates a change rather than half-reading it. */
const VERSION = 1

export interface StashedSet {
  version: number
  /** Epoch ms, for the expiry above. */
  savedAt: number
  source: ImportSource
  playlistName: string | null
  genre: SupportedGenre
  context: PlaylistContext
  tracks: ImportedTrack[]
}

export function stashSet(
  set: Omit<StashedSet, "version" | "savedAt">
): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...set, version: VERSION, savedAt: Date.now() })
    )
  } catch {
    // Quota, private mode, blocked site data. The set is still on screen and
    // the dashboard can still import the file; losing the shortcut is not worth
    // an error in front of someone mid-signup.
  }
}

/**
 * The stashed set, or null when there is none, it is stale, or it was written
 * by an older shape of this code.
 */
export function readStashedSet(): StashedSet | null {
  let raw: string | null = null

  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    return null
  }

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StashedSet>

    if (
      parsed.version !== VERSION ||
      typeof parsed.savedAt !== "number" ||
      !Array.isArray(parsed.tracks) ||
      parsed.tracks.length === 0
    ) {
      return null
    }

    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearStashedSet()
      return null
    }

    return parsed as StashedSet
  } catch {
    // Someone else's key collision, a truncated write, a hand-edited value.
    return null
  }
}

export function clearStashedSet(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Same as above: nothing to do and nothing worth saying.
  }
}

/**
 * A stashed set as the "Artist - Title" lines the manual import reads.
 *
 * This is the one lossy step in the hand-off and it is worth naming: the paste
 * format carries names and nothing else, so a set that came from a Rekordbox
 * export arrives here without its BPMs, keys or energy ratings. That is fine for
 * a set that was pasted in to begin with — nothing is lost that was ever there —
 * and for a file import the honest advice is to import the file, which the same
 * screen offers a tab away. The banner says so rather than quietly downgrading
 * someone's tags.
 */
export function stashedSetAsText(set: StashedSet): string {
  return set.tracks
    .map((track) => `${track.artist} - ${track.name}`.trim())
    .filter((line) => line !== "-")
    .join("\n")
}
