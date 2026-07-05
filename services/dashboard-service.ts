import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import type { DashboardSnapshot, WorkOSUserIdentity } from "@/types/domain"

const LATEST_PLAYLISTS_LIMIT = 5

/** Sparkline window: last N recorded analyses per playlist. */
const SCORE_HISTORY_LIMIT = 12

export async function getDashboardSnapshot(
  user: WorkOSUserIdentity
): Promise<DashboardSnapshot> {
  const supabase = getSupabaseAdminClient()
  const profile = await syncProfileFromWorkOSUser(user)

  const { data: playlists, count: playlistCount, error: playlistsError } =
    await supabase
      .from("playlists")
      .select("*", { count: "exact" })
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })

  if (playlistsError) {
    throw new Error("Unable to load playlists for the dashboard.")
  }

  const rows = playlists ?? []
  const playlistIds = rows.map((playlist) => playlist.id)
  let trackCount = 0
  const trackCounts = new Map<string, number>()

  if (playlistIds.length > 0) {
    const { data: trackRows, error: tracksError } = await supabase
      .from("tracks")
      .select("playlist_id")
      .in("playlist_id", playlistIds)

    if (tracksError) {
      throw new Error("Unable to load tracks for the dashboard.")
    }

    for (const row of trackRows ?? []) {
      trackCounts.set(row.playlist_id, (trackCounts.get(row.playlist_id) ?? 0) + 1)
    }

    trackCount = trackRows?.length ?? 0
  }

  const latestRows = rows.slice(0, LATEST_PLAYLISTS_LIMIT)
  const scoreHistories = new Map<string, number[]>()

  if (latestRows.length > 0) {
    const { data: analysisRows, error: analysesError } = await supabase
      .from("analyses")
      .select("playlist_id, set_score, created_at")
      .in(
        "playlist_id",
        latestRows.map((playlist) => playlist.id)
      )
      .order("created_at", { ascending: true })

    if (analysesError) {
      // Score history is decoration — never fail the dashboard over it
      // (e.g. an environment that hasn't run migration 0003 yet).
      console.warn("dashboard.score_history_unavailable", analysesError.message)
    }

    for (const row of analysisRows ?? []) {
      const history = scoreHistories.get(row.playlist_id) ?? []
      history.push(Number(row.set_score))
      scoreHistories.set(row.playlist_id, history)
    }
  }

  return {
    profile,
    playlistCount: playlistCount ?? 0,
    trackCount,
    latestPlaylists: latestRows.map((playlist) => ({
      ...playlist,
      trackCount: trackCounts.get(playlist.id) ?? 0,
      scoreHistory: (scoreHistories.get(playlist.id) ?? []).slice(
        -SCORE_HISTORY_LIMIT
      ),
    })),
  }
}
