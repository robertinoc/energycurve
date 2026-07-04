import "server-only"

import { computeAnalysisInputHash } from "@/lib/analytics/analysis-hash"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import type { SiteLocale } from "@/lib/content/site-copy"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
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
import { logError, logInfo } from "@/lib/observability/logger"
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

  captureServerEvent(profileId, "analysis_started", {
    playlistId,
    trackCount: playlist.tracks.length,
    genre: playlist.genre,
    context: playlist.context,
  })

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

  captureServerEvent(profileId, "analysis_completed", {
    playlistId,
    trackCount: playlist.tracks.length,
    genre: playlist.genre,
    context: playlist.context,
    setScore: analysis.setScore,
    issueCount: analysis.issues.length,
    reorderSuggested: reorder !== null,
  })

  // History snapshot for the "playlists analyzed" KPI — fire-and-forget so
  // a storage hiccup never breaks the results page.
  void recordAnalysisSnapshot(profileId, playlistId, analysis, reorder)

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

/**
 * Appends an analysis row to the history table, deduped by input hash so
 * reloading the results page doesn't inflate the "playlists analyzed" KPI:
 * a new row lands only when the tracklist, genre, or context changed.
 */
async function recordAnalysisSnapshot(
  profileId: string,
  playlistId: string,
  analysis: PlaylistAnalysis,
  reorder: ReorderSuggestion | null
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const inputHash = computeAnalysisInputHash({
      curve: analysis.curve,
      genre: analysis.genre,
      context: analysis.context,
    })

    const { data: latest, error: latestError } = await supabase
      .from("analyses")
      .select("input_hash")
      .eq("playlist_id", playlistId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError) {
      throw latestError
    }

    if (latest?.input_hash === inputHash) {
      return
    }

    const { error: insertError } = await supabase.from("analyses").insert({
      playlist_id: playlistId,
      user_id: profileId,
      genre: analysis.genre,
      context: analysis.context,
      set_score: analysis.setScore,
      curve: analysis.curve,
      issues: JSON.parse(JSON.stringify(analysis.issues)),
      breakdown: JSON.parse(JSON.stringify(analysis.breakdown)),
      suggested_order: reorder?.suggestedOrder ?? null,
      suggested_score: reorder?.suggestedAnalysis.setScore ?? null,
      input_hash: inputHash,
    })

    if (insertError) {
      throw insertError
    }

    logInfo("analysis.recorded", { profileId, playlistId, inputHash })
  } catch (error) {
    logError("analysis.record_failed", error, { profileId, playlistId })
  }
}
