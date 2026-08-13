import { describe, expect, it } from "vitest"

import {
  CUSTOM_NAME_MAX_LENGTH,
  atTaxonomyLimit,
  normalizeCustomName,
  validateCustomName,
} from "@/lib/playlists/taxonomy-validation"

describe("custom taxonomy name validation", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeCustomName("  Sunset   Session ")).toBe("Sunset Session")
  })

  it("accepts names between 2 and 32 characters", () => {
    expect(validateCustomName("Sunset")).toBe("Sunset")
    expect(validateCustomName("  After ")).toBe("After")
    expect(validateCustomName("ab")).toBe("ab")
    expect(validateCustomName("a".repeat(CUSTOM_NAME_MAX_LENGTH))).toBe(
      "a".repeat(CUSTOM_NAME_MAX_LENGTH)
    )
  })

  it("rejects too-short, too-long, and blank names", () => {
    expect(validateCustomName("a")).toBeNull()
    expect(validateCustomName("   ")).toBeNull()
    expect(validateCustomName("")).toBeNull()
    expect(
      validateCustomName("a".repeat(CUSTOM_NAME_MAX_LENGTH + 1))
    ).toBeNull()
  })
})

describe("custom taxonomy plan limit", () => {
  it("blocks creation at the cap", () => {
    expect(atTaxonomyLimit({ used: 1, limit: 2 })).toBe(false)
    expect(atTaxonomyLimit({ used: 2, limit: 2 })).toBe(true)
  })

  it("treats null as unlimited", () => {
    // PRO and PRO+ have no cap; the convention matches PlanLimits.
    expect(atTaxonomyLimit({ used: 500, limit: null })).toBe(false)
  })

  it("blocks rather than hides when a user is already over the cap", () => {
    // The settled behaviour: someone who downgrades, or who was over when a
    // limit tightened, keeps everything they made and simply can't add more.
    // Only creation is gated — nothing here deletes or conceals.
    expect(atTaxonomyLimit({ used: 9, limit: 2 })).toBe(true)
  })

  it("handles a zero cap without letting one through", () => {
    expect(atTaxonomyLimit({ used: 0, limit: 0 })).toBe(true)
  })
})
