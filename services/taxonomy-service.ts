import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import {
  CUSTOM_TAXONOMY_LIMIT,
  validateCustomName,
} from "@/lib/playlists/taxonomy-validation"
import { logError, logInfo } from "@/lib/observability/logger"
import {
  SET_CONTEXTS,
  SUPPORTED_GENRES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { UserContext, UserGenre } from "@/types/domain"

/**
 * User-defined contexts and genres ("behaves like" model). A custom entry is
 * a label owned by one user, mapped to a base context/genre: the scoring
 * engine always receives the base — customs never add scoring rules.
 */

export {
  CUSTOM_NAME_MIN_LENGTH,
  CUSTOM_NAME_MAX_LENGTH,
} from "@/lib/playlists/taxonomy-validation"
export { CUSTOM_TAXONOMY_LIMIT }

export type TaxonomyValidationError =
  | "name_invalid"
  | "behaves_like_invalid"
  | "limit_reached"
  | "duplicate_name"

export async function listUserContexts(
  profileId: string
): Promise<UserContext[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_contexts")
    .select("*")
    .eq("user_id", profileId)
    .order("created_at", { ascending: true })

  if (error) {
    logError("taxonomy.list_contexts_failed", error, { profileId })
    return []
  }

  return data ?? []
}

export async function listUserGenres(profileId: string): Promise<UserGenre[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_genres")
    .select("*")
    .eq("user_id", profileId)
    .order("created_at", { ascending: true })

  if (error) {
    logError("taxonomy.list_genres_failed", error, { profileId })
    return []
  }

  return data ?? []
}

interface CreateResult<T> {
  entry?: T
  validationError?: TaxonomyValidationError
}

export async function createUserContext(
  profileId: string,
  rawName: string,
  behavesLike: string
): Promise<CreateResult<UserContext>> {
  const name = validateCustomName(rawName)

  if (!name) {
    return { validationError: "name_invalid" }
  }

  if (!(SET_CONTEXTS as readonly string[]).includes(behavesLike)) {
    return { validationError: "behaves_like_invalid" }
  }

  const existing = await listUserContexts(profileId)

  if (existing.length >= CUSTOM_TAXONOMY_LIMIT) {
    return { validationError: "limit_reached" }
  }

  if (existing.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    return { validationError: "duplicate_name" }
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_contexts")
    .insert({
      user_id: profileId,
      name,
      behaves_like: behavesLike as PlaylistContext,
    })
    .select()
    .single()

  if (error || !data) {
    logError("taxonomy.create_context_failed", error, { profileId })
    throw new Error("Unable to create the custom context.")
  }

  logInfo("taxonomy.context_created", { profileId, name })
  return { entry: data }
}

export async function createUserGenre(
  profileId: string,
  rawName: string,
  behavesLike: string
): Promise<CreateResult<UserGenre>> {
  const name = validateCustomName(rawName)

  if (!name) {
    return { validationError: "name_invalid" }
  }

  if (!(SUPPORTED_GENRES as readonly string[]).includes(behavesLike)) {
    return { validationError: "behaves_like_invalid" }
  }

  const existing = await listUserGenres(profileId)

  if (existing.length >= CUSTOM_TAXONOMY_LIMIT) {
    return { validationError: "limit_reached" }
  }

  if (existing.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    return { validationError: "duplicate_name" }
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_genres")
    .insert({
      user_id: profileId,
      name,
      behaves_like: behavesLike as SupportedGenre,
    })
    .select()
    .single()

  if (error || !data) {
    logError("taxonomy.create_genre_failed", error, { profileId })
    throw new Error("Unable to create the custom genre.")
  }

  logInfo("taxonomy.genre_created", { profileId, name })
  return { entry: data }
}

/** Ownership-checked lookups: the actions resolve "custom:<id>" form values. */
export async function getUserContextById(
  profileId: string,
  id: string
): Promise<UserContext | null> {
  const supabase = getSupabaseAdminClient()
  const { data } = await supabase
    .from("user_contexts")
    .select("*")
    .eq("id", id)
    .eq("user_id", profileId)
    .maybeSingle()

  return data ?? null
}

export async function getUserGenreById(
  profileId: string,
  id: string
): Promise<UserGenre | null> {
  const supabase = getSupabaseAdminClient()
  const { data } = await supabase
    .from("user_genres")
    .select("*")
    .eq("id", id)
    .eq("user_id", profileId)
    .maybeSingle()

  return data ?? null
}

export async function deleteUserContext(
  profileId: string,
  id: string
): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from("user_contexts")
    .delete()
    .eq("id", id)
    .eq("user_id", profileId)

  if (error) {
    logError("taxonomy.delete_context_failed", error, { profileId, id })
    throw new Error("Unable to delete the custom context.")
  }
}

export async function deleteUserGenre(
  profileId: string,
  id: string
): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from("user_genres")
    .delete()
    .eq("id", id)
    .eq("user_id", profileId)

  if (error) {
    logError("taxonomy.delete_genre_failed", error, { profileId, id })
    throw new Error("Unable to delete the custom genre.")
  }
}
