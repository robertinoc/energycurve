"use server"

import { withAuth } from "@workos-inc/authkit-nextjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ZodError } from "zod"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { getRequestLocale } from "@/lib/server-locale"
import type {
  PlaylistActionState,
  TaxonomyActionState,
} from "@/lib/playlists/action-state"
import { logError, logWarn } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseTracklist } from "@/lib/playlists/parse-tracklist"
import { decodeUploadedText } from "@/lib/playlists/decode-upload"
import type { ImportedTrack } from "@/lib/playlists/imported-track"
import {
  detectGenres,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import {
  createAudioImportSchema,
  createPlaylistSchema,
  createTrackInputSchema,
  createTracklistImportSchema,
  updatePlaylistDetailsSchema,
} from "@/lib/playlists/schemas"
import {
  SET_CONTEXTS,
  SUPPORTED_GENRES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { can } from "@/lib/product/capabilities"
import { restorableOrder } from "@/lib/playlists/versions"
import { getProfileBilling } from "@/services/billing-service"
import {
  addSuggestion,
  getLockState,
  inviteCollaborator,
  releaseEditLock,
  removeCollaborator,
  resolveSuggestion,
  takeEditLock,
  touchEditLock,
} from "@/services/collaboration-service"
import { mayWrite } from "@/lib/playlists/edit-lock"
import {
  captureVersion,
  compareWithCurrent,
  getVersion,
  type VersionComparison,
} from "@/services/version-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import {
  PlaylistLimitError,
  addTrack,
  createPlaylist,
  deletePlaylist,
  getOwnedPlaylistWithTracks,
  moveTrack,
  removeTrack,
  reorderTracks,
  reorderTracksAsLockHolder,
  replaceTracks,
  updatePlaylistDetails,
  updateTrack,
} from "@/services/playlist-service"
import {
  createUserContext,
  createUserGenre,
  deleteUserContext,
  deleteUserGenre,
  getUserContextById,
  getUserGenreById,
} from "@/services/taxonomy-service"

// Action messages come from the shared dashboard copy table, in the
// requester's language (cookie via getRequestLocale).
const ACTION_COPY = DASHBOARD_COPY.actions

// Per-profile sliding windows: generous for humans, tight for scripts.
const RATE_LIMITS = {
  mutation: { limit: 30, windowMs: 60_000 },
  import: { limit: 10, windowMs: 60_000 },
} as const

function rateLimitFailure(
  profileId: string,
  kind: keyof typeof RATE_LIMITS,
  locale: SiteLocale
): PlaylistActionState | null {
  const config = RATE_LIMITS[kind]
  const { allowed } = checkRateLimit({
    key: `playlist-${kind}:${profileId}`,
    limit: config.limit,
    windowMs: config.windowMs,
  })

  if (allowed) {
    return null
  }

  logWarn("playlist.action_rate_limited", { profileId, kind })
  return failure(ACTION_COPY.rateLimited[locale])
}

async function requireProfile() {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/playlists"))
  }

  return syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })
}

function collectFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form")

    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message
    }
  }

  return fieldErrors
}

function failure(
  message: string,
  fieldErrors: Record<string, string> | null = null
): PlaylistActionState {
  return { ok: false, message, fieldErrors }
}

function success(message: string): PlaylistActionState {
  return { ok: true, message, fieldErrors: null }
}

function readTrackFormData(formData: FormData) {
  return {
    artist: String(formData.get("artist") ?? ""),
    name: String(formData.get("name") ?? ""),
    bpm: formData.get("bpm"),
    energyScore: formData.get("energyScore"),
    musicalKey: String(formData.get("musicalKey") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  }
}

const CUSTOM_VALUE_PREFIX = "custom:"

/**
 * Resolves a context form value that may be a base enum or "custom:<id>".
 * Customs are ownership-checked and map to their base ("behaves like") for
 * the engine, keeping the display link. Returns null when invalid.
 */
async function resolveContextChoice(
  profileId: string,
  raw: string
): Promise<{ base: PlaylistContext; customId: string | null } | null> {
  if (raw.startsWith(CUSTOM_VALUE_PREFIX)) {
    const custom = await getUserContextById(
      profileId,
      raw.slice(CUSTOM_VALUE_PREFIX.length)
    )

    return custom ? { base: custom.behaves_like, customId: custom.id } : null
  }

  return (SET_CONTEXTS as readonly string[]).includes(raw)
    ? { base: raw as PlaylistContext, customId: null }
    : null
}

async function resolveGenreChoice(
  profileId: string,
  raw: string
): Promise<{ base: SupportedGenre; customId: string | null } | null> {
  if (raw.startsWith(CUSTOM_VALUE_PREFIX)) {
    const custom = await getUserGenreById(
      profileId,
      raw.slice(CUSTOM_VALUE_PREFIX.length)
    )

    return custom ? { base: custom.behaves_like, customId: custom.id } : null
  }

  return (SUPPORTED_GENRES as readonly string[]).includes(raw)
    ? { base: raw as SupportedGenre, customId: null }
    : null
}

/**
 * The "by hand" entry-point tab: creates a playlist and, when the user pasted
 * a tracklist, seeds it in the same submit. The pasted text is re-parsed
 * server-side (never trust the client preview), mirroring importTracklistAction.
 */
/**
 * Turns a plan-cap throw into copy, or null when the error is something else.
 *
 * The cap is enforced in `createPlaylist` so no creation path can skip it; each
 * path still has to translate the refusal, and a shared helper keeps the three
 * from drifting into three different messages.
 */
function playlistLimitMessage(
  error: unknown,
  locale: SiteLocale
): string | null {
  return error instanceof PlaylistLimitError
    ? formatTemplate(ACTION_COPY.playlistLimit[locale], { max: error.limit })
    : null
}

export async function createPlaylistWithTracksAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }

  const contextChoice = await resolveContextChoice(
    profile.id,
    String(formData.get("context") ?? "")
  )
  const genreChoice = await resolveGenreChoice(
    profile.id,
    String(formData.get("genre") ?? "")
  )

  const parsed = createPlaylistSchema(locale).safeParse({
    name: String(formData.get("name") ?? ""),
    genre: genreChoice?.base ?? "",
    context: contextChoice?.base ?? "",
  })

  if (!parsed.success) {
    return failure(
      ACTION_COPY.reviewFields[locale],
      collectFieldErrors(parsed.error)
    )
  }

  // Optional pasted tracklist. Empty text = create an empty playlist.
  const text = String(formData.get("text") ?? "").trim()
  let pastedTracks: ReturnType<typeof parseTracklist>["tracks"] = []

  if (text) {
    const tracklistParsed = createTracklistImportSchema(locale).safeParse({
      text,
      format: String(formData.get("format") ?? ""),
    })

    if (!tracklistParsed.success) {
      return failure(
        ACTION_COPY.reviewFields[locale],
        collectFieldErrors(tracklistParsed.error)
      )
    }

    const { tracks, errors } = parseTracklist(
      tracklistParsed.data.text,
      tracklistParsed.data.format
    )

    if (tracks.length === 0) {
      return failure(
        errors.length > 0
          ? formatTemplate(ACTION_COPY.noValidLinesParsed[locale], {
              count: errors.length,
            })
          : ACTION_COPY.noValidLines[locale]
      )
    }

    pastedTracks = tracks
  }

  let playlistId: string

  try {
    const playlist = await createPlaylist(profile.id, {
      ...parsed.data,
      customContextId: contextChoice?.customId ?? null,
      customGenreId: genreChoice?.customId ?? null,
    })
    playlistId = playlist.id

    if (pastedTracks.length > 0) {
      await replaceTracks(
        profile.id,
        playlistId,
        pastedTracks.map((track) => ({
          artist: track.artist,
          name: track.name,
          bpm: track.bpm,
          energyScore: null,
        }))
      )
    }
  } catch (error) {
    const limited = playlistLimitMessage(error, locale)
    if (limited) {
      return failure(limited)
    }

    logError("playlist.create_with_tracks_failed", error, {
      profileId: profile.id,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  captureServerEvent(profile.id, "playlist_created", {
    playlistId,
    via: "manual",
    trackCount: pastedTracks.length,
    genre: parsed.data.genre,
    context: parsed.data.context,
  })

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  redirect(`/dashboard/playlists/${playlistId}`)
}

/** Rename + optional description, from the detail-page header editor. */
export async function updatePlaylistDetailsAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }

  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(ACTION_COPY.genericError[locale])
  }

  const parsed = updatePlaylistDetailsSchema(locale).safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    // `has`, not `get`: a field the submitted form never carried stays absent, so
    // the schema and service leave the stored value untouched instead of clearing
    // it. Coercing a missing field to "" would read as "the user cleared this".
    ...(formData.has("venue")
      ? { venue: String(formData.get("venue") ?? "") }
      : {}),
    ...(formData.has("slotStart")
      ? { slotStart: String(formData.get("slotStart") ?? "") }
      : {}),
    ...(formData.has("slotEnd")
      ? { slotEnd: String(formData.get("slotEnd") ?? "") }
      : {}),
    ...(formData.has("targetShape")
      ? {
          targetShape: String(formData.get("targetShape") ?? ""),
          targetTemplateId: String(formData.get("targetShape") ?? ""),
        }
      : {}),
  })

  if (!parsed.success) {
    return failure(
      ACTION_COPY.reviewFields[locale],
      collectFieldErrors(parsed.error)
    )
  }

  try {
    // Mapped explicitly rather than spread: the schema speaks the form's language
    // (clock strings named slotStart) and the service speaks the column's
    // (minutes named slotStartMinutes). Spreading would silently drop them.
    await updatePlaylistDetails(profile.id, playlistId, {
      name: parsed.data.name,
      description: parsed.data.description,
      slotStartMinutes: parsed.data.slotStart,
      slotEndMinutes: parsed.data.slotEnd,
      targetShape: parsed.data.targetShape,
      targetTemplateId: parsed.data.targetTemplateId,
    })
  } catch (error) {
    logError("playlist.update_details_action_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  return success(ACTION_COPY.detailsSaved[locale])
}

export async function deletePlaylistAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(ACTION_COPY.genericError[locale])
  }

  try {
    await deletePlaylist(profile.id, playlistId)
  } catch (error) {
    logError("playlist.delete_action_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  return success(ACTION_COPY.playlistDeleted[locale])
}

export async function addTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(ACTION_COPY.genericError[locale])
  }

  const parsed = createTrackInputSchema(locale).safeParse(
    readTrackFormData(formData)
  )

  if (!parsed.success) {
    return failure(
      ACTION_COPY.reviewFields[locale],
      collectFieldErrors(parsed.error)
    )
  }

  try {
    await addTrack(profile.id, playlistId, parsed.data)
  } catch (error) {
    logError("track.add_action_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success(ACTION_COPY.trackAdded[locale])
}

export async function updateTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")
  const trackId = String(formData.get("trackId") ?? "")

  if (!playlistId || !trackId) {
    return failure(ACTION_COPY.genericError[locale])
  }

  const parsed = createTrackInputSchema(locale).safeParse(
    readTrackFormData(formData)
  )

  if (!parsed.success) {
    return failure(
      ACTION_COPY.reviewFields[locale],
      collectFieldErrors(parsed.error)
    )
  }

  try {
    await updateTrack(profile.id, playlistId, trackId, parsed.data)
  } catch (error) {
    logError("track.update_action_failed", error, {
      profileId: profile.id,
      playlistId,
      trackId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success(ACTION_COPY.trackUpdated[locale])
}

export async function removeTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")
  const trackId = String(formData.get("trackId") ?? "")

  if (!playlistId || !trackId) {
    return failure(ACTION_COPY.genericError[locale])
  }

  try {
    await removeTrack(profile.id, playlistId, trackId)
  } catch (error) {
    logError("track.remove_action_failed", error, {
      profileId: profile.id,
      playlistId,
      trackId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success(ACTION_COPY.trackRemoved[locale])
}

export async function moveTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")
  const trackId = String(formData.get("trackId") ?? "")
  const direction = String(formData.get("direction") ?? "")

  if (!playlistId || !trackId || (direction !== "up" && direction !== "down")) {
    return failure(ACTION_COPY.genericError[locale])
  }

  try {
    await moveTrack(profile.id, playlistId, trackId, direction)
  } catch (error) {
    logError("track.move_action_failed", error, {
      profileId: profile.id,
      playlistId,
      trackId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success(ACTION_COPY.trackMoved[locale])
}
const IMPORT_MAX_FILE_BYTES = 12 * 1024 * 1024 // 12 MB — full collections can be large
const IMPORT_MAX_TRACKS = 500

export async function importPlaylistAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "import", locale)

  if (rateLimited) {
    return rateLimited
  }

  const file = formData.get("file")
  const contextRaw = String(formData.get("context") ?? "")
  const genreRaw = String(formData.get("genre") ?? "") // "" = auto-detect
  const nameOverride = String(formData.get("name") ?? "").trim()

  if (!(file instanceof File) || file.size === 0) {
    return failure(ACTION_COPY.chooseFile[locale])
  }

  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return failure(ACTION_COPY.fileTooLarge[locale])
  }

  const contextChoice = await resolveContextChoice(profile.id, contextRaw)

  if (!contextChoice) {
    return failure(ACTION_COPY.pickContext[locale])
  }

  let parsed
  try {
    // Decode by BOM: Rekordbox' .txt export is UTF-16, everything else UTF-8.
    parsed = parseImport(decodeUploadedText(await file.arrayBuffer()))
  } catch (error) {
    if (error instanceof UnsupportedImportError) {
      return failure(error.message)
    }
    logError("playlist.import_parse_failed", error, { profileId: profile.id })
    return failure(ACTION_COPY.cantReadFile[locale])
  }

  const { dominant } = detectGenres(parsed.tracks)
  // Explicit choice (base or custom) wins; otherwise the detected dominant
  // genre; otherwise a safe default so the playlist is analyzable.
  const genreChoice =
    genreRaw === "" ? null : await resolveGenreChoice(profile.id, genreRaw)
  const genre: SupportedGenre = genreChoice?.base ?? dominant ?? "house"

  // txt / m3u8 exports carry no embedded playlist name — fall back to the
  // file's own name before the generic templated default.
  const fileBaseName = file.name.replace(/\.[^.]+$/, "").trim()
  const name =
    nameOverride ||
    parsed.playlistName ||
    fileBaseName ||
    formatTemplate(ACTION_COPY.importedSetName[locale], {
      source: parsed.source === "traktor" ? "Traktor" : "Rekordbox",
    })

  const tracks = parsed.tracks.slice(0, IMPORT_MAX_TRACKS)
  const skipped = parsed.tracks.length - tracks.length

  let playlistId: string

  try {
    const playlist = await createPlaylist(profile.id, {
      name,
      genre,
      context: contextChoice.base,
      importSource: parsed.source,
      customContextId: contextChoice.customId,
      customGenreId: genreChoice?.customId ?? null,
    })
    playlistId = playlist.id

    await replaceTracks(
      profile.id,
      playlistId,
      tracks.map((track) => ({
        artist: track.artist || "Unknown artist",
        name: track.name || "Untitled",
        bpm: track.bpm,
        energyScore: track.energy,
        sourceUri: track.sourceUri,
        musicalKey: track.key,
        genre: track.genre,
        comment: track.comment,
        durationSeconds: track.durationSeconds,
        perceivedDb: track.perceivedDb ?? null,
      }))
    )
  } catch (error) {
    const limited = playlistLimitMessage(error, locale)
    if (limited) {
      return failure(limited)
    }

    logError("playlist.import_failed", error, {
      profileId: profile.id,
      source: parsed.source,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  captureServerEvent(profile.id, "playlist_created", {
    via: "import",
    source: parsed.source,
    trackCount: tracks.length,
    genre,
    context: contextChoice.base,
  })

  if (skipped > 0) {
    logWarn("playlist.import_truncated", {
      profileId: profile.id,
      total: parsed.tracks.length,
      kept: tracks.length,
    })
  }

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  redirect(`/dashboard/playlists/${playlistId}`)
}

export interface AudioImportResult {
  ok: boolean
  message?: string
  playlistId?: string
}

/**
 * Creates a playlist from client-parsed audio-file tags ("from your music
 * files"). The browser reads each file's embedded tags with music-metadata
 * and sends ONLY the parsed metadata — audio bytes never reach the server.
 * That JSON is the trust boundary: createAudioImportSchema sanitizes strings
 * and coerces out-of-range numbers to null before anything is persisted.
 * Direct-call action (like reorderTracksAction); returns the playlist id so
 * the preview UI can surface errors inline and navigate on success.
 */
export async function importAudioFilesAction(
  payload: unknown
): Promise<AudioImportResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "import", locale)

  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  const parsed = createAudioImportSchema(locale).safeParse(payload)

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? ACTION_COPY.genericError[locale],
    }
  }

  const contextChoice = await resolveContextChoice(
    profile.id,
    parsed.data.context
  )

  if (!contextChoice) {
    return { ok: false, message: ACTION_COPY.pickContext[locale] }
  }

  // Shape the validated tracks as ImportedTrack so detectGenres and the
  // replaceTracks mapping below mirror the file-export import path.
  const tracks: ImportedTrack[] = parsed.data.tracks.map((track) => ({
    artist: track.artist,
    name: track.name,
    bpm: track.bpm,
    key: track.key,
    genre: track.genre,
    energy: track.energy,
    sourceUri: track.sourceUri,
    comment: track.comment,
    durationSeconds: track.durationSeconds,
    audioFeatures: track.audioFeatures,
  }))

  const { dominant } = detectGenres(tracks)
  const genreChoice =
    parsed.data.genre === ""
      ? null
      : await resolveGenreChoice(profile.id, parsed.data.genre)
  const genre: SupportedGenre = genreChoice?.base ?? dominant ?? "house"

  const name =
    parsed.data.name ||
    // "Imported audio set" / "Set importado de audio"
    formatTemplate(ACTION_COPY.importedSetName[locale], { source: "audio" })

  let playlistId: string

  try {
    const playlist = await createPlaylist(profile.id, {
      name,
      genre,
      context: contextChoice.base,
      importSource: "files",
      customContextId: contextChoice.customId,
      customGenreId: genreChoice?.customId ?? null,
    })
    playlistId = playlist.id

    await replaceTracks(
      profile.id,
      playlistId,
      tracks.map((track) => ({
        artist: track.artist || "Unknown artist",
        name: track.name || "Untitled",
        bpm: track.bpm,
        energyScore: track.energy,
        sourceUri: track.sourceUri,
        musicalKey: track.key,
        genre: track.genre,
        comment: track.comment,
        durationSeconds: track.durationSeconds,
        perceivedDb: null,
        audioFeatures: track.audioFeatures ?? null,
      }))
    )
  } catch (error) {
    const limited = playlistLimitMessage(error, locale)
    if (limited) {
      return { ok: false, message: limited }
    }

    logError("playlist.audio_import_failed", error, {
      profileId: profile.id,
      trackCount: tracks.length,
    })
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  captureServerEvent(profile.id, "playlist_created", {
    via: "files",
    trackCount: tracks.length,
    genre,
    context: contextChoice.base,
  })

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  return { ok: true, playlistId }
}

/**
 * Records the order the set is in right now as "what I actually played".
 *
 * Recorded even when the order is identical to the last version, unlike an
 * ordinary capture: playing exactly what you planned is the common case, and it
 * is precisely the fact worth writing down.
 */
export async function markAsPlayedAction(
  playlistId: string
): Promise<ReorderResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)
  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  const billing = await getProfileBilling(profile.id)

  if (!can(billing.plan, billing.status, "planned_vs_played")) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const playlist = await getOwnedPlaylistWithTracks(profile.id, playlistId)

  if (!playlist || playlist.tracks.length === 0) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  await captureVersion(
    playlistId,
    playlist.tracks,
    playlist.genre,
    playlist.context,
    "played"
  )

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}

export interface CompareResult {
  ok: boolean
  message?: string
  comparison?: VersionComparison
}

/**
 * Compares a stored version against the order the set is in now.
 *
 * Fetched on demand rather than computed for every version when the page renders:
 * a playlist keeps up to twenty versions and a reader opens at most one or two.
 */
export async function compareVersionAction(
  playlistId: string,
  versionId: string
): Promise<CompareResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()
  const billing = await getProfileBilling(profile.id)

  if (!can(billing.plan, billing.status, "version_history")) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const playlist = await getOwnedPlaylistWithTracks(profile.id, playlistId)

  if (!playlist) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const comparison = await compareWithCurrent(
    playlistId,
    versionId,
    playlist.tracks,
    playlist.genre,
    playlist.context
  )

  if (!comparison) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  return { ok: true, comparison }
}

/**
 * Puts the playlist back into a previous order.
 *
 * Goes through `reorderTracks`, which captures the order being replaced first, so
 * restoring is itself undoable — the DJ can always come back. That's also why this
 * is safe to offer at all.
 */
export async function restoreVersionAction(
  playlistId: string,
  versionId: string
): Promise<ReorderResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)
  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  const billing = await getProfileBilling(profile.id)

  if (!can(billing.plan, billing.status, "version_history")) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const playlist = await getOwnedPlaylistWithTracks(profile.id, playlistId)

  if (!playlist) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const version = await getVersion(playlistId, versionId)

  if (!version) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const order = restorableOrder(
    version.tracks,
    playlist.tracks.map((track) => track.id)
  )

  // Null means the set has gained a track this version says nothing about, so
  // applying it would drop that track out of the playlist. Told plainly rather
  // than silently doing something destructive.
  if (!order) {
    return { ok: false, message: ACTION_COPY.versionStale[locale] }
  }

  try {
    await reorderTracks(profile.id, playlistId, order)
  } catch (error) {
    logError("playlist.restore_version_failed", error, {
      profileId: profile.id,
      playlistId,
      versionId,
    })
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}

export interface ReorderResult {
  ok: boolean
  message?: string
}

/**
 * Persists a manual set reorder. Called directly (not through a form) by the
 * tracklist's Save button with the full ordered track-id list.
 */
export async function reorderTracksAction(
  playlistId: string,
  orderedTrackIds: string[]
): Promise<ReorderResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)
  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  if (
    !playlistId ||
    !Array.isArray(orderedTrackIds) ||
    orderedTrackIds.length === 0
  ) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  try {
    await reorderTracks(profile.id, playlistId, orderedTrackIds)
  } catch (error) {
    logError("playlist.reorder_action_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  revalidatePath("/dashboard")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Custom contexts & genres ("behaves like"): user-owned labels mapped to a
// base context/genre. The playlist stores the base enum (the engine never
// sees customs) plus a display-only link to the custom entry.
// ---------------------------------------------------------------------------

const TAXONOMY_COPY = DASHBOARD_COPY.taxonomy

export async function createCustomTaxonomyAction(
  _prevState: TaxonomyActionState,
  formData: FormData
): Promise<TaxonomyActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited) {
    return { ok: false, message: rateLimited.message, createdId: null }
  }

  const kind = String(formData.get("kind") ?? "")
  const name = String(formData.get("name") ?? "")
  const behavesLike = String(formData.get("behavesLike") ?? "")

  if (kind !== "context" && kind !== "genre") {
    return {
      ok: false,
      message: ACTION_COPY.genericError[locale],
      createdId: null,
    }
  }

  try {
    const result =
      kind === "context"
        ? await createUserContext(profile.id, name, behavesLike)
        : await createUserGenre(profile.id, name, behavesLike)

    if (result.validationError) {
      const message =
        result.validationError === "limit_reached"
          ? formatTemplate(TAXONOMY_COPY.limitReached[locale], {
              max: result.limit,
            })
          : result.validationError === "duplicate_name"
            ? TAXONOMY_COPY.duplicateName[locale]
            : TAXONOMY_COPY.nameInvalid[locale]

      return { ok: false, message, createdId: null }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/playlists")

    return { ok: true, message: null, createdId: result.entry?.id ?? null }
  } catch (error) {
    logError("taxonomy.create_action_failed", error, {
      profileId: profile.id,
      kind,
    })
    return {
      ok: false,
      message: ACTION_COPY.genericError[locale],
      createdId: null,
    }
  }
}

/** Direct-call action (no form): remove a custom entry; playlists fall back to the base label. */
export async function deleteCustomTaxonomyAction(
  kind: "context" | "genre",
  id: string
): Promise<{ ok: boolean }> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)

  if (rateLimited || !id) {
    return { ok: false }
  }

  try {
    if (kind === "context") {
      await deleteUserContext(profile.id, id)
    } else {
      await deleteUserGenre(profile.id, id)
    }
  } catch (error) {
    logError("taxonomy.delete_action_failed", error, {
      profileId: profile.id,
      kind,
      id,
    })
    return { ok: false }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/playlists")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Shared sets (B2B/B3B, first slice): invite, revoke, suggest, resolve.
// ---------------------------------------------------------------------------

export interface CollaborationResult {
  ok: boolean
  message?: string
}

/**
 * Shares a set with another DJ by email.
 *
 * The entitlement check lives in the service, not here — every reason this can
 * fail is something the person typing needs to read, so the action's job is
 * turning a reason code into their language.
 */
export async function inviteCollaboratorAction(
  playlistId: string,
  email: string
): Promise<CollaborationResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)
  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  const result = await inviteCollaborator(
    profile.id,
    profile.email,
    playlistId,
    email
  )

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "bad_email"
          ? ACTION_COPY.inviteBadEmail[locale]
          : result.reason === "self"
            ? ACTION_COPY.inviteSelf[locale]
            : result.reason === "not_entitled"
              ? ACTION_COPY.inviteNotEntitled[locale]
              : ACTION_COPY.genericError[locale],
    }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}

export async function removeCollaboratorAction(
  playlistId: string,
  collaboratorId: string
): Promise<CollaborationResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  if (!(await removeCollaborator(profile.id, playlistId, collaboratorId))) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}

/**
 * Leaves a suggestion on a set.
 *
 * Revalidates both the owner's page and the collaborator's view, because the two
 * sides of one conversation are two routes and whichever one you're not on is the
 * one that would go stale.
 */
export async function addSuggestionAction(
  playlistId: string,
  body: string,
  trackId: string | null
): Promise<CollaborationResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)
  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  const result = await addSuggestion(
    profile.id,
    profile.email,
    playlistId,
    body,
    trackId
  )

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "bad_body"
          ? ACTION_COPY.suggestionEmpty[locale]
          : ACTION_COPY.genericError[locale],
    }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  revalidatePath(`/dashboard/shared/${playlistId}`)

  return { ok: true }
}

export async function resolveSuggestionAction(
  playlistId: string,
  suggestionId: string
): Promise<CollaborationResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  if (!(await resolveSuggestion(profile.id, playlistId, suggestionId))) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  revalidatePath(`/dashboard/shared/${playlistId}`)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Turn-based editing on a shared set.
// ---------------------------------------------------------------------------

export interface TurnResult {
  ok: boolean
  message?: string
}

/** Claims the pen on a shared set. */
export async function takeEditTurnAction(
  playlistId: string
): Promise<TurnResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const result = await takeEditLock(profile.id, profile.email, playlistId)

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "held"
          ? ACTION_COPY.turnHeld[locale]
          : ACTION_COPY.genericError[locale],
    }
  }

  revalidatePath(`/dashboard/shared/${playlistId}`)
  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}

/** Hands it back. */
export async function releaseEditTurnAction(
  playlistId: string
): Promise<TurnResult> {
  const profile = await requireProfile()

  await releaseEditLock(profile.id, playlistId)

  revalidatePath(`/dashboard/shared/${playlistId}`)
  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}

/**
 * Reorders a shared set, if the caller holds the turn.
 *
 * A separate action from `reorderTracksAction` rather than a branch inside it.
 * That one is the owner's path and checks ownership; folding two authorisation
 * models into one function is how the weaker of the two ends up applying to both.
 *
 * The lock is re-checked here rather than trusted from the render that drew the
 * buttons: a page open since before the turn expired would otherwise write on a
 * turn it no longer has.
 */
export async function reorderSharedTracksAction(
  playlistId: string,
  orderedTrackIds: string[]
): Promise<ReorderResult> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "mutation", locale)
  if (rateLimited) {
    return { ok: false, message: rateLimited.message ?? undefined }
  }

  if (!Array.isArray(orderedTrackIds) || orderedTrackIds.length === 0) {
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  const state = await getLockState(profile.id, playlistId)

  if (!mayWrite(state)) {
    return { ok: false, message: ACTION_COPY.turnLost[locale] }
  }

  try {
    await reorderTracksAsLockHolder(profile.id, playlistId, orderedTrackIds)
  } catch (error) {
    logError("playlist.shared_reorder_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return { ok: false, message: ACTION_COPY.genericError[locale] }
  }

  // Renewed after a successful write, so an active editor never hits the expiry.
  await touchEditLock(profile.id, playlistId)

  revalidatePath(`/dashboard/shared/${playlistId}`)
  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}
