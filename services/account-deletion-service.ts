import "server-only"

import { logError, logInfo, logWarn } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { deleteUserEverywhere } from "@/services/backstage-service"
import {
  resumeSubscription,
  scheduleCancellationAtPeriodEnd,
} from "@/services/subscription-cancel-service"

/**
 * Self-serve erasure, Art. 17, with a grace period.
 *
 * Three decisions shape this file, and the third is the one that keeps
 * surprising people.
 *
 * **1 · Thirty days of grace, and the request is reversible for all of them.**
 * Immediate erasure is cleaner legally — a grace period has to be declared in
 * the policy, and it is — but this product has no tested backup restore, so
 * "irreversible" currently means irreversible. A grace period is the control
 * that exists instead of the one that does not.
 *
 * **2 · The account keeps working during the grace period.** It is not a
 * suspension. Somebody who just asked to be deleted is exactly the person who
 * most needs to download their data first, and answering an erasure request by
 * cutting off portability would be answering it with a new problem. It also
 * removes the need for a token in a URL: cancelling is "log in and press
 * cancel", so there is no signed cancel link to add to the two the security
 * audit already flagged.
 *
 * **3 · The subscription stops renewing at request time, not at deletion.**
 * Anything else charges somebody for a month they spent waiting to be deleted.
 * It is reversible in the same motion — withdrawing the request puts the
 * subscription back — because a reversible request must not have irreversible
 * side effects.
 */

/**
 * How long the grace period lasts.
 *
 * Thirty days is not a coincidence: it is the same number as the Art. 12(3)
 * deadline, so the outer bound of "we will act on your request" and the inner
 * bound of "you can still change your mind" are the same date. Two different
 * numbers here would mean either acting after the deadline or a grace period
 * that ends before the promise does.
 *
 * Named a grace period and NOT a retention window, deliberately. A retention
 * window bounds how long something is kept; this one *delays a deletion*. They
 * point opposite ways, and `tests/compliance-claims.test.ts` counts the windows
 * — so calling this one would have made that count say something false.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30

export interface DeletionRequestResult {
  /** When the account will actually be deleted. */
  scheduledFor: string
  /**
   * When the plan stops, if there was one to stop. Null also means "the call
   * failed", so a caller must not present null as "you have no subscription".
   */
  planEndsAt: string | null
  /** True when there was a subscription and stopping its renewal failed. */
  subscriptionNeedsAttention: boolean
}

function graceEnd(from: Date): Date {
  return new Date(from.getTime() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Starts the grace period, and stops the next renewal.
 *
 * Idempotent by filter: `.is("deletion_requested_at", null)` means a second
 * request does not move the date. Without that, clicking twice would push the
 * deletion further out each time — which is the opposite of what somebody
 * clicking twice wants.
 */
export async function requestAccountDeletion(
  profileId: string,
  now: Date = new Date()
): Promise<DeletionRequestResult | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: now.toISOString() })
    .eq("id", profileId)
    .is("deletion_requested_at", null)
    .select("id, email, stripe_subscription_id, deletion_requested_at")
    .maybeSingle()

  if (error) {
    logError("account_deletion.request_failed", error, { profileId })

    return null
  }

  if (!data) {
    // Already pending. Read the existing date back rather than reporting a
    // failure: the caller's user asked to be deleted and they are, which is the
    // honest answer to a duplicate click.
    return getPendingDeletion(profileId)
  }

  let planEndsAt: string | null = null
  let subscriptionNeedsAttention = false

  if (data.stripe_subscription_id) {
    const outcome = await scheduleCancellationAtPeriodEnd(
      data.stripe_subscription_id
    )

    planEndsAt = outcome.periodEnd
    subscriptionNeedsAttention = !outcome.ok
  }

  // The email is not in the log line. Someone deleting their account is not the
  // moment to copy their address into a log stream with no retention policy —
  // the same reasoning as S-03.
  logInfo("account_deletion.requested", {
    profileId,
    scheduledFor: graceEnd(now).toISOString(),
    hadSubscription: Boolean(data.stripe_subscription_id),
    subscriptionNeedsAttention,
  })

  return {
    scheduledFor: graceEnd(now).toISOString(),
    planEndsAt,
    subscriptionNeedsAttention,
  }
}

/** The pending request for a profile, or null when there is none. */
export async function getPendingDeletion(
  profileId: string
): Promise<DeletionRequestResult | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("deletion_requested_at")
    .eq("id", profileId)
    .maybeSingle()

  if (error || !data?.deletion_requested_at) {
    return null
  }

  return {
    scheduledFor: graceEnd(new Date(data.deletion_requested_at)).toISOString(),
    planEndsAt: null,
    subscriptionNeedsAttention: false,
  }
}

/**
 * Withdraws the request and puts the subscription back.
 *
 * Returns false when there was nothing pending, which the caller shows as
 * "nothing to cancel" rather than as an error.
 */
export async function cancelAccountDeletion(
  profileId: string
): Promise<boolean> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: null })
    .eq("id", profileId)
    .not("deletion_requested_at", "is", null)
    .select("id, stripe_subscription_id")
    .maybeSingle()

  if (error) {
    logError("account_deletion.cancel_failed", error, { profileId })

    return false
  }

  if (!data) {
    return false
  }

  // The request is withdrawn either way. If Stripe refuses, the account is not
  // going to be deleted and the plan is set to lapse at period end — annoying,
  // recoverable from the billing portal, and far better than leaving the
  // deletion pending because a payment provider had a bad minute.
  if (data.stripe_subscription_id) {
    const resumed = await resumeSubscription(data.stripe_subscription_id)

    if (!resumed) {
      logWarn("account_deletion.subscription_not_resumed", { profileId })
    }
  }

  logInfo("account_deletion.cancelled", { profileId })

  return true
}

export interface PendingDeletion {
  profileId: string
  email: string
  requestedAt: string
  scheduledFor: string
  /** Negative once the grace period has run out and the sweep should have run. */
  daysLeft: number
}

/**
 * Everyone with a deletion pending, soonest first. For the panel.
 *
 * This exists because of a specific failure mode rather than for completeness.
 * The sweep runs from the daily cron, and the cron answers 503 without
 * `CRON_SECRET` — which is not set. So today somebody can schedule a deletion
 * and **nothing will execute it**, which is the worst of the three possible
 * states: the person was told a date, and the date will pass.
 *
 * A negative `daysLeft` in the panel is what makes that visible. Without it, a
 * control that is written and not running looks exactly like one that works.
 */
export async function listPendingDeletions(
  now: Date = new Date()
): Promise<PendingDeletion[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, deletion_requested_at")
    .not("deletion_requested_at", "is", null)
    .order("deletion_requested_at", { ascending: true })

  if (error) {
    logWarn("account_deletion.pending_query_failed", { message: error.message })

    return []
  }

  return (data ?? []).flatMap((row) => {
    if (!row.deletion_requested_at) return []

    const scheduledFor = graceEnd(new Date(row.deletion_requested_at))

    return [
      {
        profileId: row.id,
        email: row.email,
        requestedAt: row.deletion_requested_at,
        scheduledFor: scheduledFor.toISOString(),
        daysLeft: Math.floor(
          (scheduledFor.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        ),
      },
    ]
  })
}

export interface DeletionSweepResult {
  deleted: number
  failed: number
}

/**
 * Deletes the accounts whose grace period has run out.
 *
 * Runs in the daily cron. Each account in its own try, for the reason every
 * sweep in this product has its own try: one account that cannot be deleted
 * must not stop the others, and "the sweep failed" is a much worse report than
 * "one of four failed" when three erasure requests were actually honoured.
 *
 * The actor is recorded as `system:deletion-grace` rather than a person, because
 * the audit row has to say that nobody pressed a button — a deletion attributed
 * to an admin who was asleep is a false trail.
 */
export async function sweepDeletedAccounts(
  { now = new Date(), graceDays = ACCOUNT_DELETION_GRACE_DAYS } = {}
): Promise<DeletionSweepResult> {
  const cutoff = new Date(
    now.getTime() - graceDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .not("deletion_requested_at", "is", null)
    .lt("deletion_requested_at", cutoff)

  if (error) {
    logWarn("account_deletion.sweep_query_failed", { message: error.message })
    throw new Error("Unable to list accounts due for deletion.")
  }

  const due = data ?? []
  let deleted = 0
  let failed = 0

  for (const row of due) {
    try {
      await deleteUserEverywhere(row.id, "system:deletion-grace")
      deleted += 1
    } catch (sweepError) {
      failed += 1
      logError("account_deletion.sweep_delete_failed", sweepError, {
        profileId: row.id,
      })
    }
  }

  logInfo("account_deletion.sweep_completed", {
    due: due.length,
    deleted,
    failed,
  })

  return { deleted, failed }
}
