import type { SiteLocale } from "@/lib/content/site-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { buildRecommendations } from "@/lib/engine/recommendations"
import {
  EXAMPLE_SET_CONTEXT,
  EXAMPLE_SET_GENRE,
  EXAMPLE_SET_TRACKS,
} from "@/lib/product/example-set"
import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"

/** How many of the engine's findings the preview spells out; the rest are counted. */
export const EXAMPLE_PROBLEMS_SHOWN = 3

export interface ExampleSetView {
  genre: SupportedGenre
  context: PlaylistContext
  trackCount: number
  minutes: number
  score: number
  curve: number[]
  targetCurve: number[]
  /** The engine's findings, most important first, as the analysis page words them. */
  problems: Array<{ title: string; action: string }>
  /** Findings beyond the ones spelled out. */
  moreProblems: number
}

/**
 * The example set (lib/product/example-set.ts), read by the real engine.
 *
 * The same three calls the analysis page makes — resolveTrackEnergies,
 * analyzePlaylist, buildRecommendations — so the preview is the product working
 * on data, not a picture of it. Whatever the engine would say about this set on
 * the analysis page, it says here; replacing the rows changes the preview with
 * nothing else to edit.
 *
 * Pure and read-only: no account, no database, nothing saved. It runs on the
 * server for a dashboard that has no playlists yet, which is the only place the
 * preview is offered.
 */
export function analyzeExampleSet(locale: SiteLocale): ExampleSetView {
  const energies = resolveTrackEnergies(
    EXAMPLE_SET_TRACKS.map((track, index) => ({
      position: index + 1,
      bpm: track.bpm,
      energy_score: track.energy,
      genre: null,
      musical_key: track.key,
      perceived_db: null,
    })),
    EXAMPLE_SET_CONTEXT,
    EXAMPLE_SET_GENRE
  )

  const analysis = analyzePlaylist({
    curve: energies.map((entry) => entry.score),
    genre: EXAMPLE_SET_GENRE,
    context: EXAMPLE_SET_CONTEXT,
    trackMeta: energies.map((entry) => ({ source: entry.source, bpm: entry.bpm })),
    durationsSeconds: EXAMPLE_SET_TRACKS.map((track) => track.durationSeconds),
    slot: null,
  })

  const recommendations = buildRecommendations(analysis, locale)

  return {
    genre: EXAMPLE_SET_GENRE,
    context: EXAMPLE_SET_CONTEXT,
    trackCount: EXAMPLE_SET_TRACKS.length,
    minutes: analysis.timing.totalMinutes,
    score: analysis.setScore,
    curve: analysis.curve,
    targetCurve: analysis.targetCurve,
    problems: recommendations
      .slice(0, EXAMPLE_PROBLEMS_SHOWN)
      .map((rec) => ({ title: rec.title, action: rec.action })),
    moreProblems: Math.max(0, recommendations.length - EXAMPLE_PROBLEMS_SHOWN),
  }
}
