import "server-only"

import { getWorkOS } from "@workos-inc/authkit-nextjs"

import {
  buildBackstageUsers,
  computeUserKpis,
  type BackstageUserKpis,
  type BackstageUserRow,
} from "@/lib/backstage/users"
import { logError, logInfo, logWarn } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import type { Profile } from "@/types/domain"

export interface BackstageUsersSnapshot {
  users: BackstageUserRow[]
  kpis: BackstageUserKpis
}

export async function getBackstageUsersSnapshot(): Promise<BackstageUsersSnapshot> {
  const supabase = getSupabaseAdminClient()

  const [profilesResult, playlistsResult, analysesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, created_at, updated_at, suspended_at"),
    supabase.from("playlists").select("user_id"),
    supabase.from("analyses").select("user_id, created_at"),
  ])

  if (profilesResult.error) {
    throw new Error("Unable to load profiles for the backstage panel.")
  }

  // Playlist/analysis counts are enrichment — an environment that hasn't
  // run a migration yet should still render the user list.
  if (playlistsResult.error) {
    logWarn("backstage.playlist_counts_unavailable", {
      reason: playlistsResult.error.message,
    })
  }

  if (analysesResult.error) {
    logWarn("backstage.analysis_counts_unavailable", {
      reason: analysesResult.error.message,
    })
  }

  const users = buildBackstageUsers(
    profilesResult.data ?? [],
    playlistsResult.data ?? [],
    analysesResult.data ?? []
  )

  return { users, kpis: computeUserKpis(users) }
}

async function getProfileById(profileId: string): Promise<Profile | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to load the requested profile.")
  }

  return data
}

/** Route-handler helper: resolve a profile id to its email (null = not found). */
export async function getBackstageProfileEmail(
  profileId: string
): Promise<string | null> {
  const profile = await getProfileById(profileId)

  return profile?.email ?? null
}

export async function setUserSuspension(
  profileId: string,
  suspended: boolean,
  actorEmail: string
): Promise<Profile> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", profileId)
    .select()
    .single()

  if (error || !data) {
    throw new Error("Unable to update the suspension state.")
  }

  logInfo("backstage.user_suspension_changed", {
    profileId,
    email: data.email,
    suspended,
    actorEmail,
  })

  return data
}

/**
 * Deletes the account everywhere. WorkOS first — if only the Supabase row
 * were removed, the person could still log in and the profile sync would
 * quietly recreate it. A WorkOS user that is already gone (404) is fine;
 * any other WorkOS failure aborts before touching the database.
 */
export async function deleteUserEverywhere(
  profileId: string,
  actorEmail: string
): Promise<{ email: string }> {
  const profile = await getProfileById(profileId)

  if (!profile) {
    throw new Error("Profile not found.")
  }

  try {
    await getWorkOS().userManagement.deleteUser(profile.workos_user_id)
  } catch (error) {
    const status = (error as { status?: number }).status

    if (status === 404) {
      logWarn("backstage.workos_user_already_deleted", {
        profileId,
        workosUserId: profile.workos_user_id,
      })
    } else {
      logError("backstage.workos_delete_failed", error, {
        profileId,
        workosUserId: profile.workos_user_id,
      })
      throw new Error("Unable to delete the user in WorkOS.")
    }
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("profiles").delete().eq("id", profileId)

  if (error) {
    throw new Error(
      "The WorkOS user was deleted but removing the profile failed. Retry to finish the cleanup."
    )
  }

  logInfo("backstage.user_deleted", {
    profileId,
    email: profile.email,
    actorEmail,
  })

  return { email: profile.email }
}
