import "server-only"

import { logError } from "@/lib/observability/logger"
import { buildLibrary, type LibrarySummary } from "@/lib/playlists/library"
import { trackKey } from "@/lib/playlists/set-comparison"
import { parseSnapshot } from "@/lib/playlists/versions"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Every record across a DJ's sets, with what we know about each.
 *
 * Two reads rather than one join: the tracks, and the sets marked as played.
 * "Played" lives in version snapshots — jsonb, not a foreign key — so the
 * intersection has to happen in code anyway, and doing it here keeps the query
 * simple enough to read.
 */
export async function getGlobalLibrary(
  profileId: string
): Promise<LibrarySummary> {
  const supabase = getSupabaseAdminClient()

  const { data: playlists, error: playlistError } = await supabase
    .from("playlists")
    .select("id, name")
    .eq("user_id", profileId)

  if (playlistError || !playlists?.length) {
    if (playlistError) {
      logError("library.playlists_failed", playlistError, { profileId })
    }

    return buildLibrary([], new Set())
  }

  const playlistIds = playlists.map((playlist) => playlist.id)
  const nameById = new Map(
    playlists.map((playlist) => [playlist.id, playlist.name])
  )

  const [tracksResult, versionsResult] = await Promise.all([
    supabase
      .from("tracks")
      .select("artist, name, bpm, musical_key, playlist_id")
      .in("playlist_id", playlistIds),
    // Only 'played' versions: the question is what actually got played, and a
    // curated order is a plan, not a night.
    supabase
      .from("playlist_versions")
      .select("tracks")
      .in("playlist_id", playlistIds)
      .eq("kind", "played"),
  ])

  if (tracksResult.error) {
    logError("library.tracks_failed", tracksResult.error, { profileId })
    return buildLibrary([], new Set())
  }

  const playedKeys = new Set<string>()

  // A failed versions read degrades to "nothing known played" rather than
  // failing the page: the library is still worth showing without that column.
  for (const row of versionsResult.data ?? []) {
    for (const track of parseSnapshot(row.tracks)) {
      playedKeys.add(trackKey(track.artist, track.name))
    }
  }

  return buildLibrary(
    (tracksResult.data ?? []).map((track) => ({
      artist: track.artist,
      name: track.name,
      bpm: track.bpm,
      musicalKey: track.musical_key,
      playlistId: track.playlist_id,
      playlistName: nameById.get(track.playlist_id) ?? "",
    })),
    playedKeys
  )
}
