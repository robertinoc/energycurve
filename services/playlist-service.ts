import "server-only"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { fetchAllRows } from "@/lib/supabase/paginate"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { logError, logInfo, logWarn } from "@/lib/observability/logger"
import { finalPositions, isValidReorder } from "@/lib/tracklist/reorder"
import { captureVersion } from "@/services/version-service"
import type { CurveShape } from "@/lib/product/strategy"
import type { Json } from "@/types/database"
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

/**
 * Updates in flight at once while saving a reorder.
 *
 * Each phase used to fire one update per track all together. At a thousand
 * tracks that is a thousand simultaneous requests from one process, and against
 * dev one of them failed with `TypeError: fetch failed` in the second of four
 * consecutive saves (docs/qa/carga-2026-10.md, lote 17). Bounded, the same
 * writes go out in waves and none of them is the one that drops.
 */
const REORDER_WRITE_CONCURRENCY = 32

/**
 * Every track of one set, in order, past PostgREST's 1,000-row ceiling.
 *
 * The three readers below used a single unranged select. A set of 1,200 tracks
 * then rendered as 1,000 on its own page, with nothing saying so, and a reorder
 * of it was validated against the 1,000 it could see. `(playlist_id, position)`
 * is unique, so ordering by position pages stably.
 */
async function readSetTracks(
  playlistId: string
): Promise<{ tracks: Track[]; error: unknown }> {
  const supabase = getSupabaseAdminClient()
  const { rows, error, truncated } = await fetchAllRows<Track>((from, to) =>
    supabase
      .from("tracks")
      .select("*")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true })
      .range(from, to) as never
  )

  if (truncated) {
    // 50,000 tracks in one set: refuse rather than show part of it as all.
    return { tracks: rows, error: new Error("set exceeds the row ceiling") }
  }

  return { tracks: rows, error }
}

export interface PlaylistCreateData {
  name: string
  genre: SupportedGenre
  context: PlaylistContext
  /** How the playlist was imported, so exports can default to that format. */
  importSource?: string | null
  /**
   * The source file's root/header elements, kept verbatim so a re-export
   * declares the version that came in rather than a hardcoded one.
   */
  sourceHeader?: unknown
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
      // The moment the product says "no" to a free user, which is the only
      // moment a paid plan is worth anything to them. Recorded here rather than
      // in the UI so it fires wherever creation is attempted from.
      captureServerEvent(profileId, "plan_limit_reached", {
        capability: "active_playlists",
        plan: billing.plan,
        used,
        limit,
      })

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
      source_header: (input.sourceHeader ?? null) as Json,
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

/**
 * Creates a playlist *and* its tracks, or neither (IMP.1).
 *
 * The three create paths — paste, file import, audio import — used to call
 * `createPlaylist` and then `replaceTracks` themselves. Two requests, and
 * PostgREST gives no transaction across them, which costs two different things:
 *
 * 1. **If the tracks fail, the playlist stayed.** The action returned "something
 *    went wrong", and the library kept an empty set with the file's name on it,
 *    forever, counting against a free user's three. This function deletes it
 *    again before rethrowing, so a failed import leaves no trace.
 * 2. **Between the two requests the set exists with no tracks.** Opened from a
 *    second tab in that window, its page rendered an empty table and a disabled
 *    Export, and — being a server page — never refreshed. That window is not
 *    closed here; it would take a database function (see below). The page
 *    instead recognises an import that is still arriving (`importStillArriving`
 *    in `lib/playlists/import-arrival.ts`) and says so.
 *
 * Why not a transaction. The correct fix is one statement: a Postgres function
 * that inserts the playlist and its tracks together. That means a new migration
 * applied by hand in both projects, and shipping code that depends on a
 * migration nobody has applied is the exact way analyses stopped persisting for
 * 76 days (H-12). It would also put the track column list in SQL, a second copy
 * of `replaceTracks`'s mapping. Both are worth doing on purpose, not in passing.
 */
export async function createPlaylistWithTracks(
  profileId: string,
  input: PlaylistCreateData,
  tracks: TrackWriteInput[]
): Promise<Playlist> {
  const playlist = await createPlaylist(profileId, input)

  if (tracks.length === 0) {
    return playlist
  }

  try {
    await replaceTracks(profileId, playlist.id, tracks)
  } catch (error) {
    try {
      await deletePlaylist(profileId, playlist.id)
      logWarn("playlist.create_rolled_back", {
        profileId,
        playlistId: playlist.id,
        trackCount: tracks.length,
      })
    } catch (cleanupError) {
      // The one case that still leaves an empty set behind. Logged with both
      // ids so it can be found; the page shows it as an import that did not
      // finish rather than as a finished empty set.
      logError("playlist.create_rollback_failed", cleanupError, {
        profileId,
        playlistId: playlist.id,
      })
    }

    throw error
  }

  return playlist
}

/**
 * Every set the user owns, each with its track count.
 *
 * Runs in the dashboard layout, so on every dashboard page. It used to fetch one
 * `tracks` row per track and tally them, which broke twice
 * (docs/qa/carga-2026-10.md, point 5, H-21):
 *
 * - **Silently from 1,000 tracks in total.** PostgREST stops at 1,000 rows
 *   without saying so; the tally then counted whichever tracks made the first
 *   page. At 30,000 tracks, 96 of 100 sets showed 0.
 * - **Loudly from ~400 sets.** The tracks were filtered with an `in()` of every
 *   playlist id, which travels in the URL and stops fitting around 400.
 *
 * Now the database counts: `tracks(count)` is PostgREST's per-row count of a
 * related table, one number per set and no track rows in the body, with no id
 * list at all. One request per thousand sets. The sets themselves page, so a
 * user with more than a thousand of them gets all of them.
 */
export async function listPlaylists(
  profileId: string
): Promise<PlaylistWithTrackCount[]> {
  const supabase = getSupabaseAdminClient()

  const { rows: playlists, error, truncated } = await fetchAllRows<
    Playlist & PlaylistNameJoins & { tracks: Array<{ count: number }> | null }
  >(
    (from, to) =>
      supabase
        .from("playlists")
        .select(`${PLAYLIST_WITH_NAMES_SELECT}, tracks(count)`)
        .eq("user_id", profileId)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to) as never
  )

  if (error) {
    logError("playlist.list_failed", error, { profileId })
    throw new Error("Unable to load your playlists.")
  }

  if (truncated) {
    // 50,000 sets. Logged rather than thrown: a list that stops there is still
    // every set anyone could scroll to, and the log says the ceiling was met.
    logWarn("playlist.list_truncated", { profileId, rows: playlists.length })
  }

  return playlists.map(({ tracks, ...playlist }) => {
    const count = tracks?.[0]?.count

    if (typeof count !== "number") {
      // A missing count is not a zero. Refusing beats a dashboard of empty sets.
      logError("playlist.track_counts_failed", new Error("track count missing"), {
        profileId,
        playlistId: playlist.id,
      })
      throw new Error("Unable to load your playlists.")
    }

    return { ...flattenTaxonomyNames(playlist), trackCount: count }
  })
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

  const { tracks, error } = await readSetTracks(playlistId)

  if (error) {
    logError("playlist.tracks_load_failed", error, { profileId, playlistId })
    throw new Error("Unable to load the playlist tracks.")
  }

  return { ...playlist, tracks }
}

/**
 * Loads a playlist **without an ownership check**, for the public curve page.
 *
 * Deliberately separate from `getOwnedPlaylistWithTracks` rather than a flag on
 * it: an ownership check that can be switched off from a call site is one bad
 * refactor away from being switched off everywhere.
 *
 * Two callers, and each has something that stands in for ownership:
 *
 * - `app/(en)/c/[token]/page.tsx` — the share token's HMAC is verified first, so an
 *   id cannot be walked without producing a valid signature.
 * - `services/collaboration-service.ts` → `getSharedPlaylist`, which reads
 *   `set_collaborators` for (playlist_id, invited_email) and returns null
 *   before reaching here when the viewer has no row.
 *
 * This comment used to say "the only caller is the signed-link route" while the
 * second one already existed. It was harmless — that caller checks access — but
 * a caller list is exactly what the next person reads before adding a third, so
 * `tests/object-access-callers.test.ts` now holds the list still instead of
 * trusting this paragraph to stay true.
 */
export async function getPlaylistWithTracksById(
  playlistId: string
): Promise<PlaylistWithTracks | null> {
  const supabase = getSupabaseAdminClient()

  const { data: playlist, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_WITH_NAMES_SELECT)
    .eq("id", playlistId)
    .maybeSingle()

  if (error || !playlist) {
    return null
  }

  const { tracks, error: tracksError } = await readSetTracks(playlistId)

  if (tracksError) {
    logError("playlist.public_tracks_load_failed", tracksError, { playlistId })
    return null
  }

  return { ...(playlist as unknown as PlaylistWithTracks), tracks }
}

/** Renames a playlist and sets its optional description (V3 feedback). */
export async function updatePlaylistDetails(
  profileId: string,
  playlistId: string,
  input: {
    name: string
    description: string | null
    /** Minutes from midnight. Both or neither — the DB constraint enforces it too. */
    slotStartMinutes?: number | null
    slotEndMinutes?: number | null
    /** Where it's played, for residency checks. Same absent/null contract. */
    venue?: string | null
    /** Null clears it back to the derived target; absent leaves it untouched. */
    targetShape?: CurveShape | null
    /** Same contract. Set together with targetShape, since one control feeds both. */
    targetTemplateId?: string | null
  }
): Promise<void> {
  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("playlists")
    .update({
      name: input.name,
      description: input.description,
      // Written whenever the keys are present, including back to null: clearing
      // the slot has to be possible, so `undefined` (absent) and `null` (cleared)
      // mean different things here.
      ...(input.slotStartMinutes !== undefined
        ? { slot_start_minutes: input.slotStartMinutes }
        : {}),
      ...(input.slotEndMinutes !== undefined
        ? { slot_end_minutes: input.slotEndMinutes }
        : {}),
      ...(input.venue !== undefined ? { venue: input.venue } : {}),
      ...(input.targetShape !== undefined
        ? { target_shape: input.targetShape }
        : {}),
      ...(input.targetTemplateId !== undefined
        ? { target_template_id: input.targetTemplateId }
        : {}),
    })
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
  const { tracks, error } = await readSetTracks(playlistId)

  if (error) {
    logError("track.list_failed", error, { playlistId })
    throw new Error("Unable to load the playlist tracks.")
  }

  return tracks
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
      source_payload: input.sourcePayload ?? null,
      source_payload_format: input.sourcePayloadFormat ?? null,
      energy_source: input.energySource ?? null,
      // Cast at the jsonb boundary, same as `anchors` in curve-template-service:
      // a structured interface has no index signature, so it isn't `Json` by
      // assignment. It was validated by parseTrackAudioFeatures on the way in.
      audio_features: (input.audioFeatures ?? null) as unknown as Json,
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

/** One track's measured audio, as the enrichment flow produces it. */
export interface TrackAudioUpdate {
  trackId: string
  bpm: number | null
  musicalKey: string | null
  /** The persisted feature shape, already validated by the caller. */
  audioFeatures: Json | null
}

/**
 * Writes measured audio onto tracks that already exist.
 *
 * Separate from `updateTrack` on purpose. That one takes a whole
 * `TrackWriteInput` — artist, name, comment, genre — because it backs a form
 * where a person edits those fields. This writes only what a measurement
 * produced, so an enrichment run can never blank a title the DJ typed by
 * omitting it from a payload.
 *
 * Ownership is checked once for the playlist rather than per track, and every
 * update is scoped by `playlist_id`, so a track id from someone else's set can't
 * ride along in the array.
 */
export async function applyMeasuredAudio(
  profileId: string,
  playlistId: string,
  updates: readonly TrackAudioUpdate[]
): Promise<number> {
  if (updates.length === 0) {
    return 0
  }

  const playlist = await getOwnedPlaylist(profileId, playlistId)

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const supabase = getSupabaseAdminClient()
  let written = 0

  for (const update of updates) {
    const { error } = await supabase
      .from("tracks")
      .update({
        bpm: update.bpm,
        musical_key: update.musicalKey,
        audio_features: update.audioFeatures,
      })
      .eq("id", update.trackId)
      .eq("playlist_id", playlistId)

    if (error) {
      // One bad row doesn't abandon the rest: the DJ picked a folder and waited
      // through the analysis, and losing twenty good measurements to one failure
      // would be the worst possible use of that.
      logError("track.audio_apply_failed", error, {
        profileId,
        playlistId,
        trackId: update.trackId,
      })
      continue
    }

    written += 1
  }

  logInfo("track.audio_applied", { profileId, playlistId, written })

  return written
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
      source_payload: track.sourcePayload ?? null,
      source_payload_format: track.sourcePayloadFormat ?? null,
      energy_source: track.energySource ?? null,
      audio_features: (track.audioFeatures ?? null) as unknown as Json,
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

  return reorderAuthorized(profileId, playlistId, orderedTrackIds)
}

/**
 * Reorders a set on behalf of whoever currently holds the edit lock.
 *
 * The lock check lives in the collaboration service, which is where locks are
 * understood; this only exists so that check has something to call. Named for what
 * it assumes, so nobody reaches for it thinking it authorises anything.
 */
export async function reorderTracksAsLockHolder(
  profileId: string,
  playlistId: string,
  orderedTrackIds: string[]
): Promise<void> {
  return reorderAuthorized(profileId, playlistId, orderedTrackIds)
}

/**
 * The reorder itself, with the authorisation already decided.
 *
 * Split out so turn-based editing can reuse it: a collaborator holding the edit
 * lock is authorised to reorder without owning the set, and the alternative was
 * either a second copy of the two-phase position rewrite or an `isOwner` boolean
 * threaded through it — one duplicates the risky part, the other makes the guard
 * a parameter, which is how a guard ends up being passed `true`.
 *
 * Not exported. Every caller comes through a function that decided the question
 * first.
 */
async function reorderAuthorized(
  profileId: string,
  playlistId: string,
  orderedTrackIds: string[]
): Promise<void> {
  // Genre and context only, for the version snapshot below. Read without an owner
  // filter on purpose: the caller already decided who may write here, and adding a
  // second, different authorisation check inside would be the one that's wrong.
  const supabaseRead = getSupabaseAdminClient()
  const { data: playlist } = await supabaseRead
    .from("playlists")
    .select("genre, context")
    .eq("id", playlistId)
    .maybeSingle()

  if (!playlist) {
    throw new Error("Playlist not found.")
  }

  const current = await getOrderedTracks(playlistId)

  if (!isValidReorder(current.map((track) => track.id), orderedTrackIds)) {
    throw new Error("Track order does not match the playlist.")
  }

  // Captured *before* the write, with the tracks as they still are, so the version
  // describes the order being replaced. Awaited rather than fired off: after the
  // update the previous order is gone and there is nothing left to snapshot.
  // captureVersion never throws, so this can't cost the user their reorder.
  await captureVersion(playlistId, current, playlist.genre, playlist.context)

  const supabase = getSupabaseAdminClient()

  /**
   * Two phases, and only the tracks that move.
   *
   * The phases are not an implementation detail to tidy away: `tracks` carries
   * `unique (playlist_id, position)`, so parking the moving tracks clear of the
   * real range is what stops the new order colliding with the old one part way
   * through. **Phase one must finish before phase two starts.**
   *
   * Three changes from the version that wrote every track twice, all about how
   * many writes a save makes and none about the order it saves
   * (docs/qa/carga-2026-10.md, point 4):
   *
   * - **Only the tracks whose position changes are written.** The unchanged
   *   ones already hold their final position, and the moving ones' final
   *   positions are exactly the positions they leave, so nothing collides. A
   *   drag of ten places on a 1,000-track set is 22 writes, not 2,000.
   * - **Writes go out `REORDER_WRITE_CONCURRENCY` at a time**, not all at once
   *   (see the constant).
   * - **Parking starts above the highest position the set holds now**, not at
   *   a fixed 100,000. A save that failed between the phases used to leave
   *   tracks parked at exactly the positions the next save parks to, so every
   *   later save collided and the set could not be reordered again. Starting
   *   above whatever is there makes the next save repair it.
   */
  const currentPosition = new Map(current.map((track) => [track.id, track.position]))
  const moving = finalPositions(orderedTrackIds).filter(
    ({ id, position }) => currentPosition.get(id) !== position
  )
  const parkBase = current.reduce(
    (highest, track) => Math.max(highest, track.position),
    MOVE_TEMP_POSITION_OFFSET
  )

  const applyPhase = async (
    writes: { id: string; position: number }[],
    event: "track.reorder_park_failed" | "track.reorder_assign_failed"
  ) => {
    let next = 0
    let failure: unknown = null

    // A fixed pool of workers pulling from one queue. On the first failure no
    // new write starts, and every write already in flight is awaited before
    // the failure is raised — so nothing is still landing against a set
    // somebody is about to be told failed to save.
    const worker = async () => {
      while (failure === null && next < writes.length) {
        const { id, position } = writes[next++]
        const { error } = await supabase
          .from("tracks")
          .update({ position })
          .eq("id", id)
          .eq("playlist_id", playlistId)

        if (error && failure === null) {
          failure = error
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(REORDER_WRITE_CONCURRENCY, writes.length) },
        worker
      )
    )

    if (failure !== null) {
      logError(event, failure, { profileId, playlistId, writes: writes.length })
      throw new Error("Unable to save the new order.")
    }
  }

  // Phase 1: park the moving tracks above everything the set holds.
  await applyPhase(
    moving.map(({ id }, index) => ({ id, position: parkBase + index + 1 })),
    "track.reorder_park_failed"
  )

  // Phase 2: each moving track to its final place in 1..n.
  await applyPhase(moving, "track.reorder_assign_failed")

  logInfo("tracks.reordered", {
    profileId,
    playlistId,
    count: orderedTrackIds.length,
    moved: moving.length,
  })
}
