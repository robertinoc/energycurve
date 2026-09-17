import { assessHarmony } from "@/lib/engine/harmony"
import { analyzePlaylist } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import type { ImportedTrack, ImportSource } from "@/lib/playlists/imported-track"
import { detectGenres } from "@/lib/playlists/parse-import"
import type { ParsedTrackLine } from "@/lib/playlists/parse-tracklist"
import type { EnergyCoverage } from "@/lib/engine/energy-coverage"
import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"

/**
 * The free tool's analysis, run entirely in the visitor's browser.
 *
 * Every function this composes is already in the product and already pure —
 * `parseImport`, `detectGenres`, `resolveTrackEnergies`, `analyzePlaylist`,
 * `assessHarmony`. None of them touch the network, the filesystem or a session;
 * `services/analysis-service.ts` is the wrapper that does, and this module is
 * deliberately not it. That is what lets the tool promise a DJ that their
 * playlist never leaves the machine and have the promise be structural rather
 * than a policy someone has to keep.
 *
 * What it returns is the free half: the curve, the score, and how many problems
 * of each kind. Which track to move and where — `buildRecommendations` and
 * `suggestReorder` — is deliberately not computed here. Not to make the lock
 * convincing, but because a lock you can pick by opening devtools is a lie told
 * to the honest visitor only.
 */

/** Below this there is no curve to read, and the app agrees (MIN_ANALYZABLE_TRACKS). */
export const MIN_TOOL_TRACKS = 2

/** The default read of a set when nobody has said otherwise. */
export const DEFAULT_CONTEXT: PlaylistContext = "main"

/** The genre used when no track carries a tag we recognise and no BPM fits a band. */
export const FALLBACK_GENRE: SupportedGenre = "house"

export interface ToolProblemCounts {
  /**
   * Steps larger than the genre tolerates, up or down. The single most common
   * reason a set that looks fine on paper stalls a room.
   */
  energyJumps: number
  /**
   * Adjacent tracks whose keys fight. Counted only across transitions where both
   * tracks have a readable key — unknown is not a clash, and warning about half a
   * library with no key tags is how a tool teaches people to ignore it.
   */
  harmonicClashes: number
  /** The peak landing somewhere the shape doesn't want it. */
  misplacedPeaks: number
}

export interface ToolTrack {
  position: number
  artist: string
  name: string
  /** Resolved 1–10, whatever it was resolved from. */
  energy: number
  /** Where that number came from, so the UI can say rather than imply. */
  energySource: string
  bpm: number | null
  camelot: string | null
}

export interface ToolAnalysis {
  source: ImportSource
  playlistName: string | null
  genre: SupportedGenre
  context: PlaylistContext
  /** Whether the genre was read from the tracks or fell back. */
  genreDetected: boolean
  tracks: ToolTrack[]
  curve: number[]
  targetCurve: number[]
  /** Positions drawn hollow on the chart: energy invented from position. */
  estimatedIndices: number[]
  score: number
  problems: ToolProblemCounts
  coverage: EnergyCoverage
}

export class TooFewTracksError extends Error {}

/**
 * A pasted "Artist - Title" list, in the shape the analyser takes.
 *
 * A paste carries names and, when someone wrote them in, BPMs — and nothing
 * else. Every other field is null rather than guessed, which is what makes the
 * coverage read `invented` and the page say so instead of showing a curve that
 * looks measured.
 */
export function tracksFromPastedLines(lines: ParsedTrackLine[]): ImportedTrack[] {
  return lines.map((line) => ({
    artist: line.artist,
    name: line.name,
    bpm: line.bpm,
    key: null,
    genre: null,
    energy: null,
    sourceUri: null,
    comment: null,
    durationSeconds: null,
  }))
}

/** Energy steps the genre doesn't tolerate, in either direction. */
const JUMP_ISSUES = new Set(["abrupt_spike", "abrupt_drop"])

/**
 * A peak in the wrong place.
 *
 * `early_peak` is the one this counts. `no_climax` is a different complaint —
 * the set never peaks at all — and folding it in here would report "1 misplaced
 * peak" about a set that has none.
 */
const PEAK_ISSUES = new Set(["early_peak"])

/**
 * Runs the free analysis over an already-parsed playlist.
 *
 * Takes tracks rather than file contents so the caller owns parsing: the tool
 * needs `listPlaylists` first when a library export holds several, and a paste
 * never goes through `parseImport` at all.
 */
export function analyzeForTool({
  tracks,
  source,
  playlistName = null,
  context = DEFAULT_CONTEXT,
  genre: forcedGenre = null,
}: {
  tracks: ImportedTrack[]
  source: ImportSource
  playlistName?: string | null
  context?: PlaylistContext
  genre?: SupportedGenre | null
}): ToolAnalysis {
  if (tracks.length < MIN_TOOL_TRACKS) {
    throw new TooFewTracksError(
      `An energy curve needs at least ${MIN_TOOL_TRACKS} tracks.`
    )
  }

  const detected = forcedGenre ?? detectGenres(tracks).dominant
  const genre = detected ?? FALLBACK_GENRE

  const energies = resolveTrackEnergies(
    tracks.map((track, index) => ({
      position: index + 1,
      bpm: track.bpm,
      energy_score: track.energy,
      genre: track.genre,
      musical_key: track.key,
      perceived_db: track.perceivedDb ?? null,
    })),
    context,
    genre
  )

  const analysis = analyzePlaylist({
    curve: energies.map((entry) => entry.score),
    genre,
    context,
    trackMeta: energies.map((entry) => ({
      source: entry.source,
      bpm: entry.bpm,
    })),
    durationsSeconds: tracks.map((track) => track.durationSeconds),
    slot: null,
  })

  // Harmony is a separate read from the curve — it is about keys, not energy —
  // so it comes from its own assessment rather than from the issue list, which
  // has no harmonic type in it.
  const harmony = assessHarmony(energies.map((entry) => entry.camelot))

  return {
    source,
    playlistName,
    genre,
    context,
    genreDetected: detected !== null,
    tracks: energies.map((entry, index) => ({
      position: index + 1,
      artist: tracks[index].artist,
      name: tracks[index].name,
      energy: entry.score,
      energySource: entry.source,
      bpm: entry.bpm,
      camelot: entry.camelot,
    })),
    curve: analysis.curve,
    targetCurve: analysis.targetCurve,
    estimatedIndices: energies
      .map((entry, index) => (entry.source === "estimated" ? index : -1))
      .filter((index) => index >= 0),
    score: analysis.setScore,
    problems: {
      energyJumps: analysis.issues.filter((issue) => JUMP_ISSUES.has(issue.type))
        .length,
      harmonicClashes: harmony.clashCount,
      misplacedPeaks: analysis.issues.filter((issue) =>
        PEAK_ISSUES.has(issue.type)
      ).length,
    },
    coverage: analysis.coverage,
  }
}
