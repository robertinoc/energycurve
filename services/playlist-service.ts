import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { logError, logInfo } from "@/lib/observability/logger"
import type {
  Playlist,
  PlaylistContext,
  PlaylistWithTrackCount,
  PlaylistWithTracks,
  SupportedGenre,
  Track,
  TrackWriteInput,
} from "@/types/domain"

const MOVE_TEMP_POSITION_OFFSET = 100000

export interface PlaylistCreateData {
  name: string
  genre: SupportedGenre
  context: PlaylistContext
}

export async function createPlaylist(
  profileId: string,
  input: PlaylistCreateData
): Promise<Playlist> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: profileId,
      name: input.name,
      genre: input.genre,
      context: input.context,
    })
    .select()
    .single()

  if (error || !data) {
    logError("playlist.create_failed", error, { profileId })
    throw new Error("Unable to create the playlist.")
  }

  logInfo("playlist.created", { profileId, playlistId: data.id })
  return data
}

export async function listPlaylists(
  profileId: string
): Promise<PlaylistWithTrackCount[]> {
  const supabase = getSupabaseAdminClient()

  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", profileId)
    .order("updated_at", { ascending: false })

  if (error) {
    logError("playlist.list_failed", error, { profileId })
    throw new Error("Unable to load your playlists.")
  }

  const rows = playlists ?? []

  if (rows.length === 0) {
    return []
  }

  const { data: trackRows, error: tracksError } = await supabase
    .from("tracks")
    .select("playlist_id")
    .in(
      "playlist_id",
      rows.map((playlist) => playlist.id)
    )

  if (tracksError) {
    logError("playlist.track_counts_failed", tracksError, { profileId })
    throw new Error("Unable to load your playlists.")
  }

  const counts = new Map<string, number>()

  for (const row of trackRows ?? []) {
    counts.set(row.playlist_id, (counts.get(row.playlist_id) ?? 0) + 1)
  }

  return rows.map((playlist) => ({
    ...playlist,
    trackCount: counts.get(playlist.id) ?? 0,
  }))
}

export async function getOwnedPlaylist(
  profileId: string,
  playlistId: string
): Promise<Playlist | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .eq("user_id", profileId)
    .maybeSingle()

  if (error) {
    logError("playlist.load_failed", error, { profileId, playlistId })
    throw new Error("Unable to load the playlist.")
  }

  return data
}

export async function getOwnedPlaylistWithTracks(
  profileId: string,
  playlistId: string
): Promise<PlaylistWithTracks | null> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    return null
  }

  const supabase = getSupabaseAdminClient()

  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true })

  if (error) {
    logError("playlist.tracks_load_failed", error, { profileId, playlistId })
    throw new Error("Unable to load the playlist tracks.")
  }

  return { ...playlist, tracks: tracks ?? [] }
}

export async function deletePlaylist(
  profileId: string,
  playlistId: string
): Promise<void> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId)
    .eq("user_id", profileId)

  if (error) {
    logError("playlist.delete_failed", error, { profileId, playlistId })
    throw new Error("Unable to delete the playlist.")
  }

  logInfo("playlist.deleted", { profileId, playlistId })
}

async function getOrderedTracks(playlistId: string): Promise<Track[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true })

  if (error) {
    logError("track.list_failed", error, { playlistId })
    throw new Error("Unable to load the playlist tracks.")
  }

  return data ?? []
}

export async function addTrack(
  profileId: string,
  playlistId: string,
  input: TrackWriteInput
): Promise<Track> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()
  const tracks = await getOrderedTracks(playlistId)
  const nextPosition =
    tracks.length > 0 ? tracks[tracks.length - 1].position + 1 : 1

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      playlist_id: playlistId,
      position: nextPosition,
      artist: input.artist,
      name: input.name,
      bpm: input.bpm,
      energy_score: input.energyScore,
    })
    .select()
    .single()

  if (error || !data) {
    logError("track.add_failed", error, { profileId, playlistId })
    throw new Error("Unable to add the track.")
  }

  logInfo("track.added", { profileId, playlistId, trackId: data.id })
  return data
}

export async function updateTrack(
  profileId: string,
  playlistId: string,
  trackId: string,
  input: TrackWriteInput
): Promise<Track> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("tracks")
    .update({
      artist: input.artist,
      name: input.name,
      bpm: input.bpm,
      energy_score: input.energyScore,
    })
    .eq("id", trackId)
    .eq("playlist_id", playlistId)
    .select()
    .maybeSingle()

  if (error) {
    logError("track.update_failed", error, { profileId, playlistId, trackId })
    throw new Error("Unable to update the track.")
  }

  if (!data) {
    throw new Error("Track not found.")
  }

  logInfo("track.updated", { profileId, playlistId, trackId })
  return data
}

export async function removeTrack(
  profileId: string,
  playlistId: string,
  trackId: string
): Promise<void> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()

  const { data: removed, error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("playlist_id", playlistId)
    .select()
    .maybeSingle()

  if (error) {
    logError("track.remove_failed", error, { profileId, playlistId, trackId })
    throw new Error("Unable to remove the track.")
  }

  if (!removed) {
    throw new Error("Track not found.")
  }

  // Renumber the remaining tracks so positions stay contiguous. Ascending
  // order means each update moves into a slot that was just vacated, which
  // keeps the unique(playlist_id, position) constraint satisfied.
  const remaining = await getOrderedTracks(playlistId)

  for (const [index, track] of remaining.entries()) {
    const expectedPosition = index + 1

    if (track.position === expectedPosition) {
      continue
    }

    const { error: renumberError } = await supabase
      .from("tracks")
      .update({ position: expectedPosition })
      .eq("id", track.id)

    if (renumberError) {
      logError("track.renumber_failed", renumberError, {
        profileId,
        playlistId,
        trackId: track.id,
      })
      throw new Error("Unable to reorder the remaining tracks.")
    }
  }

  logInfo("track.removed", { profileId, playlistId, trackId })
}

export async function moveTrack(
  profileId: string,
  playlistId: string,
  trackId: string,
  direction: "up" | "down"
): Promise<void> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const tracks = await getOrderedTracks(playlistId)
  const index = tracks.findIndex((track) => track.id === trackId)

  if (index === -1) {
    throw new Error("Track not found.")
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1

  if (targetIndex < 0 || targetIndex >= tracks.length) {
    return
  }

  const current = tracks[index]
  const target = tracks[targetIndex]
  const supabase = getSupabaseAdminClient()

  // Swap positions in three steps through a temporary slot so the
  // unique(playlist_id, position) constraint never trips.
  const tempPosition = current.position + MOVE_TEMP_POSITION_OFFSET

  const steps = [
    { id: current.id, position: tempPosition },
    { id: target.id, position: current.position },
    { id: current.id, position: target.position },
  ]

  for (const step of steps) {
    const { error } = await supabase
      .from("tracks")
      .update({ position: step.position })
      .eq("id", step.id)

    if (error) {
      logError("track.move_failed", error, {
        profileId,
        playlistId,
        trackId,
        direction,
      })
      throw new Error("Unable to move the track.")
    }
  }

  logInfo("track.moved", { profileId, playlistId, trackId, direction })
}

export async function replaceTracks(
  profileId: string,
  playlistId: string,
  tracks: TrackWriteInput[]
): Promise<number> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()

  const { error: deleteError } = await supabase
    .from("tracks")
    .delete()
    .eq("playlist_id", playlistId)

  if (deleteError) {
    logError("track.replace_delete_failed", deleteError, {
      profileId,
      playlistId,
    })
    throw new Error("Unable to import the tracklist.")
  }

  if (tracks.length === 0) {
    logInfo("tracks.imported", { profileId, playlistId, importedCount: 0 })
    return 0
  }

  const { error: insertError } = await supabase.from("tracks").insert(
    tracks.map((track, index) => ({
      playlist_id: playlistId,
      position: index + 1,
      artist: track.artist,
      name: track.name,
      bpm: track.bpm,
      energy_score: track.energyScore,
    }))
  )

  if (insertError) {
    logError("track.replace_insert_failed", insertError, {
      profileId,
      playlistId,
    })
    throw new Error("Unable to import the tracklist.")
  }

  logInfo("tracks.imported", {
    profileId,
    playlistId,
    importedCount: tracks.length,
  })

  return tracks.length
}
