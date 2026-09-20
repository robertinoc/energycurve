import Anthropic from "@anthropic-ai/sdk"
import { describe, expect, it } from "vitest"

import { ANALYSIS_UI } from "@/lib/content/analysis-copy"
import { classifyFailure } from "@/lib/smart-order/classify-failure"
import {
  isFallbackReason,
  type SmartOrderFallbackReason,
} from "@/lib/smart-order/stream"
import { supportedLocales } from "@/lib/content/site-copy"

/**
 * A rejected key, a rate limit, a request we built wrong and a service outage
 * are four problems with four different owners. They all read as "something
 * went wrong", which is how a real report of this reached us with nothing in it
 * to act on — and why a second round of guessing followed.
 *
 * Asserted against the SDK's real error classes rather than hand-rolled fakes:
 * what is being tested is that our `instanceof` chain matches the shapes the
 * SDK actually throws, and a fake would agree with a wrong chain.
 */

const apiError = (Cls: new (...a: never[]) => unknown, status: number) =>
  // The SDK's constructors take (status, error, message, headers).
  new (Cls as unknown as new (
    s: number,
    e: unknown,
    m: string,
    h: undefined
  ) => unknown)(status, { type: "error" }, "boom", undefined)

/**
 * What the SDK builds from a real response body. `APIError.generate` is the
 * function the client calls internally: it picks the subclass from the status,
 * lifts `.type` out of `body.error.type`, and composes `.message` as
 * `"<status> <body.error.message>"`. Constructing the subclass by hand — as the
 * helper above does — skips all three, so a test written that way can agree
 * with a classifier that would never fire in production.
 */
const fromResponse = (status: number, type: string, message: string) =>
  Anthropic.APIError.generate(
    status,
    { type: "error", error: { type, message } },
    undefined,
    new Headers()
  )

describe("classifying a smart-order failure", () => {
  it.each([
    ["a rejected key", Anthropic.AuthenticationError, 401, "not_authorized"],
    ["a forbidden key", Anthropic.PermissionDeniedError, 403, "not_authorized"],
    ["a rate limit", Anthropic.RateLimitError, 429, "rate_limited"],
    ["a request we built wrong", Anthropic.BadRequestError, 400, "bad_request"],
    ["a model this account can't use", Anthropic.NotFoundError, 404, "model_unavailable"],
    ["an overloaded service", Anthropic.InternalServerError, 529, "upstream_down"],
    ["a server error", Anthropic.InternalServerError, 500, "upstream_down"],
  ] as const)("names %s", (_label, Cls, status, expected) => {
    expect(classifyFailure(apiError(Cls, status))).toBe(expected)
  })

  /**
   * H-10. An exhausted credit balance came back as a 400 and was read as "a
   * request we built wrong", so the product blamed its own code in the banner
   * while smart ordering silently ran on the heuristic for seventy-six days.
   */
  describe("an exhausted account", () => {
    it("is not a malformed request, whatever status carries it", () => {
      // The shape actually observed on 12/09/2026: a 400 whose category is
      // `invalid_request_error`, not `billing_error`. This is the case the
      // structured check alone would still get wrong.
      expect(
        classifyFailure(
          fromResponse(
            400,
            "invalid_request_error",
            "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."
          )
        )
      ).toBe("unfunded")
    })

    it("is recognised by the API's own category, at any status", () => {
      // The signal we would rather be reading. Asserted at 403 — a status that
      // otherwise means "your key is rejected" — because the whole point of
      // checking the category before the status-shaped branches is that it
      // wins. If Anthropic ever moves this to a 402 or a 403, the reader must
      // still be sent to the invoice and not to the key.
      expect(
        classifyFailure(fromResponse(403, "billing_error", "insufficient funds"))
      ).toBe("unfunded")
      expect(
        classifyFailure(fromResponse(400, "billing_error", "insufficient funds"))
      ).toBe("unfunded")
    })

    it("does not swallow a genuinely malformed request", () => {
      // The other half of the fix: `bad_request` still has to mean "on us".
      expect(
        classifyFailure(
          fromResponse(400, "invalid_request_error", "messages.0: unexpected field")
        )
      ).toBe("bad_request")
    })

    it("tells the DJ nothing about our invoice", () => {
      // Two audiences. The banner is the wrong place to put an operational
      // embarrassment, and the DJ cannot act on it — so if this ever starts
      // mentioning credit, billing or an account balance, that is a regression
      // and not a clarification.
      for (const locale of supportedLocales) {
        const line = ANALYSIS_UI.smartFallbackUnfunded[locale]

        expect(line, locale).not.toMatch(
          /credit|cr\u00e9dito|billing|facturaci\u00f3n|invoice|factura|balance|saldo|pay|pag(ar|o)/i
        )
      }
    })
  })

  it("names a timeout, however it was raised", () => {
    const aborted = new Error("aborted")
    aborted.name = "AbortError"

    expect(classifyFailure(aborted)).toBe("timeout")
  })

  it("falls back to a generic reason for anything unrecognised", () => {
    expect(classifyFailure(new TypeError("undefined is not a function"))).toBe(
      "error"
    )
    expect(classifyFailure("a string")).toBe("error")
    expect(classifyFailure(undefined)).toBe("error")
  })

  it("has distinct, non-empty copy for every reason it can produce", () => {
    // The point of the split is that reading a banner back names the cause. Two
    // reasons sharing a sentence would quietly undo that.
    const COPY: Record<SmartOrderFallbackReason, { en: string; es: string }> = {
      not_configured: ANALYSIS_UI.smartFallbackNotConfigured,
      not_authorized: ANALYSIS_UI.smartFallbackNotAuthorized,
      rate_limited: ANALYSIS_UI.smartFallbackRateLimited,
      bad_request: ANALYSIS_UI.smartFallbackBadRequest,
      unfunded: ANALYSIS_UI.smartFallbackUnfunded,
      model_unavailable: ANALYSIS_UI.smartFallbackModelUnavailable,
      upstream_down: ANALYSIS_UI.smartFallbackUpstreamDown,
      timeout: ANALYSIS_UI.smartFallbackTimeout,
      invalid_answer: ANALYSIS_UI.smartFallbackInvalid,
      truncated: ANALYSIS_UI.smartFallbackTruncated,
      refusal: ANALYSIS_UI.smartFallbackRefusal,
      error: ANALYSIS_UI.smartFallbackError,
    }

    for (const locale of supportedLocales) {
      const lines = Object.values(COPY).map((entry) => entry[locale])

      expect(new Set(lines).size, locale).toBe(lines.length)
      expect(lines.every((line) => line.length > 10)).toBe(true)
    }

    for (const reason of Object.keys(COPY)) {
      expect(isFallbackReason(reason), reason).toBe(true)
    }
  })
})
