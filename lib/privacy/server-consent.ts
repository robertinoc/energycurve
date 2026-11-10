import "server-only"

import { cookies, headers } from "next/headers"

import { CONSENT_COOKIE_NAME, CONSENT_COOKIE_VALUE } from "@/lib/privacy/consent"

/**
 * What the server can say about the analytics answer of the browser that sent
 * the current request.
 *
 * - `granted` — the browser mirrored a "yes" for the current consent version
 *   and is not sending Do Not Track or Global Privacy Control.
 * - `absent` — no such cookie, a different value, DNT or Sec-GPC. Refused,
 *   never answered and an old version all land here, on purpose: the server
 *   cannot tell them apart and does not need to.
 * - `unknown` — the request could not be read at all (outside a request, a
 *   framework error). Kept apart from `absent` only so a test and a log can
 *   tell "no" from "could not ask"; every caller treats it as no.
 *
 * The cookie is a mirror of what `lib/privacy/consent.ts` stores in the
 * browser, written only while the answer is "granted". See that file's header
 * for why it exists at all.
 */
export type ServerConsent = "granted" | "absent" | "unknown"

/** The decision, without the framework — what the tests pin. */
export function consentFromRequest(
  cookieValue: string | undefined,
  doNotTrack: string | null,
  globalPrivacyControl: string | null = null
): ServerConsent {
  // Either header is the browser answering on the person's behalf, exactly
  // as `readConsent` treats them in the browser. A cookie that outlived a
  // signal turned on later does not outrank it: someone who accepted months
  // ago and enables GPC today has withdrawn, and in California the signal is
  // a legally binding opt-out, not a preference. The spec value for Sec-GPC
  // is exactly "1".
  if (doNotTrack === "1" || doNotTrack === "yes") {
    return "absent"
  }

  if (globalPrivacyControl === "1") {
    return "absent"
  }

  return cookieValue === CONSENT_COOKIE_VALUE ? "granted" : "absent"
}

/**
 * Reads the current request. Never throws: a failure here is a lost event,
 * never a lost request (lib/analytics/posthog-server.ts depends on that).
 */
export async function readServerConsent(): Promise<ServerConsent> {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])

    return consentFromRequest(
      cookieStore.get(CONSENT_COOKIE_NAME)?.value,
      headerStore.get("dnt"),
      headerStore.get("sec-gpc")
    )
  } catch {
    return "unknown"
  }
}
