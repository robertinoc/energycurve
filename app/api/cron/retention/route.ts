import { NextResponse } from "next/server"

import { logError } from "@/lib/observability/logger"
import {
  sweepAnalysisBlobs,
  sweepAuditLogEmails,
  sweepBillingPayloads,
} from "@/services/retention-service"

export const dynamic = "force-dynamic"

/**
 * The scheduled retention sweep.
 *
 * Called by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`. That
 * check is the whole security model here, so it is worth being explicit about
 * the two ways it could be got wrong:
 *
 * - **No secret configured means refuse, not allow.** An unset `CRON_SECRET`
 *   answers 503. A route that deletes data and defaults to open is worse than
 *   one that never runs.
 * - **The comparison is length-safe.** A plain `===` on secrets is a timing
 *   oracle in principle; it costs nothing to not have one.
 *
 * Deliberately outside the `proxy.ts` matcher: cron has no session, and running
 * it through authkit would make `withAuth()` the thing deciding, which it
 * cannot.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json(
      { error: "Retention sweep is not configured." },
      { status: 503 }
    )
  }

  const provided = request.headers.get("authorization") ?? ""

  if (!safeEquals(provided, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const result = await sweepBillingPayloads()

    // Separate try, and not part of the one above, for a specific reason: the
    // audit table arrives with migration 0027 and migrations here are applied by
    // hand. An environment that has the code and not the table would otherwise
    // have its billing sweep — the one with the erasure obligation behind it —
    // reported as failed because a second, newer sweep could not run.
    let auditEmailsCleared: number | null = null

    try {
      auditEmailsCleared = await sweepAuditLogEmails()
    } catch (error) {
      logError("retention.audit_sweep_failed", error)
    }

    // Same isolation, same reason: this one needs migration 0028, and an
    // environment that has the code and not the migration must not have its
    // billing sweep reported as failed because a newer one could not run.
    let analysisBlobsCleared: number | null = null

    try {
      analysisBlobsCleared = await sweepAnalysisBlobs()
    } catch (error) {
      logError("retention.analysis_sweep_failed", error)
    }

    return NextResponse.json({
      ok: true,
      ...result,
      auditEmailsCleared,
      analysisBlobsCleared,
    })
  } catch (error) {
    logError("retention.sweep_failed", error)

    return NextResponse.json({ error: "sweep_failed" }, { status: 500 })
  }
}

/** Constant-time-ish comparison that does not leak length through early exit. */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }

  return mismatch === 0
}
