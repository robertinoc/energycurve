import "server-only"

import { logInfo, logWarn } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Data retention — dropping what we no longer have a reason to hold.
 *
 * `billing_events` was the clearest gap in the RoPA: it stores the **complete
 * Stripe event** in `payload jsonb`, which carries the customer's name, email,
 * billing address and country, and nothing ever deleted it. The FK to
 * `profiles` is `on delete set null`, so the payload also *outlived the person
 * it belonged to* — a deleted account left its billing details behind, orphaned
 * and indefinite.
 *
 * The fix is not to delete the rows. The row **is** the idempotency guarantee:
 * its primary key is Stripe's event id, and that is what stops a retried
 * webhook granting a plan twice. Delete the row and a redelivery of a
 * six-month-old event would be processed as new.
 *
 * So the row stays and the payload goes. `id`, `type` and `processed_at` remain,
 * which is everything idempotency and the audit trail need; what leaves is the
 * personal data inside the blob.
 *
 * The window is a judgement about decay: the payload is kept "for debugging a
 * bad transition after the fact", and that value drops to near zero within
 * weeks. The personal data's sensitivity does not decay at all.
 */

/**
 * How long a payload stays readable.
 *
 * Ninety days covers a full billing cycle plus a dispute window, which is the
 * realistic outer edge of "we need to look at what Stripe actually sent".
 */
export const BILLING_PAYLOAD_RETENTION_DAYS = 90

export interface RetentionSweepResult {
  /** Old events whose payload was dropped. */
  agedOut: number
  /** Events belonging to an account that no longer exists. */
  orphaned: number
}

function cutoffIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Drops payloads that are past the window or belong to a deleted account.
 *
 * The two passes are separate on purpose and the orphan pass has **no age
 * check**: when someone deletes their account, the data protection reason to
 * hold their billing details ends that day, not ninety days later. An erasure
 * request that leaves the payload sitting for three more months is not an
 * erasure.
 */
export async function sweepBillingPayloads(
  { retentionDays = BILLING_PAYLOAD_RETENTION_DAYS } = {}
): Promise<RetentionSweepResult> {
  const supabase = getSupabaseAdminClient()

  // Orphans first. If this fails we want to know before anything else ran.
  const { data: orphans, error: orphanError } = await supabase
    .from("billing_events")
    .update({ payload: null })
    .is("profile_id", null)
    .not("payload", "is", null)
    .select("id")

  if (orphanError) {
    logWarn("retention.orphan_sweep_failed", { message: orphanError.message })
    throw new Error("Unable to clear payloads for deleted accounts.")
  }

  const { data: aged, error: agedError } = await supabase
    .from("billing_events")
    .update({ payload: null })
    .lt("processed_at", cutoffIso(retentionDays))
    .not("payload", "is", null)
    .select("id")

  if (agedError) {
    logWarn("retention.aged_sweep_failed", { message: agedError.message })
    throw new Error("Unable to clear payloads past the retention window.")
  }

  const result = {
    orphaned: orphans?.length ?? 0,
    agedOut: aged?.length ?? 0,
  }

  // Counts only. Naming which events were scrubbed in a log would recreate a
  // thinner version of the trail this sweep exists to remove.
  logInfo("retention.billing_payloads_swept", {
    ...result,
    retentionDays,
  })

  return result
}

/**
 * How long an audit row keeps the target's address.
 *
 * The action, the actor and the (now unresolvable) profile id stay forever —
 * that is the audit trail, and it holds no personal data about the target once
 * the email is gone. What expires is the one field that identifies a person,
 * and a year is the outer edge of "someone might still ask us what happened to
 * this account".
 *
 * Without this, the audit log written for account deletions would quietly become
 * the place a deleted person's email lives indefinitely — a new copy of exactly
 * the problem the billing sweep above exists to remove.
 */
export const AUDIT_EMAIL_RETENTION_DAYS = 365

/** Clears target emails from audit rows past the window. Returns how many. */
export async function sweepAuditLogEmails(
  { retentionDays = AUDIT_EMAIL_RETENTION_DAYS } = {}
): Promise<number> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("admin_audit_log")
    .update({ target_email: null })
    .lt("created_at", cutoffIso(retentionDays))
    .not("target_email", "is", null)
    .select("id")

  if (error) {
    logWarn("retention.audit_email_sweep_failed", { message: error.message })
    throw new Error("Unable to clear aged audit log emails.")
  }

  const cleared = data?.length ?? 0

  logInfo("retention.audit_emails_swept", { cleared, retentionDays })

  return cleared
}
