import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { plannedCapabilities } from "@/lib/product/capabilities"
import { buildPricingStructuredData } from "@/lib/seo"

/**
 * Docs that contradict the code, caught in CI instead of by a reader.
 *
 * The motivating case: `docs/billing.md` carried a section called "What's
 * deliberately not here" listing "No UI — /pricing paid cards still say 'Tell me
 * when it's ready', the schema.org offers are still PreOrder" and "No quota
 * enforcement — nothing reads PLAN_LIMITS yet". By the time anyone re-read it,
 * checkout had shipped, all three offers were InStock, and four separate call
 * sites enforced quotas. The doc described the opposite of the code, which is
 * worse than having no doc, because someone acts on it.
 *
 * Prose can't be fully checked and this doesn't try. It does two things: pins a
 * generated block whose contents come from the registry, and keeps a short list of
 * specific sentences that were *proved* false, so those exact claims can't come
 * back. That second half is deliberately crude — a canary, not a parser.
 */

const read = (name: string) =>
  readFileSync(join(process.cwd(), "docs", name), "utf8")

describe("the roadmap's planned-capability block", () => {
  const BLOCK = /<!-- planned-capabilities:start -->([\s\S]*?)<!-- planned-capabilities:end -->/

  it("exists, so the assertion below isn't vacuous", () => {
    expect(BLOCK.test(read("roadmap-status.md"))).toBe(true)
  })

  it("lists exactly what the registry calls planned", () => {
    // The one part of the roadmap that cannot quietly go stale. Residency mode sat
    // in this file as "planned" after it shipped; inside the block, that fails here.
    const listed = (read("roadmap-status.md").match(BLOCK)?.[1] ?? "")
      .split("\n")
      .map((line) => line.match(/^- `([a-z0-9_]+)`$/)?.[1])
      .filter((key): key is string => Boolean(key))

    expect(listed).toEqual(plannedCapabilities())
  })
})

describe("claims that were false and must not return", () => {
  /**
   * Each entry was verified against the code at the time it was added. The `why`
   * is the evidence, so a future reader can re-check rather than trust the list.
   */
  const FORBIDDEN: Array<{
    doc: string
    pattern: RegExp
    why: string
  }> = [
    {
      doc: "billing.md",
      pattern: /offers are still `?PreOrder/i,
      why: "lib/seo.ts marks all three offers InStock — asserted below",
    },
    {
      doc: "billing.md",
      pattern: /Tell me when it's ready/i,
      why: "no such string exists anywhere in app/, lib/ or components/",
    },
    {
      doc: "billing.md",
      pattern: /No quota enforcement/i,
      why: "quotaFor() has call sites in playlist, taxonomy and smart-order, and tests/capabilities.test.ts requires one per numeric limit",
    },
  ]

  for (const { doc, pattern, why } of FORBIDDEN) {
    it(`${doc} no longer claims: ${pattern.source}`, () => {
      expect(read(doc), `Stale claim. ${why}`).not.toMatch(pattern)
    })
  }

  it("checks the PreOrder claim against the actual offers", () => {
    // The assertion above only proves the sentence is gone. This proves the fact
    // the sentence got wrong, so the pair can't both be satisfied by a doc edit
    // that hides a real regression. Read through the public builder rather than by
    // exporting the const, so the check sees what search engines actually receive.
    const graph = JSON.stringify(buildPricingStructuredData({ locale: "en" }))
    const availabilities = graph.match(/schema\.org\/(InStock|PreOrder)/g) ?? []

    expect(availabilities.length).toBeGreaterThan(0)
    expect(availabilities.every((value) => value.endsWith("InStock"))).toBe(true)
  })
})
