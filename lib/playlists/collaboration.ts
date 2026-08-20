/**
 * The rules of a shared set, with no database in sight.
 *
 * Two questions, both of which are easy to get subtly wrong and both of which
 * decide whether one DJ can see another's work:
 *
 * 1. **Is this email the same person?** Invites are keyed by email, so "same
 *    person" is a string comparison, and a string comparison is exactly where
 *    `Robertino@Gmail.com ` and `robertino@gmail.com` stop being the same person.
 * 2. **What may a collaborator do?** Read and suggest. Not reorder, not rename,
 *    not delete, not export under their own name. Stated as data rather than
 *    scattered as `if` statements across routes, because a permission that lives
 *    in six places is a permission with six chances to be forgotten.
 */

/**
 * The one normalisation for invite emails.
 *
 * Lowercased and trimmed, and nothing cleverer: no dot-stripping, no plus-address
 * folding. Those are Gmail's rules, not everyone's, and treating
 * `a.b@outlook.com` as `ab@outlook.com` would hand one person's set to a
 * different one.
 */
export function normalizeInviteEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()

  // Deliberately loose: a real address this rejects is a support ticket, and an
  // unreal one this accepts just never matches a login. The risk is asymmetric.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null
}

/** True when an invite is for this person. */
export function sameInvitee(invitedEmail: string, viewerEmail: string): boolean {
  const a = normalizeInviteEmail(invitedEmail)
  const b = normalizeInviteEmail(viewerEmail)

  return a !== null && a === b
}

export type CollaboratorAction =
  | "view"
  | "suggest"
  | "reorder"
  | "rename"
  | "delete"
  | "invite"
  | "resolveSuggestion"

/**
 * What each role may do.
 *
 * `owner` is the DJ whose set it is; `collaborator` is whoever it was shared with.
 * Resolving a suggestion is the owner's, not the author's: it means "I've dealt
 * with this", which is not the commenter's call.
 */
const ALLOWED: Record<"owner" | "collaborator", readonly CollaboratorAction[]> = {
  owner: [
    "view",
    "suggest",
    "reorder",
    "rename",
    "delete",
    "invite",
    "resolveSuggestion",
  ],
  collaborator: ["view", "suggest"],
}

export function may(
  role: "owner" | "collaborator",
  action: CollaboratorAction
): boolean {
  return ALLOWED[role].includes(action)
}

/** Longest a suggestion may be, matching the CHECK on the column. */
export const SUGGESTION_MAX_LENGTH = 2000

/**
 * A suggestion body, trimmed, or null when it isn't one.
 *
 * Returns null rather than throwing so the caller is a route returning 400 and
 * not a 500, and rejects whitespace-only because an empty comment in a thread is
 * noise that can't be told from a bug.
 */
export function normalizeSuggestionBody(body: string): string | null {
  const trimmed = body.trim()

  return trimmed.length > 0 && trimmed.length <= SUGGESTION_MAX_LENGTH
    ? trimmed
    : null
}
