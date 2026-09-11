/**
 * Backstage admin panel access configuration.
 *
 * Access is a flat email allowlist from the BACKSTAGE_ADMIN_EMAILS env var
 * (comma-separated, case-insensitive). Mirrors the BEHIND_ADMIN_EMAILS
 * pattern from StageLink's Behind the Stage panel, without the Redis role
 * layer — a single-admin panel doesn't need dynamic roles yet.
 *
 * The fallback owner keeps the panel reachable if the env var is missing
 * (e.g. a fresh local checkout) instead of locking everyone out.
 *
 * ---
 *
 * Audited 2026-09-11 (finding S-08). `BACKSTAGE_ADMIN_EMAILS` is **not set in
 * Vercel**, so production is running on the fallback below right now: one
 * address, written in a source file, is the entire access control for a panel
 * that can suspend and delete users.
 *
 * It was not changed to fail closed, because doing that today would lock the
 * only admin out of the panel — the fix has an order, and it is:
 *
 *   1. Set `BACKSTAGE_ADMIN_EMAILS` in Vercel production.
 *   2. Confirm the panel still opens.
 *   3. Then make an unset variable mean *no admins* rather than this address.
 *
 * Until step 3, `warnAboutFallback` logs a warning on every
 * resolution that falls back, so the state is visible in production logs rather
 * than only in this comment.
 */

const FALLBACK_ADMIN_EMAILS = ["robertinoc@gmail.com"] as const

/**
 * Says out loud that the panel is being guarded by a hardcoded address.
 *
 * Deliberately not an exception: throwing here would take down the panel, and a
 * security finding that causes an outage gets reverted rather than fixed.
 */
function warnAboutFallback(reason: "unset" | "empty") {
  if (process.env.NODE_ENV !== "production") {
    return
  }

  // Written via console directly: lib/observability/logger is `server-only`,
  // and this module is imported from places where that guard would bite.
  console.warn(
    JSON.stringify({
      app: "energycurve",
      level: "warn",
      event: "backstage.admin_allowlist_fallback",
      reason,
      detail:
        "BACKSTAGE_ADMIN_EMAILS is not configured, so the hardcoded fallback " +
        "owner is the only admin. See finding S-08.",
      timestamp: new Date().toISOString(),
    })
  )
}

export function parseAdminEmails(rawValue: string | undefined | null): string[] {
  if (!rawValue) {
    warnAboutFallback("unset")
    return [...FALLBACK_ADMIN_EMAILS]
  }

  const emails = rawValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"))

  if (emails.length === 0) {
    warnAboutFallback("empty")
    return [...FALLBACK_ADMIN_EMAILS]
  }

  return [...new Set(emails)]
}

export function getBackstageAdminEmails(): string[] {
  return parseAdminEmails(process.env.BACKSTAGE_ADMIN_EMAILS)
}

export function isBackstageAdmin(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }

  return getBackstageAdminEmails().includes(email.trim().toLowerCase())
}
