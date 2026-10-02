/**
 * Whether a playlist's tracks are probably still on their way (IMP.1).
 *
 * Creating a set from an import is two writes — the playlist row, then its
 * tracks — and between them the set exists with nothing in it. Opened in that
 * gap, the detail page used to render an empty table and a disabled Export as if
 * that were the finished result, and as a server page it never looked again.
 *
 * An *imported* playlist with no tracks is never a finished state: an import of
 * an empty file is refused before anything is written (the A3 fix, lote 10),
 * and a tracks write that fails now deletes the playlist again
 * (`createPlaylistWithTracks`). So an import with zero tracks, created a moment
 * ago, is one that is still arriving. A *manual* playlist with zero tracks is
 * different — making one and filling it by hand is a real workflow — which is
 * why `importSource` decides it and not the count alone.
 *
 * The window is short and then it stops claiming anything. Past it, an empty
 * import is not "arriving", it is broken (a rollback that itself failed), and
 * saying "still importing" forever would be the same dishonesty in reverse.
 */

/** How long after creation an empty import still reads as in progress. */
export const IMPORT_ARRIVAL_WINDOW_MS = 60_000

export function importStillArriving(
  playlist: {
    importSource: string | null
    trackCount: number
    createdAt: string
  },
  now: number
): boolean {
  if (playlist.importSource === null || playlist.trackCount > 0) {
    return false
  }

  const created = Date.parse(playlist.createdAt)

  if (Number.isNaN(created)) {
    return false
  }

  const age = now - created

  // A clock a little behind the database's still counts as "just now".
  return age >= -5_000 && age < IMPORT_ARRIVAL_WINDOW_MS
}
