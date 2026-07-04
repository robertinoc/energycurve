import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import type { DashboardSnapshot, WorkOSUserIdentity } from "@/types/domain"

const LATEST_PLAYLISTS_LIMIT = 5

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

  return {
    profile,
    playlistCount: playlistCount ?? 0,
    trackCount,
    latestPlaylists: rows.slice(0, LATEST_PLAYLISTS_LIMIT).map((playlist) => ({
      ...playlist,
      trackCount: trackCounts.get(playlist.id) ?? 0,
    })),
  }
}
