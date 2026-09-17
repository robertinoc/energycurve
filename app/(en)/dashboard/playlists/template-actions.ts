"use server"

import { revalidatePath } from "next/cache"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import {
  anchorsFromCurve,
  normaliseTemplateName,
} from "@/lib/playlists/curve-template"
import { can } from "@/lib/product/capabilities"
import { getProfileBilling } from "@/services/billing-service"
import { createCurveTemplate } from "@/services/curve-template-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { getProfileByWorkOSUserId } from "@/services/profile-service"

export interface TemplateResult {
  ok: boolean
  message?: string
}

/**
 * Saves the shape of an existing set as a reusable target.
 *
 * Reads the anchors off the set's real resolved curve rather than taking them
 * from the client: the browser has no business deciding what shape the server
 * will later score against, and the curve is already computed here anyway.
 */
export async function saveCurveTemplateAction(
  playlistId: string,
  rawName: string
): Promise<TemplateResult> {
  const { user } = await withAuth()

  if (!user) {
    return { ok: false }
  }

  const profile = await getProfileByWorkOSUserId(user.id)

  if (!profile) {
    return { ok: false }
  }

  const billing = await getProfileBilling(profile.id)

  if (!can(billing.plan, billing.status, "custom_curve_templates")) {
    return { ok: false }
  }

  const name = normaliseTemplateName(rawName)

  if (!name) {
    return { ok: false }
  }

  const playlist = await getOwnedPlaylistWithTracks(profile.id, playlistId)

  if (!playlist || playlist.tracks.length === 0) {
    return { ok: false }
  }

  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )
  const anchors = anchorsFromCurve(energies.map((entry) => entry.score))

  if (anchors.length < 2) {
    return { ok: false }
  }

  const created = await createCurveTemplate(profile.id, name, anchors)

  if (!created) {
    return { ok: false }
  }

  revalidatePath(`/dashboard/playlists/${playlistId}`)

  return { ok: true }
}
