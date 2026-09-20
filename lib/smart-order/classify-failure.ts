import Anthropic from "@anthropic-ai/sdk"

import type { SmartOrderFallbackReason } from "@/lib/smart-order/stream"

/**
 * Turns a thrown failure into the reason the DJ is shown.
 *
 * Everything used to collapse into one "something went wrong", which is how a
 * real report of this arrived with nothing in it to act on: a rejected key, a
 * rate limit, a request we built wrong and a service outage are four different
 * problems with four different owners, and from the outside they were
 * indistinguishable. Each now says which it is — specifically enough that
 * reading the banner back names the HTTP status, without putting a status code
 * in front of someone who came here to order a set.
 *
 * Kept in its own module, separate from the route, so it can be tested against
 * the SDK's real error classes instead of a hand-rolled imitation of them. Not
 * in `stream.ts`: that one is imported by a client component, and it has no
 * business pulling the Anthropic SDK into the browser bundle.
 */
export function classifyFailure(error: unknown): SmartOrderFallbackReason {
  if (
    error instanceof Anthropic.APIConnectionTimeoutError ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return "timeout"
  }

  // Before the status-shaped branches: an unfunded account is the same problem
  // whatever status it arrives under, and reading it as "your key is wrong"
  // would send the reader to the same wrong place as reading it as "our code is
  // wrong" did.
  if (error instanceof Anthropic.APIError && isUnfunded(error)) {
    return "unfunded"
  }

  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return "not_authorized"
  }

  if (error instanceof Anthropic.RateLimitError) {
    return "rate_limited"
  }

  if (error instanceof Anthropic.BadRequestError) {
    return "bad_request"
  }

  // A 404 from the Messages API means the model we asked for isn't available to
  // this account — not that a URL is wrong. Its own reason because the fix is
  // specific and nothing else in this list points at it: change the model, or
  // get the account access to it.
  if (error instanceof Anthropic.NotFoundError) {
    return "model_unavailable"
  }

  if (error instanceof Anthropic.APIError) {
    // Includes 529 (overloaded), which is the service's own problem and the one
    // case where "try again shortly" is real advice rather than a brush-off.
    return typeof error.status === "number" && error.status >= 500
      ? "upstream_down"
      : "error"
  }

  return "error"
}

/**
 * Was this "the account has no money" rather than "the request was wrong"?
 *
 * This distinction cost seventy-six days. Anthropic answers an exhausted credit
 * balance with a **400**, and a 400 was read as `bad_request` — so the banner
 * told every DJ *"we asked the AI service for something it wouldn't accept —
 * that one's on us"*. The product blamed its own code, loudly and wrongly, and
 * nobody went to look at the invoice while smart ordering silently ran on the
 * heuristic.
 *
 * ## Why two signals, and which one is the real one
 *
 * `error.type` is the API's own category, and the SDK types it as a union that
 * includes `billing_error` (see `resources/shared.d.ts`). **That is the signal
 * to trust**: it is structured, it is versioned with the SDK, and it survives
 * any rewording of the sentence.
 *
 * The message check exists because it is what we actually observed on
 * 12/09/2026 — the credit-balance refusal arrived as `invalid_request_error`,
 * not as `billing_error`. So the typed category is either newer than that
 * response or reserved for something else, and relying on it alone would keep
 * shipping the bug we are here to fix.
 *
 * The substring is deliberately the shortest phrase that identifies the
 * condition rather than the whole sentence. "Please go to Plans & Billing to
 * upgrade or purchase credits" is marketing copy and will be rewritten;
 * "credit balance" is the name of the thing and cannot be dropped without the
 * message ceasing to say what it says.
 *
 * If Anthropic starts sending `billing_error`, the first branch takes over and
 * the second becomes dead weight that costs nothing. That asymmetry is the
 * point: a stale structured check is harmless, a missing one is another
 * seventy-six days.
 */
function isUnfunded(error: InstanceType<typeof Anthropic.APIError>): boolean {
  if (error.type === "billing_error") {
    return true
  }

  return /credit balance/i.test(error.message ?? "")
}
