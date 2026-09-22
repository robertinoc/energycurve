import "server-only"

import { logError, logInfo } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * The rights that are not a button, with a record and a deadline.
 *
 * Three GDPR rights are red in the gap assessment for one shared reason: the
 * only way to exercise them is to write to hello@. That is a valid mechanism —
 * Art. 12 never asked for self-service — but it is valid *conditionally*, and
 * `docs/compliance/dsar-procedure.md` named both conditions and then said the
 * uncomfortable part: the clock starts when the mail arrives, not when it is
 * read. One operator, no queue, and a week of not looking eats a third of the
 * month.
 *
 * So this is not an automation of those rights. It is the paper trail they were
 * missing: a request filed from inside the account gets a row, a stored
 * deadline, a place in the panel, and a line the person who filed it can see.
 * Nothing here decides anything — no automatic erasure, no automatic
 * rectification. A queue that acts by itself is a queue that can act wrongly by
 * itself, and none of these four kinds is mechanical enough to deserve that.
 */

/**
 * What can be asked for.
 *
 * `rectify_email` is a request and not an edit, and that is a scope decision
 * rather than laziness. Changing the address moves the login identity in WorkOS
 * **and** silently drops every set shared with you, because
 * `set_collaborators` is keyed by address. Whether those shares should follow
 * the person or stay with the old address is a product question with two
 * defensible answers, and answering it inside a save button would answer it for
 * everyone, quietly, on the first use.
 */
export type PrivacyRequestKind =
  | "rectify_email"
  | "object"
  | "restrict"
  | "other"

export type PrivacyRequestStatus = "open" | "answered" | "refused"

export const PRIVACY_REQUEST_KINDS: readonly PrivacyRequestKind[] = [
  "rectify_email",
  "object",
  "restrict",
  "other",
] as const

/**
 * One calendar month, Art. 12(3), expressed in the unit the regulation means.
 *
 * Thirty **calendar** days, not working days — the procedure document is
 * explicit about it because it is the most common way this deadline gets
 * miscounted. The extension to two more months exists (Art. 12(3) again), but
 * only if you tell the person inside the first month: the notice is what
 * creates it, so it is not a fallback this code can assume.
 */
export const PRIVACY_REQUEST_DEADLINE_DAYS = 30

export interface PrivacyRequest {
  id: string
  kind: PrivacyRequestKind
  status: PrivacyRequestStatus
  details: string | null
  requesterEmail: string | null
  dueAt: string
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
}

/** The panel needs the profile too, to know whose request it is reading. */
export interface PrivacyRequestForAdmin extends PrivacyRequest {
  profileId: string
  /** Whole days until `dueAt`; negative once it is overdue. */
  daysUntilDue: number
}

interface PrivacyRequestRow {
  id: string
  profile_id: string
  kind: string
  status: string
  details: string | null
  requester_email: string | null
  due_at: string
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
}

function isKind(value: string): value is PrivacyRequestKind {
  return (PRIVACY_REQUEST_KINDS as readonly string[]).includes(value)
}

function isStatus(value: string): value is PrivacyRequestStatus {
  return value === "open" || value === "answered" || value === "refused"
}

/**
 * Rows come from the database, so the shape is checked rather than asserted.
 *
 * An unrecognised `kind` or `status` is dropped instead of coerced. The check
 * constraints make it unreachable through this code, but a row edited by hand in
 * the SQL editor is not unreachable, and a request rendered under the wrong
 * label is worse than one that does not render: the label is what tells the
 * reader which legal deadline applies.
 */
function toRequest(row: PrivacyRequestRow): PrivacyRequest | null {
  if (!isKind(row.kind) || !isStatus(row.status)) {
    logError(
      "privacy_request.unrecognised_row",
      new Error(`kind=${row.kind} status=${row.status}`),
      { requestId: row.id }
    )

    return null
  }

  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    details: row.details,
    requesterEmail: row.requester_email,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
  }
}

const SELECT =
  "id, profile_id, kind, status, details, requester_email, due_at, resolved_at, resolution_note, created_at"

/**
 * Files a request and returns it.
 *
 * The deadline is computed here and stored, rather than derived on read. See the
 * migration for why: a stored deadline is a fact about this request as of when
 * it arrived, so changing the policy later cannot retroactively shorten a
 * promise already made.
 */
export async function createPrivacyRequest(input: {
  profileId: string
  kind: PrivacyRequestKind
  details: string | null
  requesterEmail: string
  now?: Date
}): Promise<PrivacyRequest | null> {
  const now = input.now ?? new Date()
  const dueAt = new Date(
    now.getTime() + PRIVACY_REQUEST_DEADLINE_DAYS * 24 * 60 * 60 * 1000
  )

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      profile_id: input.profileId,
      kind: input.kind,
      details: input.details,
      requester_email: input.requesterEmail,
      due_at: dueAt.toISOString(),
      // Written rather than left to the column default, even though the default
      // says the same thing. The row is read back immediately and the status is
      // what decides which deadline applies, so relying on a default here would
      // make the returned object depend on the schema agreeing with this file —
      // and the version that did exactly that came back with no status at all.
      status: "open",
    })
    .select(SELECT)
    .single()

  if (error || !data) {
    logError("privacy_request.create_failed", error, {
      profileId: input.profileId,
      kind: input.kind,
    })

    return null
  }

  // The kind, not the contents. What someone wrote in a rights request is the
  // last thing that belongs in a log stream with no retention and no redaction
  // layer — which is exactly how S-03 happened with the contact form.
  logInfo("privacy_request.created", {
    profileId: input.profileId,
    kind: input.kind,
    detailsLength: input.details?.length ?? 0,
  })

  return toRequest(data as PrivacyRequestRow)
}

/**
 * A profile's own requests, newest first.
 *
 * Scoped by `profile_id` in the query and not filtered afterwards, per the rule
 * that makes `services/` the access-control surface: RLS runs with zero
 * policies, so a missing `.eq` here is not caught by the database, by a type or
 * by review.
 */
export async function listPrivacyRequestsForProfile(
  profileId: string,
  limit = 10
): Promise<PrivacyRequest[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("privacy_requests")
    .select(SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    logError("privacy_request.list_failed", error, { profileId })

    return []
  }

  return ((data ?? []) as PrivacyRequestRow[])
    .map(toRequest)
    .filter((request): request is PrivacyRequest => request !== null)
}

/**
 * How many requests this profile has open.
 *
 * Used to stop one person filling the queue. It is a per-profile count and not a
 * rate limit window on purpose: the thing worth bounding is not how fast someone
 * files, it is how many unanswered requests they can have at once. Somebody with
 * three open requests does not need a fourth — they need an answer.
 */
export async function countOpenPrivacyRequests(
  profileId: string
): Promise<number> {
  const supabase = getSupabaseAdminClient()
  const { count, error } = await supabase
    .from("privacy_requests")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("status", "open")

  if (error) {
    logError("privacy_request.count_failed", error, { profileId })

    // Fail closed. An unknown count means an unknown queue depth, and the cost
    // of refusing one legitimate request — which still has hello@ as a route,
    // stated in the copy — is lower than the cost of an unbounded one.
    return Number.POSITIVE_INFINITY
  }

  return count ?? 0
}

/** Whatever is still open, soonest deadline first — the panel's only question. */
export async function listOpenPrivacyRequests(
  limit = 25,
  now: Date = new Date()
): Promise<PrivacyRequestForAdmin[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("privacy_requests")
    .select(SELECT)
    .eq("status", "open")
    .order("due_at", { ascending: true })
    .limit(limit)

  if (error) {
    logError("privacy_request.list_open_failed", error)

    return []
  }

  return ((data ?? []) as PrivacyRequestRow[]).flatMap((row) => {
    const request = toRequest(row)

    if (!request) return []

    return [
      {
        ...request,
        profileId: row.profile_id,
        daysUntilDue: Math.floor(
          (new Date(request.dueAt).getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000)
        ),
      },
    ]
  })
}

/**
 * Closes a request. `answered` or `refused` — a refusal is a resolution.
 *
 * Art. 12(4) requires answering a refusal inside the same deadline, with the
 * reason and the right to complain to an authority. Modelling it as a third
 * terminal state rather than as "not answered" is what keeps a refused request
 * out of the overdue list without pretending it was granted.
 *
 * Idempotent by filter: the `.eq("status", "open")` means closing an already
 * closed request changes nothing and reports so, instead of overwriting the
 * first resolution with a second one.
 */
export async function resolvePrivacyRequest(input: {
  requestId: string
  status: Exclude<PrivacyRequestStatus, "open">
  note: string
  now?: Date
}): Promise<boolean> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("privacy_requests")
    .update({
      status: input.status,
      resolution_note: input.note,
      resolved_at: (input.now ?? new Date()).toISOString(),
    })
    .eq("id", input.requestId)
    .eq("status", "open")
    .select("id")

  if (error) {
    logError("privacy_request.resolve_failed", error, {
      requestId: input.requestId,
    })

    return false
  }

  const changed = (data ?? []).length > 0

  if (changed) {
    logInfo("privacy_request.resolved", {
      requestId: input.requestId,
      status: input.status,
    })
  }

  return changed
}
