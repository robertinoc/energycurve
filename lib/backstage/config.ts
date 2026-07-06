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
 */

const FALLBACK_ADMIN_EMAILS = ["robertinoc@gmail.com"] as const

export function parseAdminEmails(rawValue: string | undefined | null): string[] {
  if (!rawValue) {
    return [...FALLBACK_ADMIN_EMAILS]
  }

  const emails = rawValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"))

  if (emails.length === 0) {
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
