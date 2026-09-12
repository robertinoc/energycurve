"use server"

import { withAuth } from "@workos-inc/authkit-nextjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { buildReturnToHref } from "@/lib/auth/return-to"
import { isSuspended } from "@/lib/auth/suspension"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { logError, logWarn } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestLocale } from "@/lib/server-locale"
import {
  syncProfileFromWorkOSUser,
  updateDisplayName,
} from "@/services/profile-service"

/**
 * Rectification, GDPR Art. 16.
 *
 * The gap assessment listed this as one of four reds that are really one
 * problem: a user could export their data and do nothing else with it. The
 * concrete version of that was having to email support to fix a typo in your
 * own name.
 *
 * Name only. Email rectification changes the login identity and silently drops
 * every set shared with you — `set_collaborators` is keyed by address — so it
 * needs a product decision and a confirmation screen, not a save button. Said
 * out loud in `services/profile-service.ts` and in the gap assessment rather
 * than left as a gap someone rediscovers.
 */

const COPY = DASHBOARD_COPY.account

export interface AccountActionState {
  ok: boolean
  message: string | null
}

export const IDLE_ACCOUNT_STATE: AccountActionState = { ok: false, message: null }

/**
 * Six an hour. Generous for a field someone edits once, and low enough that the
 * WorkOS API is not reachable as an unbounded write through our session.
 */
const RATE_LIMIT = { limit: 6, windowMs: 60 * 60 * 1000 }

/**
 * Both parts optional, both capped, and trimmed before length is judged so a
 * name of spaces cannot pass as 40 characters.
 *
 * No character-class restriction on purpose: names contain apostrophes, hyphens,
 * accents and scripts this codebase has no business ruling on, and a validator
 * that rejects a real name is worse than one that accepts an odd one. Rendering
 * is React's job, and it escapes.
 */
const nameSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
})

export async function updateNameAction(
  _previous: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/account"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  // Same gate as every other write in the product: suspension has to be an
  // authorization check, not a page gate.
  if (isSuspended(profile)) {
    redirect("/account-suspended")
  }

  const locale: SiteLocale = await getRequestLocale()

  const { allowed } = await checkRateLimit({
    key: `account-name:${profile.id}`,
    limit: RATE_LIMIT.limit,
    windowMs: RATE_LIMIT.windowMs,
  })

  if (!allowed) {
    logWarn("account.name_rate_limited", { profileId: profile.id })

    return { ok: false, message: COPY.nameRateLimited[locale] }
  }

  const parsed = nameSchema.safeParse({
    firstName: formData.get("firstName")?.toString() ?? "",
    lastName: formData.get("lastName")?.toString() ?? "",
  })

  if (!parsed.success) {
    return { ok: false, message: COPY.nameInvalid[locale] }
  }

  try {
    await updateDisplayName(
      user.id,
      parsed.data.firstName || null,
      parsed.data.lastName || null
    )
  } catch (error) {
    logError("account.name_update_failed", error, { profileId: profile.id })

    return { ok: false, message: COPY.nameFailed[locale] }
  }

  // The page reads the name straight off the WorkOS session, so without this the
  // form would report success above a field still showing the old value.
  revalidatePath("/dashboard/account")

  return { ok: true, message: COPY.nameSaved[locale] }
}
