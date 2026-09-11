import "server-only"

import { logError, logInfo } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * The durable record of what an admin did.
 *
 * Suspending an account and deleting one are the two irreversible things this
 * product can do to a customer, and until now the only trace of either was a
 * `logInfo` line on stdout. Vercel keeps those for a day on Hobby and a month on
 * Pro, and neither is queryable by "who deleted this account, and when". Six
 * weeks after the fact the honest answer was "we can't tell".
 *
 * The log lines stay — they are what you tail while debugging. This is the copy
 * that is still there afterwards.
 */

export type AdminAuditAction =
  | "user.suspended"
  | "user.unsuspended"
  | "user.deleted"

export interface AdminAuditEntry {
  actorEmail: string
  action: AdminAuditAction
  targetProfileId: string
  /** The target's address at the time of the action. Cleared by the retention sweep. */
  targetEmail: string
  /** Small, non-personal, action-specific context. */
  detail?: Record<string, string | number | boolean | null>
}

/**
 * Writes one audit row. Never throws.
 *
 * Fail-open is a deliberate trade and worth stating plainly, because the
 * opposite choice is defensible too. Blocking the action on a successful audit
 * write is the stricter posture; here it would mean that deploying this code
 * before migration `0027` is applied — and migrations in this project are
 * applied by hand — turns the panel's delete button into a 500. A security
 * change whose first effect is an outage gets reverted rather than fixed.
 *
 * So a failed write does not stop the action, and instead becomes the loudest
 * thing in the log: `logError` with its own event name, so it is alertable as
 * "we did something privileged and did not record it" rather than buried at
 * warn level next to routine noise.
 */
export async function recordAdminAction(entry: AdminAuditEntry): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from("admin_audit_log").insert({
      actor_email: entry.actorEmail,
      action: entry.action,
      target_profile_id: entry.targetProfileId,
      target_email: entry.targetEmail,
      detail: entry.detail ?? null,
    })

    if (error) {
      throw new Error(error.message)
    }

    logInfo("admin_audit.recorded", {
      action: entry.action,
      targetProfileId: entry.targetProfileId,
    })

    return true
  } catch (error) {
    logError("admin_audit.write_failed", error, {
      action: entry.action,
      targetProfileId: entry.targetProfileId,
    })

    return false
  }
}

export interface AdminAuditRow {
  id: string
  actorEmail: string
  action: string
  targetProfileId: string | null
  targetEmail: string | null
  createdAt: string
}

const RECENT_LIMIT = 50

/** Most recent privileged actions, newest first. Empty if the table is absent. */
export async function getRecentAdminActions(
  limit = RECENT_LIMIT
): Promise<AdminAuditRow[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, actor_email, action, target_profile_id, target_email, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      targetProfileId: row.target_profile_id,
      targetEmail: row.target_email,
      createdAt: row.created_at,
    }))
  } catch (error) {
    logError("admin_audit.read_failed", error, { limit })

    return []
  }
}
