"use server"

import { withAuth } from "@workos-inc/authkit-nextjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ZodError } from "zod"

import { buildReturnToHref } from "@/lib/auth/return-to"
import type { PlaylistActionState } from "@/lib/playlists/action-state"
import { logError, logWarn } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseTracklist } from "@/lib/playlists/parse-tracklist"
import {
  createPlaylistSchema,
  createTrackInputSchema,
  createTracklistImportSchema,
} from "@/lib/playlists/schemas"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import {
  addTrack,
  createPlaylist,
  deletePlaylist,
  moveTrack,
  removeTrack,
  replaceTracks,
  updateTrack,
} from "@/services/playlist-service"

const GENERIC_ERROR_MESSAGE =
  "Something went wrong while saving. Please try again."

const RATE_LIMIT_MESSAGE =
  "Too many changes in a short time. Wait a moment and try again."

// Per-profile sliding windows: generous for humans, tight for scripts.
const RATE_LIMITS = {
  mutation: { limit: 30, windowMs: 60_000 },
  import: { limit: 10, windowMs: 60_000 },
} as const

function rateLimitFailure(
  profileId: string,
  kind: keyof typeof RATE_LIMITS
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
  return failure(RATE_LIMIT_MESSAGE)
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

export async function createPlaylistAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "mutation")

  if (rateLimited) {
    return rateLimited
  }

  const parsed = createPlaylistSchema("en").safeParse({
    name: String(formData.get("name") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    context: String(formData.get("context") ?? ""),
  })

  if (!parsed.success) {
    return failure(
      "Review the highlighted fields.",
      collectFieldErrors(parsed.error)
    )
  }

  let playlistId: string

  try {
    const playlist = await createPlaylist(profile.id, parsed.data)
    playlistId = playlist.id
  } catch (error) {
    logError("playlist.create_action_failed", error, { profileId: profile.id })
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  redirect(`/dashboard/playlists/${playlistId}`)
}

export async function deletePlaylistAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "mutation")

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(GENERIC_ERROR_MESSAGE)
  }

  try {
    await deletePlaylist(profile.id, playlistId)
  } catch (error) {
    logError("playlist.delete_action_failed", error, {
      profileId: profile.id,
      playlistId,
    })
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath("/dashboard/playlists")
  revalidatePath("/dashboard")
  return success("Playlist deleted.")
}

export async function addTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "mutation")

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(GENERIC_ERROR_MESSAGE)
  }

  const parsed = createTrackInputSchema("en").safeParse(
    readTrackFormData(formData)
  )

  if (!parsed.success) {
    return failure(
      "Review the highlighted fields.",
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
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success("Track added.")
}

export async function updateTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "mutation")

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")
  const trackId = String(formData.get("trackId") ?? "")

  if (!playlistId || !trackId) {
    return failure(GENERIC_ERROR_MESSAGE)
  }

  const parsed = createTrackInputSchema("en").safeParse(
    readTrackFormData(formData)
  )

  if (!parsed.success) {
    return failure(
      "Review the highlighted fields.",
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
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success("Track updated.")
}

export async function removeTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "mutation")

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")
  const trackId = String(formData.get("trackId") ?? "")

  if (!playlistId || !trackId) {
    return failure(GENERIC_ERROR_MESSAGE)
  }

  try {
    await removeTrack(profile.id, playlistId, trackId)
  } catch (error) {
    logError("track.remove_action_failed", error, {
      profileId: profile.id,
      playlistId,
      trackId,
    })
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success("Track removed.")
}

export async function moveTrackAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "mutation")

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")
  const trackId = String(formData.get("trackId") ?? "")
  const direction = String(formData.get("direction") ?? "")

  if (!playlistId || !trackId || (direction !== "up" && direction !== "down")) {
    return failure(GENERIC_ERROR_MESSAGE)
  }

  try {
    await moveTrack(profile.id, playlistId, trackId, direction)
  } catch (error) {
    logError("track.move_action_failed", error, {
      profileId: profile.id,
      playlistId,
      trackId,
    })
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)
  return success("Track moved.")
}

export async function importTracklistAction(
  _prevState: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const profile = await requireProfile()

  const rateLimited = rateLimitFailure(profile.id, "import")

  if (rateLimited) {
    return rateLimited
  }
  const playlistId = String(formData.get("playlistId") ?? "")

  if (!playlistId) {
    return failure(GENERIC_ERROR_MESSAGE)
  }

  const parsed = createTracklistImportSchema("en").safeParse({
    text: String(formData.get("text") ?? ""),
    format: String(formData.get("format") ?? ""),
  })

  if (!parsed.success) {
    return failure(
      "Review the highlighted fields.",
      collectFieldErrors(parsed.error)
    )
  }

  // Never trust the client-side preview: the raw text is re-parsed here.
  const { tracks, errors } = parseTracklist(parsed.data.text, parsed.data.format)

  if (tracks.length === 0) {
    return failure(
      errors.length > 0
        ? `No valid lines found — ${errors.length} line(s) could not be parsed.`
        : "No valid lines found in the pasted text."
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
    return failure(GENERIC_ERROR_MESSAGE)
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  const skippedSuffix =
    errors.length > 0 ? ` ${errors.length} line(s) were skipped.` : ""

  return success(`Imported ${importedCount} track(s).${skippedSuffix}`)
}
