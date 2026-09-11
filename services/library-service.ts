import "server-only"

import { logError } from "@/lib/observability/logger"
import { buildLibrary, type LibrarySummary } from "@/lib/playlists/library"
import { trackKey } from "@/lib/playlists/set-comparison"
import { parseSnapshot } from "@/lib/playlists/versions"
import { fetchAllRows } from "@/lib/supabase/paginate"
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

  const { rows: playlists, error: playlistError } = await fetchAllRows(
    (from, to) =>
      supabase
        .from("playlists")
        .select("id, name")
        .eq("user_id", profileId)
        .range(from, to)
  )

  if (playlistError || !playlists.length) {
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
    fetchAllRows((from, to) =>
      supabase
        .from("tracks")
        .select("artist, name, bpm, musical_key, playlist_id")
        .in("playlist_id", playlistIds)
        .range(from, to)
    ),
    // Only 'played' versions: the question is what actually got played, and a
    // curated order is a plan, not a night.
    fetchAllRows((from, to) =>
      supabase
        .from("playlist_versions")
        .select("tracks")
        .in("playlist_id", playlistIds)
        .eq("kind", "played")
        .range(from, to)
    ),
  ])

  if (tracksResult.error) {
    logError("library.tracks_failed", tracksResult.error, { profileId })
    return buildLibrary([], new Set())
  }

  if (tracksResult.truncated) {
    // Logged as well as surfaced: the UI tells this DJ, the log tells us the
    // ceiling is being reached by real libraries and needs revisiting.
    logError(
      "library.truncated",
      new Error(`global library hit the row ceiling for profile ${profileId}`),
      { profileId, rows: tracksResult.rows.length }
    )
  }

  const playedKeys = new Set<string>()

  // A failed versions read degrades to "nothing known played" rather than
  // failing the page: the library is still worth showing without that column.
  for (const row of versionsResult.rows) {
    for (const track of parseSnapshot(row.tracks)) {
      playedKeys.add(trackKey(track.artist, track.name))
    }
  }

  return buildLibrary(
    tracksResult.rows.map((track) => ({
      artist: track.artist,
      name: track.name,
      bpm: track.bpm,
      musicalKey: track.musical_key,
      playlistId: track.playlist_id,
      playlistName: nameById.get(track.playlist_id) ?? "",
    })),
    playedKeys,
    tracksResult.truncated
  )
}
