import "server-only"

import { getWorkOS } from "@workos-inc/authkit-nextjs"

import { toSiteLocale } from "@/lib/analysis-locale"
import {
  DEFAULT_KEY_NOTATION,
  isKeyNotation,
  type KeyNotation,
} from "@/lib/music/camelot"
import { logError, logInfo } from "@/lib/observability/logger"
import type { SiteLocale } from "@/lib/content/site-copy"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import type { Profile, WorkOSUserIdentity } from "@/types/domain"

export async function syncProfileFromWorkOSUser(
  user: WorkOSUserIdentity
): Promise<Profile> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        workos_user_id: user.id,
        email: user.email,
      },
      {
        onConflict: "workos_user_id",
      }
    )
    .select()
    .single()

  if (error || !data) {
    throw new Error("Unable to synchronize the authenticated profile.")
  }

  return data
}

export async function getProfileByWorkOSUserId(
  workosUserId: string
): Promise<Profile | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("workos_user_id", workosUserId)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to load the profile for this account.")
  }

  return data
}

/**
 * Records the language a user picked, so anything sent *to* them later can be
 * in it.
 *
 * Written only when they actually choose — never inferred from a request — and
 * failures are swallowed. Losing the preference costs an email in the wrong
 * language; letting the write fail loudly would cost the user their language
 * toggle, which is the worse trade.
 */
export async function updatePreferredLocale(
  profileId: string,
  locale: SiteLocale
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_locale: locale })
    .eq("id", profileId)

  if (error) {
    logError("profile.locale_update_failed", error, { profileId })
  }
}

/**
 * The language to send this person things in.
 *
 * Falls back to English when they never chose, which is also what the UI does
 * for them — so the email matches the product they actually saw rather than a
 * guess about who they are.
 */
export async function getProfileLocale(
  profileId: string
): Promise<SiteLocale> {
  const supabase = getSupabaseAdminClient()

  const { data } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", profileId)
    .maybeSingle()

  return toSiteLocale(data?.preferred_locale ?? undefined)
}

/**
 * The language for someone identified only by email — the password-reset case,
 * where by definition there is no session.
 *
 * An unknown address resolves to English rather than erroring, which is also
 * the only safe answer: behaving differently for known and unknown emails would
 * turn a reset form into a way to probe which accounts exist.
 */
export async function getLocaleByEmail(email: string): Promise<SiteLocale> {
  const supabase = getSupabaseAdminClient()

  const { data } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("email", email.toLowerCase())
    .maybeSingle()

  return toSiteLocale(data?.preferred_locale ?? undefined)
}

/**
 * Which key notation this DJ reads.
 *
 * A display preference, written only when they pick one from the tracklist
 * header. Failures are swallowed for the same reason `updatePreferredLocale`
 * swallows its own: the switcher's job is to change what the column shows, and
 * making it look broken because a write failed is the worse outcome. Their
 * choice already took effect on screen before this ran.
 */
export async function updateKeyNotation(
  profileId: string,
  notation: KeyNotation
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({ key_notation: notation })
    .eq("id", profileId)

  if (error) {
    logError("profile.key_notation_update_failed", error, { profileId })
  }
}

/**
 * The notation to render keys in for this DJ.
 *
 * Camelot when they never chose, which is what the product showed before the
 * preference existed — so nobody's tracklist changes underneath them on the
 * day this ships.
 */
export async function getProfileKeyNotation(
  profileId: string
): Promise<KeyNotation> {
  const supabase = getSupabaseAdminClient()

  const { data } = await supabase
    .from("profiles")
    .select("key_notation")
    .eq("id", profileId)
    .maybeSingle()

  return isKeyNotation(data?.key_notation) ? data.key_notation : DEFAULT_KEY_NOTATION
}

/**
 * Rectification (GDPR Art. 16), for the one field a user can actually be wrong
 * about.
 *
 * The name lives **only in WorkOS** — `profiles` stores `workos_user_id` and
 * `email` and nothing else, so there is no row to update here and no migration
 * to write. What changes is the identity record, and the next
 * `syncProfileFromWorkOSUser` picks it up for free.
 *
 * Email is deliberately NOT rectifiable through this, and the reason is not
 * effort. Changing the account email in WorkOS changes the login identity, may
 * require re-verification, and — per the comment in migration 0023 —
 * `set_collaborators` is keyed by address, so it silently drops every set
 * someone shared with you. Shipping that behind a text input would break
 * something a DJ relies on without saying so. It needs a product decision and a
 * confirmation screen, not a save button.
 */
export async function updateDisplayName(
  workosUserId: string,
  firstName: string | null,
  lastName: string | null
): Promise<void> {
  await getWorkOS().userManagement.updateUser({
    userId: workosUserId,
    firstName: firstName ?? "",
    lastName: lastName ?? "",
  })

  logInfo("profile.name_rectified", { workosUserId })
}
