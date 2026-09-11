import "server-only"

/**
 * Sending errors to Sentry without the SDK.
 *
 * `@sentry/nextjs` brings fourteen direct dependencies — rollup, OpenTelemetry
 * and a *webpack* plugin — into a project with twenty-three that builds with
 * Turbopack. What it buys over this file is browser errors and source-mapped
 * stacks; what we actually needed was to be told when the server breaks. The AI
 * ordering never once worked in production and a user on a phone is how we found
 * out. That error went through `logError` on the very first request.
 *
 * So this hangs off `logError`, which the whole server already funnels through,
 * plus `onRequestError` for the throws nobody caught.
 *
 * ## The part that matters more than the transport
 *
 * **Emails already flow through the logger** — `auth.password_reset_rate_limited`
 * and friends pass one. Forwarding metadata verbatim would ship user emails to a
 * new processor in the US, which is precisely the kind of quiet leak this
 * codebase keeps catching in other people's code.
 *
 * So metadata is **allow-listed, not denied**. A key that isn't on the list is
 * dropped and replaced with a marker naming it, so the next person sees that
 * something was there and can add it deliberately rather than discovering an
 * empty object. The export leak taught the same lesson from the other side: a
 * denylist misses exactly the fields nobody thought of.
 */

/** Keys safe to forward: opaque ids and low-cardinality facts, never free text. */
const FORWARDABLE = new Set([
  "profileId",
  "playlistId",
  "trackId",
  "versionId",
  "analysisId",
  "capability",
  "kind",
  "status",
  "statusCode",
  "format",
  "source",
  "count",
  "rows",
  "retentionDays",
  "cleared",
  "plan",
  "locale",
  "key",
])

export interface SentryDsn {
  host: string
  projectId: string
  publicKey: string
}

/**
 * Splits a DSN into what the ingest call needs.
 *
 * Returns null rather than throwing on anything malformed: a typo in an env var
 * must not be able to take a request down, and the caller treats null the same
 * way it treats "not configured".
 */
export function parseDsn(dsn: string | undefined): SentryDsn | null {
  if (!dsn) {
    return null
  }

  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\//, "")

    if (!url.username || !projectId) {
      return null
    }

    return { host: url.host, projectId, publicKey: url.username }
  } catch {
    return null
  }
}

/** Metadata reduced to what may leave the building. */
export function scrubMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const safe: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (!FORWARDABLE.has(key)) {
      // Named rather than silently absent: an empty object tells the next
      // person nothing, and "[dropped]" tells them where to look.
      safe[key] = "[dropped: not on the forward list]"
      continue
    }

    // Even an allowed key only forwards a scalar. A nested object is where an
    // email hides — `error: { message: "no such user dj@example.com" }`.
    safe[key] =
      value === null || ["string", "number", "boolean"].includes(typeof value)
        ? value
        : "[dropped: not a scalar]"
  }

  return safe
}

export interface SentryEvent {
  event_id: string
  timestamp: number
  platform: "node"
  level: "error"
  logger: string
  environment: string
  release?: string
  message: string
  extra: Record<string, unknown>
  exception?: {
    values: { type: string; value: string; stacktrace?: { frames: [] } }[]
  }
}

export function buildEvent({
  event,
  error,
  metadata,
  environment,
  release,
  now = Date.now(),
  eventId = crypto.randomUUID().replace(/-/g, ""),
}: {
  event: string
  error: unknown
  metadata: Record<string, unknown>
  environment: string
  release?: string
  now?: number
  eventId?: string
}): SentryEvent {
  const built: SentryEvent = {
    event_id: eventId,
    timestamp: now / 1000,
    platform: "node",
    level: "error",
    // Grouping key. The log event name — "smart_order.failed" — is a far better
    // fingerprint than an exception message, which often carries an id and would
    // scatter one fault across hundreds of issues.
    logger: event,
    environment,
    message: event,
    extra: scrubMetadata(metadata),
  }

  if (release) {
    built.release = release
  }

  if (error instanceof Error) {
    built.exception = {
      values: [{ type: error.name, value: error.message }],
    }
  }

  return built
}

/**
 * How many events one process will send per minute.
 *
 * A failing dependency produces errors in a loop, and the first thing an
 * unbounded reporter does in an incident is turn one outage into two by
 * spending the whole Sentry quota in a minute.
 */
export const MAX_EVENTS_PER_MINUTE = 60

let windowStartedAt = 0
let sentInWindow = 0

/** Exported for tests; nothing in the app calls it. */
export function resetReporterBudget() {
  windowStartedAt = 0
  sentInWindow = 0
}

export function withinBudget(now = Date.now()): boolean {
  if (now - windowStartedAt >= 60_000) {
    windowStartedAt = now
    sentInWindow = 0
  }

  if (sentInWindow >= MAX_EVENTS_PER_MINUTE) {
    return false
  }

  sentInWindow += 1
  return true
}

/**
 * Fire and forget. Never awaited, never throws, never delays a response.
 *
 * An error reporter that can fail the request it is reporting on is worse than
 * no reporter, so every failure path here ends in silence.
 */
export function reportToSentry(
  event: string,
  error: unknown,
  metadata: Record<string, unknown>
): void {
  const dsn = parseDsn(process.env.SENTRY_DSN)

  if (!dsn || !withinBudget()) {
    return
  }

  const payload = buildEvent({
    event,
    error,
    metadata,
    environment: process.env.VERCEL_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  })

  void fetch(`https://${dsn.host}/api/${dsn.projectId}/store/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": [
        "Sentry sentry_version=7",
        `sentry_key=${dsn.publicKey}`,
        "sentry_client=energycurve/1.0",
      ].join(", "),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3_000),
  }).catch(() => {
    // Deliberately empty, and deliberately not logged: logError is what called
    // us, so logging here would be a loop that reports its own failure to report.
  })
}
