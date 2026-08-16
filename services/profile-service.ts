import "server-only"

import { toSiteLocale } from "@/lib/analysis-locale"
import { logError } from "@/lib/observability/logger"
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
