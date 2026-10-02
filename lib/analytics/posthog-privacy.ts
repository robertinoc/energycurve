import type { CaptureResult } from "posthog-js"

/**
 * What the PostHog SDK is allowed to put in an event about where it came from.
 *
 * ## Three different things, which the privacy copy used to treat as one (H-17)
 *
 * The banner and the privacy policy promise PostHog does not get the visitor's
 * IP. Until 02/10/2026 the only thing backing that was `ip: false` in
 * `posthog.init` — an option `posthog-js` 1.396.6 ignores, and says so in its own
 * source ("has NO EFFECT AT ALL"). Replacing it is not the same as making the
 * promise true, so it is worth being exact about which part each layer covers:
 *
 * 1. **The event payload — this file, guaranteed by code.** `stripClientIp`
 *    removes `$ip` from an event's properties and person properties before it
 *    is sent. The SDK at this version never writes `$ip` itself (verified by
 *    reading a real request, `e2e/posthog-payload.spec.ts`), so today this is
 *    defence in depth: it holds if a later SDK starts adding it, or if anyone
 *    registers it as a super property.
 * 2. **What PostHog keeps — a project setting, not code.** Every request still
 *    reaches `us.i.posthog.com` from the visitor's browser, so PostHog sees the
 *    IP on the connection and derives `$ip` and GeoIP from it server-side.
 *    Whether it stores that is the project's "Discard client IP data" switch.
 *    Nothing in this repository can read or change it.
 * 3. **Whether PostHog sees the IP at all — only a proxy.** The one way the IP
 *    never reaches PostHog is that the browser never talks to PostHog: a
 *    reverse proxy on our own domain that forwards events without the client's
 *    address. There is none today.
 *
 * So the sentence the product can stand behind is "PostHog does not keep your
 * IP" (2, if the setting is on) — not "we do not send it your IP" (which would
 * need 3).
 */

/** Event fields that identify where a visitor connected from. */
export const CLIENT_IP_PROPERTIES = ["$ip"] as const

function withoutClientIp<T extends Record<string, unknown> | undefined>(
  properties: T
): T {
  if (!properties) {
    return properties
  }

  const copy: Record<string, unknown> = { ...properties }

  for (const key of CLIENT_IP_PROPERTIES) {
    delete copy[key]
  }

  return copy as T
}

/**
 * `before_send` hook: the event, minus any client IP it carries.
 *
 * Returns a new object rather than editing the SDK's in place, and passes
 * `null` through — `null` is how a previous hook in a chain drops an event, and
 * turning it back into an event would undo that decision.
 */
export function stripClientIp(event: CaptureResult | null): CaptureResult | null {
  if (!event) {
    return event
  }

  return {
    ...event,
    properties: withoutClientIp(event.properties),
    $set: withoutClientIp(event.$set),
    $set_once: withoutClientIp(event.$set_once),
  }
}
