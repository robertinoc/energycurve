import { describe, expect, it } from "vitest"

import {
  CUSTOM_NAME_MAX_LENGTH,
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
