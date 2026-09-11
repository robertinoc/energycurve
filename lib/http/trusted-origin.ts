/**
 * Browser-CSRF check: does this request claim to come from our own origin?
 *
 * Extracted from the contact route, where it had lived alone. The audit that
 * moved it here (F2) noticed the distribution was backwards: the one endpoint
 * carrying this check was the **unauthenticated contact form**, while the
 * cookie-authenticated endpoints that suspend and delete accounts had none.
 *
 * What this is and is not:
 *
 * - It is a defence against a *browser* being made to act on a logged-in user's
 *   behalf from another site. Browsers always send `Origin` on POST/PATCH/DELETE,
 *   so a forged cross-site request is caught here.
 * - It is **not** authentication. A request with no `Origin` and no `Referer`
 *   passes, deliberately: curl, a server-to-server caller and a health probe all
 *   send neither, and refusing them would break non-browser use without stopping
 *   an attacker, who can also send neither. The session cookie is what proves who
 *   is asking; this only narrows *where from*.
 *
 * Both headers are checked because a request can carry either: `Origin` is
 * compared exactly, `Referer` by prefix, since it carries a full path.
 */
export function isTrustedOrigin(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  if (origin && origin !== requestOrigin) {
    return false
  }

  if (referer && !referer.startsWith(requestOrigin)) {
    return false
  }

  return true
}
