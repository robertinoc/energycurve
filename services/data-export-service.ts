import "server-only"
import { fetchAllRows } from "@/lib/supabase/paginate"

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

  /**
   * Every one of the reads below pages, and that is the difference between an
   * export and a sample.
   *
   * PostgREST caps a response at 1000 rows without erroring and without
   * flagging it, so the nine queries this function used to make each returned a
   * first page and stopped. The file still got a name, a date and a "your data"
   * label on it. Article 20 asks for the data; an unannounced truncation is a
   * wrong answer to a right the user cannot audit — they have no way to know
   * that 1000 tracks was not all of them.
   *
   * `fetchAllRows` is the same helper `library-service.ts` already uses. Its
   * `truncated` flag is deliberately not consulted here: its ceiling is 50,000
   * rows per table, and an export that large is a different conversation than
   * this fix. What matters is that the 1000 is gone.
   */
  const { rows: playlists } = await fetchAllRows((from, to) =>
    supabase
      .from("playlists")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: true })
      .range(from, to)
  )

  const playlistIds = playlists.map((row) => row.id as string)

  /** Pages one table that hangs off the playlists. */
  const byPlaylist = async (table: string, order?: string) => {
    // `in` with an empty list is a query that matches nothing, which is what we
    // want — but some drivers treat it as a syntax error, so short-circuit.
    if (playlistIds.length === 0) {
      return []
    }

    const { rows } = await fetchAllRows((from, to) => {
      const query = supabase
        .from(table)
        .select("*")
        .in("playlist_id", playlistIds)

      return (order ? query.order(order, { ascending: true }) : query).range(
        from,
        to
      )
    })

    return rows
  }

  /** Pages one table that hangs off the profile. */
  const byProfile = async (table: string, column: string) => {
    const { rows } = await fetchAllRows((from, to) =>
      supabase.from(table).select("*").eq(column, profileId).range(from, to)
    )

    return rows
  }

  const tracks = await byPlaylist("tracks", "position")
  const versions = await byPlaylist("playlist_versions")
  const collaborators = await byPlaylist("set_collaborators")

  const [analyses, templates, genres, contexts, usage, authored] = await Promise.all([
    byProfile("analyses", "user_id"),
    byProfile("curve_templates", "user_id"),
    byProfile("user_genres", "user_id"),
    byProfile("user_contexts", "user_id"),
    byProfile("feature_usage", "profile_id"),
    byProfile("set_suggestions", "author_id"),
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
    analyses: clean(analyses),
    versions: clean(versions),
    curveTemplates: clean(templates),
    customGenres: clean(genres),
    customContexts: clean(contexts),
    featureUsage: clean(usage),
    collaborations: {
      shared: clean(collaborators),
      // The playlist id of someone else's set stays: it is an opaque uuid, and
      // without it a person cannot tell which set their own suggestion was
      // about. What must not appear is that set's *content* — its name, its
      // venue, its tracks — and none of that is read here.
      suggestionsAuthored: clean(authored),
    },
    heldElsewhere: [
      "WorkOS holds your name, your password and your sign-in history. Ask us and we will retrieve it.",
      "Stripe holds your billing details, invoices and payment history, under its own retention rules.",
      "PostHog holds product-usage events keyed to your account id, with your IP address disabled.",
      "Audio files never leave your device, so we hold none.",
    ],
  }
}
