/**
 * Where Gig Mode keeps its place in the set.
 *
 * A DJ opens this at the start of a slot and touches it between tracks for the
 * next hour or two. The position has to survive the things that actually happen
 * in a booth: a phone locking and waking, a browser evicting a backgrounded tab,
 * an accidental reload with no connection. So it lives in `localStorage`, keyed
 * per playlist, rather than in React state alone.
 *
 * Kept pure and free of React so the clamping — the part that can silently point
 * at a track that no longer exists — is unit-testable.
 */

const POSITION_KEY_PREFIX = "energycurve:gig-position:"

export function gigPositionKey(playlistId: string): string {
  return `${POSITION_KEY_PREFIX}${playlistId}`
}

/**
 * Forces a stored or user-supplied position into a real index.
 *
 * The stored value is the untrusted part: it was written by a previous session
 * against a set that may since have had tracks removed, so "track 14 of 12" is a
 * reachable state. Everything out of range collapses to the first track rather
 * than to the last — landing on the opener is recoverable in a booth, landing on
 * the closer looks like the set already ended.
 */
export function clampGigPosition(value: unknown, trackCount: number): number {
  if (trackCount <= 0) {
    return 0
  }

  const index = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(index)) {
    return 0
  }

  return Math.min(Math.max(Math.trunc(index), 0), trackCount - 1)
}

/** Reads the stored position. Returns 0 on the server or when nothing is stored. */
export function readGigPosition(playlistId: string, trackCount: number): number {
  if (typeof window === "undefined") {
    return 0
  }

  try {
    const stored = window.localStorage.getItem(gigPositionKey(playlistId))
    return stored === null ? 0 : clampGigPosition(stored, trackCount)
  } catch {
    // Private-browsing modes can throw on access rather than return null.
    return 0
  }
}

export function writeGigPosition(playlistId: string, position: number): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(gigPositionKey(playlistId), String(position))
  } catch {
    // Losing the bookmark is survivable; throwing mid-set is not.
  }
}

export interface GigTrack {
  position: number
  artist: string
  name: string
  bpm: number | null
  camelot: string | null
  energy: number
  /** Wall-clock minute this track is due, when the set declares a slot. */
  clockMinutes: number | null
}

/**
 * How the BPM changes going into a track, as a signed difference.
 *
 * This is the number a DJ is actually doing arithmetic on while the current track
 * plays, and doing it in their head under a monitor is exactly the sort of thing
 * that gets a transition wrong. Null when either side has no tempo.
 */
export function bpmDelta(
  from: GigTrack | undefined,
  to: GigTrack | undefined
): number | null {
  if (!from?.bpm || !to?.bpm) {
    return null
  }
  return Math.round((to.bpm - from.bpm) * 10) / 10
}
