import "server-only"
import {
  countRowsIn,
  fetchAllRows,
  fetchAllRowsIn,
  type PaginatedResult,
} from "@/lib/supabase/paginate"

import { logInfo } from "@/lib/observability/logger"
import { ExportIncompleteError } from "@/lib/privacy/export-incomplete"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

export { ExportIncompleteError }

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
  /**
   * How many rows of each kind the file holds, counted by the database and
   * checked against what was read before the file was built. A reader can hold
   * the file to it; a mismatch never reaches them, because it fails the export.
   */
  counts: ExportCounts
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

export interface ExportCounts {
  playlists: number
  tracks: number
  analyses: number
  versions: number
  curveTemplates: number
  customGenres: number
  customContexts: number
  featureUsage: number
  collaborationsShared: number
  suggestionsAuthored: number
}

/**
 * Per table, far past any library we have seen — the alpha user's 30,000 tracks
 * is a thirty-third of it — and still a bound on what one request may hold in
 * memory. Reaching it fails the export rather than cutting it: the general
 * ceiling in `paginate.ts` is 50,000, and an export used to stop there and say
 * nothing (docs/qa/carga-2026-10.md, level 5: 50,000 of 60,000 tracks).
 */
export const EXPORT_MAX_ROWS = 1_000_000

/** Rows or a loud failure. Never rows plus a flag somebody may not read. */
function complete<T>(table: string, result: PaginatedResult<T>): T[] {
  if (result.error) {
    throw new ExportIncompleteError(table, "read_failed", {
      rowsRead: result.rows.length,
      error: errorMessage(result.error),
    })
  }

  if (result.truncated) {
    throw new ExportIncompleteError(table, "ceiling_reached", {
      rowsRead: result.rows.length,
    })
  }

  return result.rows
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message)
  }

  return String(error)
}

/**
 * The database's count against the rows in hand.
 *
 * Paging is only as good as its ordering, and a short read can look exactly
 * like a complete one. Counting the same filter with `head: true` costs no rows
 * and turns "we think we read it all" into "we read what the database says is
 * there". A row written or deleted while the export runs makes them disagree;
 * that fails this export, and the next one is consistent.
 */
function checkCount(
  table: string,
  rows: unknown[],
  counted: { count: number | null; error: unknown }
): void {
  if (counted.error || counted.count === null) {
    throw new ExportIncompleteError(table, "count_failed", {
      error: errorMessage(counted.error ?? "no count"),
    })
  }

  if (counted.count !== rows.length) {
    throw new ExportIncompleteError(table, "count_mismatch", {
      rowsRead: rows.length,
      counted: counted.count,
    })
  }
}

export async function buildAccountExport(
  profileId: string
): Promise<AccountExport | null> {
  const supabase = getSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle()

  if (profileError) {
    // Not "no such account": that would answer a failed read with a 404.
    throw new ExportIncompleteError("profiles", "read_failed", {
      error: errorMessage(profileError),
    })
  }

  if (!profile) {
    return null
  }

  /**
   * Every read below pages, splits its id list, orders by a unique key, and is
   * counted against the database. Each of those closed a way this export used
   * to come out short and look whole:
   *
   * - **Paging.** PostgREST caps a response at 1000 rows without saying so.
   * - **Splitting.** A filter on the person's playlist ids carries the list in
   *   the URL, and from ~400 ids the request fails. The export read the error's
   *   empty rows and delivered **zero tracks** (docs/qa/carga-2026-10.md).
   * - **A unique order.** Offset paging over a non-unique order can repeat a
   *   row on one page and skip another on the next — `position` repeats once
   *   per playlist, so it is never ordered by `position` alone.
   * - **No ceiling that cuts.** `EXPORT_MAX_ROWS`, and reaching it fails.
   *
   * Article 20 asks for the data. The rule here is that an incomplete export is
   * never delivered as a complete one: it brings everything or it fails, and
   * the route says so.
   */
  const playlists = complete(
    "playlists",
    await fetchAllRows(
      (from, to) =>
        supabase
          .from("playlists")
          .select("*")
          .eq("user_id", profileId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      { maxRows: EXPORT_MAX_ROWS }
    )
  )

  const playlistIds = playlists.map((row) => row.id as string)

  /** One table that hangs off the playlists, in playlist order then `order`. */
  const byPlaylist = async (table: string, order: string[]) => {
    // An empty `in()` matches nothing, and some drivers reject it outright.
    if (playlistIds.length === 0) {
      return []
    }

    const rows = complete(
      table,
      await fetchAllRowsIn(
        playlistIds,
        (chunk, from, to) => {
          let query = supabase.from(table).select("*").in("playlist_id", chunk)
          for (const column of ["playlist_id", ...order]) {
            query = query.order(column, { ascending: true })
          }
          return query.range(from, to)
        },
        { maxRows: EXPORT_MAX_ROWS }
      )
    )

    checkCount(
      table,
      rows,
      await countRowsIn(playlistIds, (chunk) =>
        supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .in("playlist_id", chunk)
      )
    )

    return rows
  }

  /** One table that hangs off the profile. */
  const byProfile = async (table: string, column: string) => {
    const rows = complete(
      table,
      await fetchAllRows(
        (from, to) =>
          supabase
            .from(table)
            .select("*")
            .eq(column, profileId)
            .order("id", { ascending: true })
            .range(from, to),
        { maxRows: EXPORT_MAX_ROWS }
      )
    )

    checkCount(
      table,
      rows,
      await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, profileId)
    )

    return rows
  }

  checkCount(
    "playlists",
    playlists,
    await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profileId)
  )

  const [tracks, versions, collaborators, analyses, templates, genres, contexts, usage, authored] =
    await Promise.all([
      byPlaylist("tracks", ["position"]),
      byPlaylist("playlist_versions", ["id"]),
      byPlaylist("set_collaborators", ["id"]),
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
    counts: {
      playlists: playlists.length,
      tracks: tracks.length,
      analyses: analyses.length,
      versions: versions.length,
      curveTemplates: templates.length,
      customGenres: genres.length,
      customContexts: contexts.length,
      featureUsage: usage.length,
      collaborationsShared: collaborators.length,
      suggestionsAuthored: authored.length,
    },
    playlists: clean(playlists),
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
