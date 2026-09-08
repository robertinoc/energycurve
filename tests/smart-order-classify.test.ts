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

describe("classifying a smart-order failure", () => {
  it.each([
    ["a rejected key", Anthropic.AuthenticationError, 401, "not_authorized"],
    ["a forbidden key", Anthropic.PermissionDeniedError, 403, "not_authorized"],
    ["a rate limit", Anthropic.RateLimitError, 429, "rate_limited"],
    ["a request we built wrong", Anthropic.BadRequestError, 400, "bad_request"],
    ["an overloaded service", Anthropic.InternalServerError, 529, "upstream_down"],
    ["a server error", Anthropic.InternalServerError, 500, "upstream_down"],
  ] as const)("names %s", (_label, Cls, status, expected) => {
    expect(classifyFailure(apiError(Cls, status))).toBe(expected)
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
