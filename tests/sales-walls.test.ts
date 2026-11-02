import { describe, expect, it } from "vitest"

import { SALES_WALLS, aiOrderingUpgrade, isSalesWall } from "@/lib/product/sales-walls"

describe("the sales walls", () => {
  it("are stable ids, each once", () => {
    expect(new Set(SALES_WALLS).size).toBe(SALES_WALLS.length)
    expect(isSalesWall("playlist_limit")).toBe(true)
    expect(isSalesWall("pricing")).toBe(false)
    expect(isSalesWall(undefined)).toBe(false)
  })
})

describe("which plan gives more AI orderings", () => {
  it("FREE goes to PRO, PRO to PRO+, PRO+ nowhere", () => {
    expect(aiOrderingUpgrade("free", null)).toBe("pro")
    expect(aiOrderingUpgrade("pro", "active")).toBe("pro_plus")
    expect(aiOrderingUpgrade("pro_plus", "active")).toBeNull()
  })

  it("reads a lapsed subscription as the allowance it actually has", () => {
    // A PRO past its due date is on FREE's allowance; PRO is what restores it.
    expect(aiOrderingUpgrade("pro", "canceled")).toBe("pro")
  })
})
