import {
  EmptyImportError,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import type { ImportSource } from "@/lib/playlists/imported-track"
import { isOverImportLimit } from "@/lib/playlists/import-limit"
import { estimateSetDuration, type SetDuration } from "@/lib/engine/set-duration"
import {
  harmonicAvailability,
  splitCountOptions,
  type HarmonicAvailability,
} from "@/lib/engine/set-split"
import { toCamelot } from "@/lib/music/camelot"

/**
 * What the form offers when a list runs past an hour: how long it plays and
 * where that number came from, the set counts that leave each part near an
 * hour, and whether the harmonic criterion has enough keys to stand on.
 */
export interface SplitProposal {
  duration: SetDuration
  counts: number[]
  harmonic: HarmonicAvailability
}

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
  | {
      kind: "ready"
      source: ImportSource
      tracks: number
      playlistName: string | null
      /** Null when the list plays about an hour or less: nothing is asked. */
      split: SplitProposal | null
    }
  /** More tracks than any import accepts (lib/playlists/import-limit.ts). */
  | { kind: "too_many"; tracks: number }
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

  if (isOverImportLimit(parsed.tracks.length)) {
    return { kind: "too_many", tracks: parsed.tracks.length }
  }

  return {
    kind: "ready",
    source: parsed.source,
    tracks: parsed.tracks.length,
    playlistName: parsed.playlistName,
    split: proposeSplit(parsed.tracks),
  }
}

/** The keys the file itself carried — the only ones a split is computed on. */
export function importedCamelots(
  tracks: readonly { key: string | null }[]
): Array<string | null> {
  return tracks.map((track) => toCamelot(track.key))
}

export function proposeSplit(
  tracks: readonly { durationSeconds: number | null; bpm: number | null; key: string | null }[]
): SplitProposal | null {
  const duration = estimateSetDuration(tracks)
  const counts = splitCountOptions(duration, tracks.length)

  if (counts.length === 0) {
    return null
  }

  return { duration, counts, harmonic: harmonicAvailability(importedCamelots(tracks)) }
}
