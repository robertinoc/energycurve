import "server-only"

import type { FirstTouch } from "@/lib/attribution/first-touch"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Writing a first touch onto a profile — once, and only for a new profile.
 *
 * "First touch, consumed at signup": the browser holds the touch until there is
 * an account, then sends it. The server accepts it for a profile created in the
 * last {@link SIGNUP_WINDOW_HOURS} hours that has none yet. Both conditions are
 * part of the one UPDATE, so two tabs sending at once cannot both write, and a
 * person registered before attribution existed — or a year ago — cannot be
 * given a source after the fact by visiting the site again.
 *
 * Twenty-four hours, not minutes, because the send happens on the first
 * dashboard load: a signup that verifies its email the next morning still
 * arrives inside it. Past that, the touch is no longer evidence of how *this*
 * account began.
 */
export const SIGNUP_WINDOW_HOURS = 24

export type FirstTouchOutcome = "recorded" | "not_recorded"

export async function recordFirstTouch(
  profileId: string,
  touch: FirstTouch,
  now: Date = new Date()
): Promise<FirstTouchOutcome> {
  const supabase = getSupabaseAdminClient()
  const createdSince = new Date(
    now.getTime() - SIGNUP_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_touch_source: touch.source,
      first_touch_medium: touch.medium,
      first_touch_campaign: touch.campaign,
      first_touch_referrer: touch.referrer,
      first_touch_landing: touch.landing,
      first_touch_at: touch.at,
      first_touch_recorded_at: now.toISOString(),
    })
    .eq("id", profileId)
    .is("first_touch_recorded_at", null)
    .gte("created_at", createdSince)
    .select("id")

  if (error) {
    throw new Error("Unable to record the first touch.")
  }

  return (data ?? []).length > 0 ? "recorded" : "not_recorded"
}
