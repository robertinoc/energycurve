import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import {
  atTaxonomyLimit,
  validateCustomName,
} from "@/lib/playlists/taxonomy-validation"
import { quotaFor } from "@/lib/product/capabilities"
import { logError, logInfo } from "@/lib/observability/logger"
import {
  SET_CONTEXTS,
  SUPPORTED_GENRES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { UserContext, UserGenre } from "@/types/domain"
import { getProfileBilling } from "./billing-service"

/**
 * User-defined contexts and genres ("behaves like" model). A custom entry is
 * a label owned by one user, mapped to a base context/genre: the scoring
 * engine always receives the base — customs never add scoring rules.
 */

export {
  CUSTOM_NAME_MIN_LENGTH,
  CUSTOM_NAME_MAX_LENGTH,
} from "@/lib/playlists/taxonomy-validation"

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

/**
 * A discriminated union rather than all-optional fields, so the cap is
 * *guaranteed* to be present on the one branch that needs to name a number.
 * With an optional `limit` the caller has to invent a fallback, and "you've
 * reached your limit of 0" is the kind of message that ships.
 */
export type CreateResult<T> =
  | { entry: T; validationError?: undefined; limit?: undefined }
  | {
      entry?: undefined
      validationError: Exclude<TaxonomyValidationError, "limit_reached">
      limit?: undefined
    }
  | { entry?: undefined; validationError: "limit_reached"; limit: number }

/**
 * How many custom labels this profile may keep, and how many it already has.
 *
 * Counted across contexts **and** genres together, which is what
 * `PLAN_LIMITS.customTaxonomies` documents and what the public matrix advertises
 * as a single row. The previous code applied a flat 12 per kind regardless of
 * plan — three ways adrift from the promise at once.
 *
 * Enforced here rather than in the actions so a future caller can't skip it.
 */
async function taxonomyUsage(
  profileId: string
): Promise<{ used: number; limit: number | null }> {
  const [billing, contexts, genres] = await Promise.all([
    getProfileBilling(profileId),
    listUserContexts(profileId),
    listUserGenres(profileId),
  ])

  return {
    used: contexts.length + genres.length,
    limit: quotaFor(billing.plan, billing.status, "custom_taxonomies"),
  }
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

  const usage = await taxonomyUsage(profileId)

  if (atTaxonomyLimit(usage)) {
    return { validationError: "limit_reached", limit: usage.limit as number }
  }

  const existing = await listUserContexts(profileId)

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

  const usage = await taxonomyUsage(profileId)

  if (atTaxonomyLimit(usage)) {
    return { validationError: "limit_reached", limit: usage.limit as number }
  }

  const existing = await listUserGenres(profileId)

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
