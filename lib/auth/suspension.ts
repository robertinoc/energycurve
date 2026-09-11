import type { Profile } from "@/types/domain"

/**
 * Whether an account has been suspended.
 *
 * Suspension existed and was enforced in exactly two places: at login, and when
 * the dashboard shell renders. Both are *page* gates. Nothing checked it on the
 * API routes or the server actions — so a suspended account with a live session
 * cookie could still spend AI quota, export its whole account and mutate its
 * playlists. It could not see the dashboard, which is the part that looks like
 * enforcement without being it.
 *
 * The reason that gap survived is that it is invisible from the UI: you suspend
 * someone, their browser bounces to /account-suspended, and it appears to have
 * worked. The session is still valid; only the view changed.
 *
 * This costs nothing to fix because `syncProfileFromWorkOSUser` already returns
 * the whole row — `suspended_at` was in hand at every call site and simply
 * unread. No extra query, no new failure mode, and no fail-open dilemma: if the
 * profile read succeeded, the answer is definite.
 */
export function isSuspended(profile: Pick<Profile, "suspended_at">): boolean {
  return Boolean(profile.suspended_at)
}

/** The shape every API route uses to refuse a suspended caller. */
export const SUSPENDED_RESPONSE = {
  body: { error: "account_suspended" },
  status: 403,
} as const
