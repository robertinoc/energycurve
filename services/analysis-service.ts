import "server-only"

import type { SiteLocale } from "@/lib/content/site-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
import {
  estimateSetDurationMinutes,
  resolveTrackEnergies,
} from "@/lib/engine/energy-score"
import {
  buildRecommendations,
  suggestReorder,
  type Recommendation,
  type ReorderSuggestion,
} from "@/lib/engine/recommendations"
import { logInfo } from "@/lib/observability/logger"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import type {
  PlaylistAnalysis,
  ResolvedTrackEnergy,
} from "@/types/analysis"
import type { PlaylistWithTracks } from "@/types/domain"

export const MIN_ANALYZABLE_TRACKS = 2

export type PlaylistAnalysisResult =
  | {
      status: "ok"
      playlist: PlaylistWithTracks
      energies: ResolvedTrackEnergy[]
      analysis: PlaylistAnalysis
      recommendations: Recommendation[]
      reorder: ReorderSuggestion | null
      durationMinutes: number
    }
  | {
      status: "not_analyzable"
      playlist: PlaylistWithTracks
      reason: "too_few_tracks" | "missing_genre_or_context"
    }

export async function getPlaylistAnalysis(
  profileId: string,
  playlistId: string,
  locale: SiteLocale = "en"
): Promise<PlaylistAnalysisResult | null> {
  const playlist = await getOwnedPlaylistWithTracks(profileId, playlistId)

  if (!playlist) {
    return null
  }

  // Legacy rows can carry NULL genre/context; new playlists always set both.
  if (!playlist.genre || !playlist.context) {
    return {
      status: "not_analyzable",
      playlist,
      reason: "missing_genre_or_context",
    }
  }

  if (playlist.tracks.length < MIN_ANALYZABLE_TRACKS) {
    return { status: "not_analyzable", playlist, reason: "too_few_tracks" }
  }

  const energies = resolveTrackEnergies(playlist.tracks, playlist.context)
  const analysis = analyzePlaylist({
    curve: energies.map((entry) => entry.score),
    genre: playlist.genre,
    context: playlist.context,
  })
  const recommendations = buildRecommendations(analysis, locale)
  const reorder = suggestReorder(
    energies,
    playlist.genre,
    playlist.context,
    analysis.setScore,
    locale
  )

  logInfo("playlist.analyzed", {
    profileId,
    playlistId,
    trackCount: playlist.tracks.length,
    setScore: analysis.setScore,
    issueCount: analysis.issues.length,
    reorderSuggested: reorder !== null,
  })

  return {
    status: "ok",
    playlist,
    energies,
    analysis,
    recommendations,
    reorder,
    durationMinutes: estimateSetDurationMinutes(playlist.tracks.length),
  }
}
