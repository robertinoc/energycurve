/**
 * Next's hook for errors that never reached `logError`.
 *
 * `logError` covers everything the code decided to catch. This covers the rest:
 * a throw in a route handler, a rejected promise in a server component, the
 * failures nobody anticipated — which are exactly the ones worth being told
 * about, because an unanticipated error is the definition of a thing no test
 * covers.
 *
 * Built into Next 16, so it costs no dependency.
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string }
) {
  const { logError } = await import("@/lib/observability/logger")

  // Routed through logError rather than straight to Sentry so an unhandled
  // error lands in stdout too, in the same shape as every handled one. Two
  // formats for the same thing is how a grep during an incident misses half.
  logError("request.unhandled", error, {
    // The route pattern ("/dashboard/playlists/[id]"), never request.path — a
    // real path carries ids, and share tokens live in one.
    kind: context.routerKind ?? null,
    source: context.routePath ?? null,
    status: context.routeType ?? null,
  })
}
