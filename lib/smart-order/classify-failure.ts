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

  if (error instanceof Anthropic.APIError) {
    // Includes 529 (overloaded), which is the service's own problem and the one
    // case where "try again shortly" is real advice rather than a brush-off.
    return typeof error.status === "number" && error.status >= 500
      ? "upstream_down"
      : "error"
  }

  return "error"
}
