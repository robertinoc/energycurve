import "server-only"

import { logInfo } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * "Download my data" — the portability half of a data-subject request.
 *
 * Until now there was no way for a user to get their own data out. The playlist
 * export produces Rekordbox XML and Traktor NML, which is a DJ format and not a
 * DSAR: it carries the tracks of one set and nothing about the account, the
 * history, the collaborations or the billing state. Someone exercising Art. 20
 * had to email and wait for a human.
 *
 * Three rules this file follows:
 *
 * 1. **Everything is scoped by `profileId`**, in every query, the same way the
 *    rest of `services/` works. AGENTS.md is explicit that RLS will not catch a
 *    miss here, and an export endpoint is the single juiciest thing in the
 *    product to get wrong — it returns a whole account in one response.
 * 2. **Nothing is invented.** The export is what the database holds, in the
 *    shape it holds it. A prettified export that quietly drops a column is
 *    worse than none, because it answers "is that everything?" with a lie.
 * 3. **No secrets leave.** Stripe customer ids and the WorkOS user id are
 *    internal join keys, not the person's data, and handing them out in a file
 *    that gets emailed around helps nobody. What the person needs is their plan
 *    and their dates, which are included.
 */

export interface AccountExport {
  /** So a reader knows what they are holding and when it was true. */
  exportedAt: string
  format: "energycurve.account-export.v1"
  account: {
    email: string
    createdAt: string
    preferredLocale: string | null
    keyNotation: string | null
  }
  subscription: {
    plan: string
    status: string | null
    currentPeriodEnd: string | null
    cancelAt: string | null
  }
  playlists: Array<Record<string, unknown>>
  tracks: Array<Record<string, unknown>>
  analyses: Array<Record<string, unknown>>
  versions: Array<Record<string, unknown>>
  curveTemplates: Array<Record<string, unknown>>
  customGenres: Array<Record<string, unknown>>
  customContexts: Array<Record<string, unknown>>
  featureUsage: Array<Record<string, unknown>>
  collaborations: {
    /** Sets this person invited others to. */
    shared: Array<Record<string, unknown>>
    /** Suggestions this person left on someone else's set. */
    suggestionsAuthored: Array<Record<string, unknown>>
  }
  /**
   * Named on purpose rather than left to inference: a reader should not have to
   * work out from an absence that we hold data elsewhere.
   */
  heldElsewhere: string[]
}

/**
 * Columns that identify a row to *us* rather than describing the person.
 *
 * Applied to every table, not just playlists — the first version stripped them
 * from playlists only, and `user_id` then walked straight back out through
 * `analyses`, `curve_templates`, `user_genres`, `user_contexts` and
 * `feature_usage`. A test caught it, which is the argument for testing an export
 * for what it must *not* contain and not only for what it must.
 */
const INTERNAL_COLUMNS = [
  "user_id",
  "profile_id",
  "author_id",
  "edit_lock_holder",
  "workos_user_id",
  "stripe_customer_id",
  "stripe_subscription_id",
] as const

function clean<T extends Record<string, unknown>>(rows: T[]): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row }
    for (const column of INTERNAL_COLUMNS) delete copy[column]
    return copy
  })
}

export async function buildAccountExport(
  profileId: string
): Promise<AccountExport | null> {
  const supabase = getSupabaseAdminClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle()

  if (!profile) {
    return null
  }

  const { data: playlists } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", profileId)
    .order("created_at", { ascending: true })

  const playlistIds = (playlists ?? []).map((row) => row.id as string)

  // `in` with an empty list is a query that matches nothing, which is what we
  // want — but some drivers treat it as a syntax error, so short-circuit.
  const tracks = playlistIds.length
    ? (
        await supabase
          .from("tracks")
          .select("*")
          .in("playlist_id", playlistIds)
          .order("position", { ascending: true })
      ).data ?? []
    : []

  const versions = playlistIds.length
    ? (await supabase.from("playlist_versions").select("*").in("playlist_id", playlistIds))
        .data ?? []
    : []

  const collaborators = playlistIds.length
    ? (await supabase.from("set_collaborators").select("*").in("playlist_id", playlistIds))
        .data ?? []
    : []

  const [analyses, templates, genres, contexts, usage, authored] = await Promise.all([
    supabase.from("analyses").select("*").eq("user_id", profileId),
    supabase.from("curve_templates").select("*").eq("user_id", profileId),
    supabase.from("user_genres").select("*").eq("user_id", profileId),
    supabase.from("user_contexts").select("*").eq("user_id", profileId),
    supabase.from("feature_usage").select("*").eq("profile_id", profileId),
    supabase.from("set_suggestions").select("*").eq("author_id", profileId),
  ])

  logInfo("account.data_exported", {
    profileId,
    playlistCount: playlistIds.length,
    trackCount: tracks.length,
  })

  return {
    exportedAt: new Date().toISOString(),
    format: "energycurve.account-export.v1",
    account: {
      email: profile.email as string,
      createdAt: profile.created_at as string,
      preferredLocale: (profile.preferred_locale as string | null) ?? null,
      keyNotation: (profile.key_notation as string | null) ?? null,
    },
    subscription: {
      plan: (profile.plan as string) ?? "free",
      status: (profile.plan_status as string | null) ?? null,
      currentPeriodEnd: (profile.plan_current_period_end as string | null) ?? null,
      cancelAt: (profile.plan_cancel_at as string | null) ?? null,
    },
    playlists: clean(playlists ?? []),
    tracks: clean(tracks),
    analyses: clean(analyses.data ?? []),
    versions: clean(versions),
    curveTemplates: clean(templates.data ?? []),
    customGenres: clean(genres.data ?? []),
    customContexts: clean(contexts.data ?? []),
    featureUsage: clean(usage.data ?? []),
    collaborations: {
      shared: clean(collaborators),
      // The playlist id of someone else's set stays: it is an opaque uuid, and
      // without it a person cannot tell which set their own suggestion was
      // about. What must not appear is that set's *content* — its name, its
      // venue, its tracks — and none of that is read here.
      suggestionsAuthored: clean(authored.data ?? []),
    },
    heldElsewhere: [
      "WorkOS holds your name, your password and your sign-in history. Ask us and we will retrieve it.",
      "Stripe holds your billing details, invoices and payment history, under its own retention rules.",
      "PostHog holds product-usage events keyed to your account id, with your IP address disabled.",
      "Audio files never leave your device, so we hold none.",
    ],
  }
}
