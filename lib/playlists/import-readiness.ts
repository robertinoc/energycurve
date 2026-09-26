import {
  EmptyImportError,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import type { ImportSource } from "@/lib/playlists/imported-track"

/**
 * Whether a chosen file is actually importable, decided by parsing it.
 *
 * The import form used to say "Ready to import" the moment a file was chosen.
 * Readiness was granted by the file having a name, and the F1 audit (finding
 * A3) walked three files through it — a Rekordbox XML cut off halfway, a valid
 * export with zero tracks, and a two-line shopping list — and got "Ready to
 * import" for all three. The person found out on submit, or found out nothing
 * at all: an empty export saved an empty playlist.
 *
 * The rule now: **ready is earned by the parse, not by the extension.** One
 * usable track is the bar, and it is deliberately low. A playlist with no BPM
 * and no key is importable — the product exists for those sets too, and the
 * copy promises it — so the only thing that fails here is a file with no tracks
 * in it, or no playlist in it at all.
 *
 * Pure and dependency-free so the same verdict is reached in the browser, when
 * the file is chosen, and on the server, when it is submitted. Two judges with
 * one rulebook cannot disagree about which files are empty.
 */
export type ImportReadiness =
  | { kind: "ready"; source: ImportSource; tracks: number; playlistName: string | null }
  /** A recognised export whose playlist has no tracks. */
  | { kind: "empty" }
  /** Not a shape any of our readers recognises. */
  | { kind: "unrecognised" }
  /** Recognised, then failed while reading — a file cut off or damaged. */
  | { kind: "broken" }

export function assessImport(fileContents: string): ImportReadiness {
  let parsed

  try {
    parsed = parseImport(fileContents)
  } catch (error) {
    if (error instanceof UnsupportedImportError) {
      return { kind: "unrecognised" }
    }

    if (error instanceof EmptyImportError) {
      return { kind: "empty" }
    }

    return { kind: "broken" }
  }

  // Belt and braces: every reader throws EmptyImportError before returning
  // zero tracks, but a reader added later might not.
  if (parsed.tracks.length === 0) {
    return { kind: "empty" }
  }

  return {
    kind: "ready",
    source: parsed.source,
    tracks: parsed.tracks.length,
    playlistName: parsed.playlistName,
  }
}
