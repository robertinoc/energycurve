import { describe, expect, it } from "vitest"

import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"
import type { ResolvedPlanCell } from "@/lib/content/site-copy"
import {
  CAPABILITIES,
  can,
  capabilitiesFor,
  type CapabilityKey,
  isAvailable,
  isCapabilityKey,
  NON_GATED_MATRIX_ROWS,
  plannedCapabilities,
  quotaFor,
  specFor,
  upgradeTargetFor,
} from "@/lib/product/capabilities"
import { PLAN_LIMITS, PLANS, type Plan } from "@/lib/product/plans"

/**
 * The point of this file: `/pricing` is a promise, and the capability registry
 * is what the code enforces. When those two drift, we either charge for
 * something we give away or advertise something we withhold — and both are
 * invisible until a customer notices.
 *
 * This is not hypothetical. The public matrix promised 2 custom taxonomies while
 * the shipped constant enforced 12, and nothing caught it for months.
 */

const rows = getSiteCopy("en").pricing.rows

function cellPlanFloor(row: {
  free: ResolvedPlanCell
  pro: ResolvedPlanCell
  proPlus: ResolvedPlanCell
}): Plan | null {
  if (row.free.kind !== "no") return "free"
  if (row.pro.kind !== "no") return "pro"
  if (row.proPlus.kind !== "no") return "pro_plus"
  return null
}

function quotaFromCell(cell: ResolvedPlanCell): number | null | "not-a-quota" {
  if (cell.kind !== "text") return "not-a-quota"
  if (/^unlimited$/i.test(cell.text)) return null

  const match = /^(\d+)/.exec(cell.text)
  return match ? Number(match[1]) : "not-a-quota"
}

describe("the pricing matrix and the capability registry agree", () => {
  it("gives every matrix row a key that is either gated or explicitly not", () => {
    for (const row of rows) {
      const known =
        isCapabilityKey(row.key) ||
        (NON_GATED_MATRIX_ROWS as readonly string[]).includes(row.key)

      expect(
        known,
        `matrix row "${row.key}" has no entry in CAPABILITIES. Add one, or list ` +
          `it in NON_GATED_MATRIX_ROWS if it describes the offer without gating code.`
      ).toBe(true)
    }
  })

  it("gives every registered capability a row on the public page", () => {
    const keys = new Set(rows.map((row) => row.key))

    for (const key of Object.keys(CAPABILITIES) as CapabilityKey[]) {
      expect(
        keys.has(key),
        `${key} is gated in code but never shown on /pricing — customers can't ` +
          `be held to a limit they were never told about.`
      ).toBe(true)
    }
  })

  it("puts each capability behind the tier the page advertises", () => {
    for (const row of rows) {
      if (!isCapabilityKey(row.key)) continue

      const advertised = cellPlanFloor(row)
      expect(advertised, `row ${row.key} is "no" on every tier`).not.toBeNull()
      expect(
        upgradeTargetFor(row.key),
        `${row.key}: /pricing says it starts at ${advertised}, the registry says ` +
          `${upgradeTargetFor(row.key)}`
      ).toBe(advertised)
    }
  })

  it("marks a capability planned exactly when the page says 'soon'", () => {
    for (const row of rows) {
      if (!isCapabilityKey(row.key)) continue

      const advertisedSoon = [row.free, row.pro, row.proPlus].some(
        (cell) => cell.kind === "soon"
      )

      expect(
        CAPABILITIES[row.key].status === "planned",
        `${row.key}: page says soon=${advertisedSoon}, registry says ` +
          `status=${CAPABILITIES[row.key].status}. A shipped feature must not be ` +
          `sold as "soon", and an unbuilt one must not look available.`
      ).toBe(advertisedSoon)
    }
  })

  it("matches every advertised number against PLAN_LIMITS", () => {
    // The check that would have caught the 2-vs-12 drift.
    let checked = 0

    for (const row of rows) {
      if (!isCapabilityKey(row.key)) continue
      const spec = specFor(row.key)
      if (!spec.limit) continue

      for (const [plan, cell] of [
        ["free", row.free],
        ["pro", row.pro],
        ["proPlus", row.proPlus],
      ] as const) {
        const advertised = quotaFromCell(cell)
        if (advertised === "not-a-quota") continue

        const planKey: Plan = plan === "proPlus" ? "pro_plus" : plan
        const enforced = PLAN_LIMITS[planKey][spec.limit]

        expect(
          enforced,
          `${row.key} on ${planKey}: /pricing advertises ${
            advertised === null ? "unlimited" : advertised
          }, PLAN_LIMITS enforces ${enforced}`
        ).toBe(advertised)
        checked += 1
      }
    }

    // Guard against the loop silently matching nothing.
    expect(checked).toBeGreaterThanOrEqual(6)
  })

  it("keeps the matrix aligned across locales", () => {
    // A translated row that drops or reorders keys would make the Spanish page
    // promise something different from the English one.
    const reference = rows.map((row) => row.key)

    for (const locale of supportedLocales) {
      expect(
        getSiteCopy(locale).pricing.rows.map((row) => row.key),
        `the ${locale} matrix has different rows than the en one`
      ).toEqual(reference)
    }
  })
})

describe("native export is never gated", () => {
  // The product loop is: analyse → fix → get it back into the booth. Paywalling
  // the last step makes the first two pointless, so this is asserted rather than
  // trusted to a code comment.
  it("is free on every tier, on the page and in the registry", () => {
    const row = rows.find((entry) => entry.key === "native_export")
    expect(row).toBeDefined()
    expect(row!.free.kind).toBe("yes")
    expect(row!.pro.kind).toBe("yes")
    expect(row!.proPlus.kind).toBe("yes")

    expect(CAPABILITIES.native_export.minPlan).toBe("free")

    for (const plan of PLANS) {
      expect(can(plan, null, "native_export")).toBe(true)
      expect(isAvailable(plan, null, "native_export")).toBe(true)
    }
  })

  it("has no PlanLimits key that could quietly start gating it", () => {
    expect(
      Object.keys(PLAN_LIMITS.free).some((key) => /export/i.test(key))
    ).toBe(false)
  })
})

describe("can()", () => {
  it("unlocks by ladder position", () => {
    expect(can("free", null, "gig_mode")).toBe(false)
    expect(can("pro", "active", "gig_mode")).toBe(false)
    expect(can("pro_plus", "active", "gig_mode")).toBe(true)
  })

  it("falls back to free limits when a subscription lapses", () => {
    // The profile keeps plan=pro so the UI can explain the lapse; entitlement
    // does not survive it.
    expect(can("pro", "active", "audio_analysis")).toBe(true)
    expect(can("pro", "trialing", "audio_analysis")).toBe(true)
    expect(can("pro", "past_due", "audio_analysis")).toBe(false)
    expect(can("pro", "canceled", "audio_analysis")).toBe(false)
    expect(can("pro", null, "audio_analysis")).toBe(false)
  })

  it("lets a boolean PlanLimits value win over the ladder", () => {
    // proWorkflow is false for pro, so a pro_plus-only capability can't leak
    // down by editing only the registry.
    expect(PLAN_LIMITS.pro.proWorkflow).toBe(false)
    expect(can("pro", "active", "global_library")).toBe(false)
  })

  it("answers about entitlement, not about existence", () => {
    // A PRO+ subscriber is entitled to Gig Mode; it just doesn't exist yet.
    expect(can("pro_plus", "active", "gig_mode")).toBe(true)
    expect(isAvailable("pro_plus", "active", "gig_mode")).toBe(false)
  })
})

describe("quotaFor()", () => {
  it("reads the counted limits per tier", () => {
    expect(quotaFor("free", null, "active_playlists")).toBe(3)
    expect(quotaFor("pro", "active", "active_playlists")).toBeNull()
    expect(quotaFor("free", null, "custom_taxonomies")).toBe(2)
    expect(quotaFor("free", null, "ai_ordering")).toBe(1)
    expect(quotaFor("pro", "active", "ai_ordering")).toBe(3)
    expect(quotaFor("pro_plus", "active", "ai_ordering")).toBeNull()
  })

  it("applies free quotas to a lapsed subscriber", () => {
    expect(quotaFor("pro", "past_due", "active_playlists")).toBe(3)
  })

  it("refuses to treat a switch as a quota", () => {
    expect(() => quotaFor("pro", "active", "audio_analysis")).toThrow(/switch/)
    expect(() => quotaFor("free", null, "analysis_core")).toThrow(/not a counted/)
  })
})

describe("registry shape", () => {
  it("only references real plans and real PlanLimits keys", () => {
    const limitKeys = Object.keys(PLAN_LIMITS.free)

    for (const key of Object.keys(CAPABILITIES) as CapabilityKey[]) {
      const spec = specFor(key)
      expect(PLANS, `${key}.minPlan`).toContain(spec.minPlan)
      if (spec.limit) {
        expect(limitKeys, `${key}.limit`).toContain(spec.limit)
      }
    }
  })

  it("grows the free tier's capability list monotonically up the ladder", () => {
    const free = capabilitiesFor("free")
    const pro = capabilitiesFor("pro")
    const proPlus = capabilitiesFor("pro_plus")

    expect(pro).toEqual(expect.arrayContaining(free))
    expect(proPlus).toEqual(expect.arrayContaining(pro))
    expect(proPlus.length).toBe(Object.keys(CAPABILITIES).length)
  })

  it("still has unbuilt capabilities, and says so", () => {
    // If this ever empties out, the "soon" badges on /pricing are stale.
    expect(plannedCapabilities().length).toBeGreaterThan(0)
  })
})
