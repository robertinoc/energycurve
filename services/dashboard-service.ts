import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import type { DashboardSnapshot, WorkOSUserIdentity } from "@/types/domain"

export async function getDashboardSnapshot(
  user: WorkOSUserIdentity
): Promise<DashboardSnapshot> {
  const supabase = getSupabaseAdminClient()
  const profile = await syncProfileFromWorkOSUser(user)

  const { data: playlists, count: playlistCount, error: playlistsError } =
    await supabase
      .from("playlists")
      .select("id", { count: "exact" })
      .eq("user_id", profile.id)

  if (playlistsError) {
    throw new Error("Unable to load playlists for the dashboard.")
  }

  const playlistIds = (playlists ?? []).map((playlist) => playlist.id)
  let trackCount = 0

  if (playlistIds.length > 0) {
    const { count, error: tracksError } = await supabase
      .from("tracks")
      .select("id", { count: "exact", head: true })
      .in("playlist_id", playlistIds)

    if (tracksError) {
      throw new Error("Unable to load tracks for the dashboard.")
    }

    trackCount = count ?? 0
  }

  return {
    profile,
    playlistCount: playlistCount ?? 0,
    trackCount,
  }
}
