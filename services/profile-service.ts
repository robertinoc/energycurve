import "server-only"

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
