import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { logError, logInfo } from "@/lib/observability/logger"
import { finalPositions, isValidReorder } from "@/lib/tracklist/reorder"
import type {
  Playlist,
  PlaylistContext,
  PlaylistTaxonomyNames,
  PlaylistWithTrackCount,
  PlaylistWithTracks,
  SupportedGenre,
  Track,
  TrackWriteInput,
} from "@/types/domain"
import { quotaFor } from "@/lib/product/capabilities"
import { quotaState } from "@/lib/product/usage"
import { getProfileBilling } from "./billing-service"

const MOVE_TEMP_POSITION_OFFSET = 100000

export interface PlaylistCreateData {
  name: string
  genre: SupportedGenre
  context: PlaylistContext
  /** How the playlist was imported, so exports can default to that format. */
  importSource?: string | null
  /** Display-only custom taxonomy links ("behaves like" model). */
  customContextId?: string | null
  customGenreId?: string | null
}

/**
 * PostgREST embed for the custom-taxonomy display names: joined via the
 * playlists.custom_*_id FKs and flattened into PlaylistTaxonomyNames.
 */
const PLAYLIST_WITH_NAMES_SELECT =
  "*, custom_context:user_contexts(name), custom_genre:user_genres(name)"

type PlaylistNameJoins = {
  custom_context: { name: string } | null
  custom_genre: { name: string } | null
}

function flattenTaxonomyNames<T extends PlaylistNameJoins>(
  row: T
): Omit<T, keyof PlaylistNameJoins> & PlaylistTaxonomyNames {
  const { custom_context, custom_genre, ...rest } = row

  return {
    ...rest,
    custom_context_name: custom_context?.name ?? null,
    custom_genre_name: custom_genre?.name ?? null,
  }
}

/**
 * Thrown instead of creating a playlist past the plan's cap.
 *
 * A typed error rather than a union return so the three creation paths can't
 * silently ignore it: `createPlaylist` is the single choke point every one of
 * them goes through, and a new caller gets the limit for free.
 */
export class PlaylistLimitError extends Error {
  constructor(
    readonly used: number,
    readonly limit: number
  ) {
    super(`Playlist limit reached (${used}/${limit})`)
    this.name = "PlaylistLimitError"
  }
}

/** How many playlists this profile currently keeps. */
export async function countPlaylists(profileId: string): Promise<number> {
  const supabase = getSupabaseAdminClient()

  const { count, error } = await supabase
    .from("playlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId)

  if (error) {
    logError("playlist.count_failed", error, { profileId })
    // Fail open: a count that didn't load must not block a paying customer.
    return 0
  }

  return count ?? 0
}

export async function createPlaylist(
  profileId: string,
  input: PlaylistCreateData
): Promise<Playlist> {
  const billing = await getProfileBilling(profileId)
  const limit = quotaFor(billing.plan, billing.status, "active_playlists")

  if (limit !== null) {
    const used = await countPlaylists(profileId)
    if (!quotaState(used, limit).allowed) {
      // Blocks creation and nothing else. Everything already saved stays visible
      // and editable, including for someone who ends up over the cap after a
      // downgrade — their playlists are their work, not leverage.
      throw new PlaylistLimitError(used, limit)
    }
  }

  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: profileId,
      name: input.name,
      genre: input.genre,
      context: input.context,
      import_source: input.importSource ?? null,
      custom_context_id: input.customContextId ?? null,
      custom_genre_id: input.customGenreId ?? null,
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
    .select(PLAYLIST_WITH_NAMES_SELECT)
    .eq("user_id", profileId)
    .order("updated_at", { ascending: false })

  if (error) {
    logError("playlist.list_failed", error, { profileId })
    throw new Error("Unable to load your playlists.")
  }

  const rows = ((playlists ?? []) as unknown as Array<
    Playlist & PlaylistNameJoins
  >).map(flattenTaxonomyNames)

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
): Promise<(Playlist & PlaylistTaxonomyNames) | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_WITH_NAMES_SELECT)
    .eq("id", playlistId)
    .eq("user_id", profileId)
    .maybeSingle()

  if (error) {
    logError("playlist.load_failed", error, { profileId, playlistId })
    throw new Error("Unable to load the playlist.")
  }

  return data
    ? flattenTaxonomyNames(data as unknown as Playlist & PlaylistNameJoins)
    : null
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

/** Renames a playlist and sets its optional description (V3 feedback). */
export async function updatePlaylistDetails(
  profileId: string,
  playlistId: string,
  input: { name: string; description: string | null }
): Promise<void> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("playlists")
    .update({ name: input.name, description: input.description })
    .eq("id", playlistId)
    .eq("user_id", profileId)

  if (error) {
    logError("playlist.update_details_failed", error, {
      profileId,
      playlistId,
    })
    throw new Error("Unable to update the playlist.")
  }

  logInfo("playlist.details_updated", { profileId, playlistId })
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
      source_uri: input.sourceUri ?? null,
      musical_key: input.musicalKey ?? null,
      genre: input.genre ?? null,
      comment: input.comment ?? null,
      duration_seconds: input.durationSeconds ?? null,
      perceived_db: input.perceivedDb ?? null,
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
      musical_key: input.musicalKey ?? null,
      genre: input.genre ?? null,
      comment: input.comment ?? null,
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
      source_uri: track.sourceUri ?? null,
      musical_key: track.musicalKey ?? null,
      genre: track.genre ?? null,
      comment: track.comment ?? null,
      duration_seconds: track.durationSeconds ?? null,
        perceived_db: track.perceivedDb ?? null,
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

/**
 * Persists a full manual reorder of a playlist's tracks. `orderedTrackIds` must
 * be a permutation of the playlist's current track ids. Applied in two phases —
 * park every row at a high temp position, then assign the final 1..n — so the
 * unique(playlist_id, position) constraint never trips mid-update (same trick as
 * moveTrack, generalized to the whole list).
 */
export async function reorderTracks(
  profileId: string,
  playlistId: string,
  orderedTrackIds: string[]
): Promise<void> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const current = await getOrderedTracks(playlistId)

  if (!isValidReorder(current.map((track) => track.id), orderedTrackIds)) {
    throw new Error("Track order does not match the playlist.")
  }

  const supabase = getSupabaseAdminClient()

  // Phase 1: park every track at a unique temp position above the real range.
  for (let index = 0; index < orderedTrackIds.length; index++) {
    const { error } = await supabase
      .from("tracks")
      .update({ position: MOVE_TEMP_POSITION_OFFSET + index + 1 })
      .eq("id", orderedTrackIds[index])
      .eq("playlist_id", playlistId)

    if (error) {
      logError("track.reorder_park_failed", error, { profileId, playlistId })
      throw new Error("Unable to save the new order.")
    }
  }

  // Phase 2: assign the final contiguous 1..n positions in the requested order.
  for (const { id, position } of finalPositions(orderedTrackIds)) {
    const { error } = await supabase
      .from("tracks")
      .update({ position })
      .eq("id", id)
      .eq("playlist_id", playlistId)

    if (error) {
      logError("track.reorder_assign_failed", error, { profileId, playlistId })
      throw new Error("Unable to save the new order.")
    }
  }

  logInfo("tracks.reordered", {
    profileId,
    playlistId,
    count: orderedTrackIds.length,
  })
}
