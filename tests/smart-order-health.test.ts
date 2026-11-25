import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SmartOrderHealthPanel } from "@/app/(en)/backstage/SmartOrderHealthPanel"
import {
  smartOrderHealth,
  toSmartOrderRuns,
  type SmartOrderRun,
} from "@/lib/backstage/smart-order-health"

/**
 * Smart ordering fell back to the heuristic for weeks — the Anthropic account
 * had no credit — and nothing in the product said so. These pin what the
 * backstage says, and above all the two things it must never blur: an outage
 * that won't clear on its own, and "zero" meaning "can't know".
 */

const claude = (at: string): SmartOrderRun => ({ createdAt: at, source: "claude", reason: null })
const fallback = (at: string, reason: SmartOrderRun["reason"]): SmartOrderRun => ({
  createdAt: at,
  source: "fallback",
  reason,
})

function html(read: Parameters<typeof smartOrderHealth>[0]) {
  return renderToStaticMarkup(
    createElement(SmartOrderHealthPanel, { health: smartOrderHealth(read) })
  ).replace(/&#x27;/g, "'")
}

describe("which state the panel is in", () => {
  it("calls an unreadable record unknown, never zero", () => {
    expect(smartOrderHealth({ available: false, cause: "not_migrated" })).toEqual({
      state: "unknown",
      cause: "not_migrated",
    })
    expect(smartOrderHealth({ available: false, cause: "read_failed" }).state).toBe("unknown")
  })

  it("calls a readable, empty record idle", () => {
    expect(smartOrderHealth({ available: true, runs: [] }).state).toBe("idle")
  })

  it("calls it down when the latest ordering fell back for a reason that won't clear", () => {
    const health = smartOrderHealth({
      available: true,
      runs: [
        claude("2026-11-10T10:00:00Z"),
        fallback("2026-11-20T10:00:00Z", "unfunded"),
        fallback("2026-11-25T10:00:00Z", "unfunded"),
        fallback("2026-11-22T10:00:00Z", "unfunded"),
      ],
    })

    expect(health).toMatchObject({
      state: "down",
      reason: "unfunded",
      streak: 3,
      since: "2026-11-20T10:00:00Z",
      summary: { total: 4, claude: 1, fallback: 3, lastClaudeAt: "2026-11-10T10:00:00Z" },
    })
  })

  it("treats every reason that needs somebody to act as an outage", () => {
    for (const reason of ["unfunded", "not_configured", "not_authorized", "model_unavailable"] as const) {
      expect(
        smartOrderHealth({ available: true, runs: [fallback("2026-11-25T10:00:00Z", reason)] }).state
      ).toBe("down")
    }
  })

  it("does not cry outage over passing failures, but flags a window that mostly fell back", () => {
    const health = smartOrderHealth({
      available: true,
      runs: [
        claude("2026-11-20T10:00:00Z"),
        fallback("2026-11-21T10:00:00Z", "timeout"),
        fallback("2026-11-22T10:00:00Z", "timeout"),
      ],
    })

    expect(health.state).toBe("degraded")
  })

  it("is healthy once the AI is making most orders, even with an old outage in the window", () => {
    const health = smartOrderHealth({
      available: true,
      runs: [
        fallback("2026-11-20T10:00:00Z", "unfunded"),
        claude("2026-11-24T10:00:00Z"),
        claude("2026-11-25T10:00:00Z"),
      ],
    })

    expect(health.state).toBe("healthy")
  })

  it("counts fallbacks by reason, most frequent first", () => {
    const health = smartOrderHealth({
      available: true,
      runs: [
        claude("2026-11-21T10:00:00Z"),
        claude("2026-11-21T11:00:00Z"),
        claude("2026-11-21T12:00:00Z"),
        fallback("2026-11-22T10:00:00Z", "rate_limited"),
        fallback("2026-11-23T10:00:00Z", "timeout"),
        fallback("2026-11-24T10:00:00Z", "timeout"),
        claude("2026-11-25T10:00:00Z"),
      ],
    })

    expect(health.state).toBe("healthy")
    if (health.state !== "healthy") return
    expect(health.summary.byReason).toEqual([
      { reason: "timeout", count: 2 },
      { reason: "rate_limited", count: 1 },
    ])
  })
})

describe("reading rows from the table", () => {
  it("keeps an unknown reason as a fallback instead of dropping it", () => {
    expect(
      toSmartOrderRuns([
        { created_at: "2026-11-25T10:00:00Z", source: "fallback", reason: "something_new" },
        { created_at: "2026-11-25T11:00:00Z", source: "claude", reason: null },
        { created_at: null, source: "claude", reason: null },
      ])
    ).toEqual([
      fallback("2026-11-25T10:00:00Z", "error"),
      claude("2026-11-25T11:00:00Z"),
    ])
  })
})

describe("what the panel says", () => {
  it("shouts an unfunded account, with the fix, as an alert", () => {
    const markup = html({
      available: true,
      runs: [fallback("2026-11-25T10:00:00Z", "unfunded"), fallback("2026-11-24T10:00:00Z", "unfunded")],
    })

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("the Anthropic account has no credit")
    expect(markup).toContain("Plans &amp; Billing")
    expect(markup).toContain("The last 2 smart orderings fell back")
    expect(markup).toContain("since 2026-11-24 10:00 UTC")
    expect(markup).toContain("reads as zero demand")
  })

  it("says 'can't know' and 'nothing happened' in words that can't be confused", () => {
    const unknown = html({ available: false, cause: "not_migrated" })
    const idle = html({ available: true, runs: [] })

    expect(unknown).toContain("can't tell whether it works")
    expect(unknown).toContain("Migration 0035")
    expect(unknown).toContain("not the same as zero failures")
    expect(unknown).not.toContain('role="alert"')

    expect(idle).toContain("Nobody asked for a smart ordering in the last 14 days")
    expect(idle).toContain("not missing data")
    expect(idle).not.toContain("can't tell")
  })

  it("shows the split and the reasons when it works", () => {
    const markup = html({
      available: true,
      runs: [
        claude("2026-11-25T10:00:00Z"),
        claude("2026-11-23T10:00:00Z"),
        fallback("2026-11-24T10:00:00Z", "timeout"),
      ],
    })

    expect(markup).toContain("Smart ordering: working")
    expect(markup).toContain("AI made 2 of 3")
    expect(markup).toContain("Timed out · 1")
    expect(markup).toContain("Last AI-made order: 2026-11-25 10:00 UTC")
  })
})
