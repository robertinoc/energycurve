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
import {
  detectGenres,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import {
  createPlaylistSchema,
  createTrackInputSchema,
  createTracklistImportSchema,
} from "@/lib/playlists/schemas"
import {
  SET_CONTEXTS,
  SUPPORTED_GENRES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import {
  addTrack,
  createPlaylist,
  deletePlaylist,
  moveTrack,
  removeTrack,
  reorderTracks,
  replaceTracks,
  updateTrack,
} from "@/services/playlist-service"
import {
  createUserContext,
  createUserGenre,
  CUSTOM_TAXONOMY_LIMIT,
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

export async function createPlaylistAction(
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

  let playlistId: string

  try {
    const playlist = await createPlaylist(profile.id, {
      ...parsed.data,
      customContextId: contextChoice?.customId ?? null,
      customGenreId: genreChoice?.customId ?? null,
    })
    playlistId = playlist.id
  } catch (error) {
    logError("playlist.create_action_failed", error, { profileId: profile.id })
    return failure(ACTION_COPY.genericError[locale])
  }

  captureServerEvent(profile.id, "playlist_created", {
    playlistId,
    genre: parsed.data.genre,
    context: parsed.data.context,
  })

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  redirect(`/dashboard/playlists/${playlistId}`)
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

export async function importTracklistAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()
  const locale = await getRequestLocale()

  const rateLimited = rateLimitFailure(profile.id, "import", locale)

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(ACTION_COPY.genericError[locale])
  }

  const parsed = createTracklistImportSchema(locale).safeParse({
    text: String(formData.get("text") ?? ""),
    format: String(formData.get("format") ?? ""),
  })

  if (!parsed.success) {
    return failure(
      ACTION_COPY.reviewFields[locale],
      collectFieldErrors(parsed.error)
    )
  }

  // Never trust the client-side preview: the raw text is re-parsed here.
  const { tracks, errors } = parseTracklist(parsed.data.text, parsed.data.format)

  if (tracks.length === 0) {
    return failure(
      errors.length > 0
        ? formatTemplate(ACTION_COPY.noValidLinesParsed[locale], {
            count: errors.length,
          })
        : ACTION_COPY.noValidLines[locale]
    )
  }

  let importedCount = 0

  try {
    importedCount = await replaceTracks(
      profile.id,
      playlistId,
      tracks.map((track) => ({
        artist: track.artist,
        name: track.name,
        bpm: track.bpm,
        energyScore: null,
      }))
    )
  } catch (error) {
    logError("tracks.import_action_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return failure(ACTION_COPY.genericError[locale])
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  const skippedSuffix =
    errors.length > 0
      ? formatTemplate(ACTION_COPY.importSkippedSuffix[locale], {
          count: errors.length,
        })
      : ""

  return success(
    formatTemplate(ACTION_COPY.importedTracks[locale], {
      count: importedCount,
      skipped: skippedSuffix,
    })
  )
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
              max: CUSTOM_TAXONOMY_LIMIT,
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
