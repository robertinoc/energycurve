import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Signed, stateless links for public curve pages.
 *
 * A share token is the playlist id plus an HMAC of it. That buys three things a
 * database column wouldn't:
 *
 * - **Unguessable by construction.** Nobody can walk the space of playlist ids
 *   and find other people's sets, because the signature is what the route
 *   checks, not the id.
 * - **No migration, no row, no cleanup.** There is nothing to create when
 *   someone shares and nothing to garbage-collect when they stop.
 * - **The same link every time.** Sharing the same set twice produces one URL,
 *   so a DJ who posts it, deletes the post and posts again doesn't scatter
 *   orphans across the internet.
 *
 * The cost, stated plainly because it's real: **individual links can't be
 * revoked.** Rotating `CURVE_SHARE_SECRET` invalidates every link at once, and
 * that is the only revocation there is. If per-link revocation is ever needed,
 * that's the moment this grows a table — not before.
 */

/** Off unless a secret is configured, like every other optional subsystem. */
export function isCurveSharingConfigured(): boolean {
  return Boolean(process.env.CURVE_SHARE_SECRET)
}

function sign(playlistId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(playlistId)
    .digest("base64url")
    // Truncated to 128 bits. Full-length is 43 characters of URL that nobody
    // reads; 22 is still far beyond guessing, and the whole point of a shared
    // link is that it can be pasted somewhere.
    .slice(0, 22)
}

/** `<playlistId>.<signature>`, or null when sharing isn't configured. */
export function buildShareToken(playlistId: string): string | null {
  const secret = process.env.CURVE_SHARE_SECRET

  if (!secret) {
    return null
  }

  return `${playlistId}.${sign(playlistId, secret)}`
}

/**
 * Reads a token back to a playlist id, or null if it doesn't verify.
 *
 * Compared in constant time. The timing of a rejection shouldn't be a signal
 * about how much of a signature was right — that's how a forgery gets built one
 * character at a time.
 */
export function readShareToken(token: string): string | null {
  const secret = process.env.CURVE_SHARE_SECRET

  if (!secret) {
    return null
  }

  const separator = token.lastIndexOf(".")

  if (separator <= 0) {
    return null
  }

  const playlistId = token.slice(0, separator)
  const provided = token.slice(separator + 1)
  const expected = sign(playlistId, secret)

  if (provided.length !== expected.length) {
    return null
  }

  const matches = timingSafeEqual(
    Buffer.from(provided),
    Buffer.from(expected)
  )

  return matches ? playlistId : null
}
