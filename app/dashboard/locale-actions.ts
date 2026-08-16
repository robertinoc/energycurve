"use server"

import { toSiteLocale } from "@/lib/analysis-locale"
import { getProfileByWorkOSUserId } from "@/services/profile-service"
import { updatePreferredLocale } from "@/services/profile-service"
import { withAuth } from "@workos-inc/authkit-nextjs"

/**
 * Remembers the language a signed-in user picked.
 *
 * The cookie already handles rendering; this exists so anything the server
 * sends on its own — a purchase confirmation, a password reset — can be in the
 * language they actually use. Signed-out visitors simply don't persist
 * anything, which is correct: there is nobody to remember it for.
 *
 * Never throws. The toggle's job is switching the language; a failed write
 * shouldn't make it look broken.
 */
export async function rememberLocaleAction(value: string): Promise<void> {
  try {
    const { user } = await withAuth()

    if (!user) {
      return
    }

    const profile = await getProfileByWorkOSUserId(user.id)

    if (!profile) {
      return
    }

    await updatePreferredLocale(profile.id, toSiteLocale(value))
  } catch {
    // Swallowed on purpose — see the doc comment.
  }
}
