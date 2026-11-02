import "server-only"

import { after } from "next/server"

import { computeAnalysisInputHash } from "@/lib/analytics/analysis-hash"
import {
  CURRENT_ANALYSIS_ALGORITHM_VERSION,
  parseCurveShape,
} from "@/lib/product/strategy"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import type { SiteLocale } from "@/lib/content/site-copy"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { analyzePlaylist } from "@/lib/engine/analysis"
import {
  resolveTrackEnergies,
} from "@/lib/engine/energy-score"
import {
  buildRecommendations,
  type Recommendation,
  type ReorderSuggestion,
} from "@/lib/engine/recommendations"
import { suggestReorderRemembered } from "@/services/reorder-suggestion-cache"
import { logError, logInfo } from "@/lib/observability/logger"
import { resolveSlot } from "@/lib/engine/slot"
import { getCurveTemplate } from "@/services/curve-template-service"
import { can } from "@/lib/product/capabilities"
import { getProfileBilling } from "@/services/billing-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { scoreGain, type RecordedAnalysis } from "@/lib/product/score-gain"
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
      /**
       * This analysis raised the score because the set changed (see
       * lib/product/score-gain.ts), or null. `wall` is true when the account
       * can't read its version history yet — then the page sells it.
       */
      scoreGain: { from: number; to: number; wall: boolean } | null
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

  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )
  // Declaring a slot is free — it's just a fact about the gig, and recording it
  // costs nothing. Reading the curve *against* it is the PRO capability, so an
  // unentitled user's analysis is computed exactly as before rather than with a
  // locked-looking placeholder.
  const declaredSlot = resolveSlot(
    playlist.slot_start_minutes,
    playlist.slot_end_minutes
  )
  const billing = await getProfileBilling(profileId)
  const slot = can(billing.plan, billing.status, "slot_aware_planning")
    ? declaredSlot
    : null

  // Same split as the slot: picking a shape is free and stays on the record, but
  // scoring against it is the PRO capability. An unentitled set falls back to the
  // derived target and scores exactly as it did before.
  const targetShape = can(billing.plan, billing.status, "named_curve_shapes")
    ? parseCurveShape(playlist.target_shape)
    : null

  // A saved template is the DJ's own shape, so it outranks a built-in name.
  // Gated separately: named shapes are PRO, saving your own is PRO+.
  const template =
    playlist.target_template_id &&
    can(billing.plan, billing.status, "custom_curve_templates")
      ? await getCurveTemplate(profileId, playlist.target_template_id)
      : null

  const analysis = analyzePlaylist({
    curve: energies.map((entry) => entry.score),
    genre: playlist.genre,
    context: playlist.context,
    trackMeta: energies.map((entry) => ({
      source: entry.source,
      bpm: entry.bpm,
    })),
    // Real lengths, read from each file's own tags at import. Index-aligned with
    // the curve because playlist.tracks is what built it.
    durationsSeconds: playlist.tracks.map((track) => track.duration_seconds),
    slot,
    targetShape,
    targetAnchors: template?.anchors ?? null,
  })
  const recommendations = buildRecommendations(analysis, locale)
  // Remembered, not recomputed per render (H-23): the same set gets the same
  // answer, and any edit to it changes the key. See reorder-suggestion-cache.ts.
  const reorder = suggestReorderRemembered(
    energies,
    playlist.genre,
    playlist.context,
    analysis.setScore,
    locale,
    targetShape
  )

  // Wall 3 of step 3.1: did this analysis raise the score because the DJ
  // changed the set? Read before the snapshot below is recorded, so on the
  // render that records it the newest row is still the previous analysis.
  const inputHash = computeAnalysisInputHash({
    curve: analysis.curve,
    genre: analysis.genre,
    context: analysis.context,
    targetShape: analysis.targetShape,
    algorithmVersion: CURRENT_ANALYSIS_ALGORITHM_VERSION,
  })
  const gain = scoreGain(
    {
      inputHash,
      setScore: analysis.setScore,
      curve: analysis.curve,
      genre: analysis.genre,
      context: analysis.context,
      algorithmVersion: CURRENT_ANALYSIS_ALGORITHM_VERSION,
    },
    await readRecentAnalyses(playlistId)
  )
  // History is recorded for everyone and read on PRO ("recording is free;
  // reading is paid"), so the wall goes to whoever can't read it yet.
  const gainWall = gain !== null && !can(billing.plan, billing.status, "version_history")

  if (gain?.fresh) {
    // Once per improvement, on every plan: how often a re-analysis pays off is
    // worth knowing on its own, and PRO is the baseline the wall is read against.
    captureServerEvent(profileId, "score_improved", {
      playlistId,
      from: gain.from,
      to: gain.to,
      plan: billing.plan,
      wallShown: gainWall,
    })
  }

  if (gainWall) {
    captureServerEvent(profileId, "sales_wall_shown", {
      wall: "score_improved",
      plan: billing.plan,
    })
  }

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

  // History snapshot for the "playlists analyzed" KPI. Scheduled with
  // after() rather than a bare fire-and-forget promise: on serverless the
  // function can freeze once the response streams, dropping an un-awaited
  // write — after() keeps the runtime alive until the insert completes.
  // recordAnalysisSnapshot swallows its own errors, so it never breaks the
  // results page.
  after(() => recordAnalysisSnapshot(profileId, playlistId, analysis, reorder))

  return {
    status: "ok",
    playlist,
    energies,
    analysis,
    recommendations,
    reorder,
    // The engine already resolved this from real file lengths; recomputing it from
    // the track count here would have the results page and the analysis quoting two
    // different set lengths on the same screen.
    durationMinutes: analysis.timing.totalMinutes,
    scoreGain: gain ? { from: gain.from, to: gain.to, wall: gainWall } : null,
  }
}

/**
 * The two newest analyses of a playlist, newest first, for scoreGain. A read
 * that fails is no gain: the strip is a moment, never a reason to break the
 * results page.
 */
async function readRecentAnalyses(playlistId: string): Promise<RecordedAnalysis[]> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("analyses")
      .select("input_hash, set_score, curve, genre, context, algorithm_version, created_at")
      .eq("playlist_id", playlistId)
      .order("created_at", { ascending: false })
      .limit(2)

    if (error) {
      throw error
    }

    return (data ?? []).flatMap((row) =>
      row.input_hash && row.set_score !== null && Array.isArray(row.curve)
        ? [
            {
              inputHash: row.input_hash,
              setScore: Number(row.set_score),
              curve: (row.curve as unknown[]).map(Number),
              genre: row.genre,
              context: row.context,
              algorithmVersion: row.algorithm_version,
              createdAt: row.created_at,
            },
          ]
        : []
    )
  } catch (error) {
    logError("analysis.recent_read_failed", error, { playlistId })
    return []
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
      targetShape: analysis.targetShape,
      algorithmVersion: CURRENT_ANALYSIS_ALGORITHM_VERSION,
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
      algorithm_version: CURRENT_ANALYSIS_ALGORITHM_VERSION,
    })

    if (insertError) {
      throw insertError
    }

    logInfo("analysis.recorded", { profileId, playlistId, inputHash })
  } catch (error) {
    logError("analysis.record_failed", error, { profileId, playlistId })
  }
}
