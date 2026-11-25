import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { describe, expect, it } from "vitest"

import {
  LiveTracklist,
  smartOrderLabel,
  type SmartOrderStatus,
} from "@/components/analysis/live-tracklist"
import { ANALYSIS_UI } from "@/lib/content/analysis-copy"

/**
 * After a fallback, the Smart ordering button said "Reordered with AI" — the
 * `fallback` state shared `done`'s label — while the banner above it said the
 * AI service was unavailable. The order on screen came from the local
 * heuristic. These tests fail if the two states ever share a label again.
 */
const LOCALES = ["en", "es"] as const
const STATUSES: SmartOrderStatus[] = ["idle", "thinking", "done", "fallback"]

function renderButton(smartStatus: SmartOrderStatus, locale: "en" | "es") {
  return renderToStaticMarkup(
    createElement(LiveTracklist, {
      rows: [],
      movedCount: 0,
      onMove: () => {},
      manualMoveCount: 0,
      onUndoMove: () => {},
      dirty: false,
      smartStatus,
      onSmartOrder: () => {},
      onReset: () => {},
      locale,
    })
  )
}

describe("the Smart ordering button after a fallback", () => {
  for (const locale of LOCALES) {
    it(`never says the AI reordered the set when it didn't (${locale})`, () => {
      expect(smartOrderLabel("fallback", locale)).not.toBe(smartOrderLabel("done", locale))

      const html = renderButton("fallback", locale)
      expect(html).toContain(ANALYSIS_UI.smartOrderFallbackDone[locale])
      expect(html).not.toContain(ANALYSIS_UI.smartOrderDone[locale])
    })

    it(`gives every state its own label (${locale})`, () => {
      const labels = STATUSES.map((status) => smartOrderLabel(status, locale))
      expect(new Set(labels).size).toBe(STATUSES.length)
    })
  }

  it("still says the AI did it when it did", () => {
    expect(renderButton("done", "en")).toContain("Reordered with AI")
    expect(renderButton("done", "es")).toContain("Reordenado con IA")
  })

  it("does not describe the old ascending-energy fallback in the banner", () => {
    // The fallback is `optimizeOrder` (curve plus keys) and only reverts to the
    // energy ramp for sets too long to search, so naming the ramp misdescribes
    // almost every set that sees this banner.
    expect(ANALYSIS_UI.smartFallbackBanner.en).not.toMatch(/ascending/i)
    expect(ANALYSIS_UI.smartFallbackBanner.es).not.toMatch(/ascendente/i)
  })
})
