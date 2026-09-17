"use server"

import { withAuth } from "@workos-inc/authkit-nextjs"

import { isKeyNotation } from "@/lib/music/camelot"
import {
  getProfileByWorkOSUserId,
  updateKeyNotation,
} from "@/services/profile-service"

/**
 * Remembers which key notation this DJ reads — Camelot, Open Key, musical, or
 * whatever their library already says.
 *
 * The switcher updates the column immediately and calls this without waiting,
 * so a slow or failed write costs the preference on the next page load and
 * nothing else. Same stance as `rememberLocaleAction`, and the same reason:
 * this is a display choice, not a save.
 */
export async function rememberKeyNotationAction(value: string): Promise<void> {
  try {
    if (!isKeyNotation(value)) {
      return
    }

    const { user } = await withAuth()

    if (!user) {
      return
    }

    const profile = await getProfileByWorkOSUserId(user.id)

    if (!profile) {
      return
    }

    await updateKeyNotation(profile.id, value)
  } catch {
    // Swallowed on purpose — see the doc comment.
  }
}
