import { describe, expect, it } from "vitest"

import { isComplimentaryProPlus } from "@/lib/product/plans"

/**
 * These tests guard a grant, so they're written from the attacker's side: the
 * failure that matters is matching an address that shouldn't match, not missing
 * one that should.
 */
describe("isComplimentaryProPlus", () => {
  const list = "owner@example.com, demo@example.com"

  it("matches a listed address, ignoring case and surrounding space", () => {
    expect(isComplimentaryProPlus("owner@example.com", list)).toBe(true)
    expect(isComplimentaryProPlus("Owner@Example.COM", list)).toBe(true)
    expect(isComplimentaryProPlus("  demo@example.com  ", list)).toBe(true)
  })

  it("comps nobody when the list is unset or empty", () => {
    // The default for every environment that never configures this.
    expect(isComplimentaryProPlus("owner@example.com", undefined)).toBe(false)
    expect(isComplimentaryProPlus("owner@example.com", "")).toBe(false)
    expect(isComplimentaryProPlus("owner@example.com", "   ,  ,")).toBe(false)
  })

  it("refuses a partial or lookalike address", () => {
    // The whole risk: a substring or domain check would hand PRO+ to anyone who
    // can register an address that merely contains a listed one.
    expect(isComplimentaryProPlus("notowner@example.com", list)).toBe(false)
    expect(isComplimentaryProPlus("owner@example.com.attacker.net", list)).toBe(
      false
    )
    expect(isComplimentaryProPlus("owner@example", list)).toBe(false)
    expect(isComplimentaryProPlus("example.com", list)).toBe(false)
  })

  it("handles a missing email on the profile row", () => {
    expect(isComplimentaryProPlus(null, list)).toBe(false)
    expect(isComplimentaryProPlus(undefined, list)).toBe(false)
    expect(isComplimentaryProPlus("", list)).toBe(false)
  })
})
