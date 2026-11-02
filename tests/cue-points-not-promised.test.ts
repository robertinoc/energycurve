import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"
import { isCapabilityKey } from "@/lib/product/capabilities"

/**
 * Suggested CUE points are not promised anywhere public (decided 01/11/2026).
 *
 * Phase A (PR #292) measured guess()'s beat phase against Traktor's grids and
 * recommended against building CUEs on it, so /pricing stopped selling them as
 * "soon". The tier is still decided — PRO, when they ship — and it is recorded
 * in docs/conversion-plan.md instead of on the page.
 *
 * If this fails because CUEs are coming back: that is the moment to re-add the
 * matrix row and the registry entry together (tests/capabilities.test.ts holds
 * them to each other), after the beat-phase prerequisite is met.
 */
describe("suggested CUE points are not promised publicly", () => {
  it.each(supportedLocales)("no pricing row sells them (%s)", (locale) => {
    const rows = getSiteCopy(locale).pricing.rows

    expect(rows.map((row) => row.key)).not.toContain("cue_points")
    // Uppercase on purpose: the glossary and the comparisons talk about
    // "cue points" as a thing DJs have; only a promise of ours says "CUE".
    expect(JSON.stringify(getSiteCopy(locale))).not.toMatch(/\bCUEs?\b/)
  })

  it("has no registry entry, so nothing can render them as coming", () => {
    expect(isCapabilityKey("cue_points")).toBe(false)
  })

  it("keeps the tier decided, in the conversion plan", () => {
    // Line wraps and bold markers are layout, not content.
    const plan = readFileSync(join(process.cwd(), "docs/conversion-plan.md"), "utf8")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")

    expect(plan).toContain("Cuando salgan, los CUE sugeridos van en PRO")
  })
})
