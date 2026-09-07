import { describe, expect, it } from "vitest"

import { ANALYSIS_UI } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"

/**
 * Which model does the AI ordering is a supplier detail.
 *
 * It can change, a DJ has no use for it, and naming it in the product ties our
 * copy to someone else's brand. The strings say "the AI service"; this test
 * keeps it that way, because the leak is always one convenient sentence at a
 * time and nobody re-reads the copy file.
 */
function stringsIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) stringsIn(item, out)
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) stringsIn(item, out)
  }

  return out
}

const VENDORS = [/\bclaude\b/i, /\banthropic\b/i, /\bgpt\b/i, /\bopenai\b/i]

const COPY_SOURCES: { label: string; copy: unknown }[] = [
  { label: "analysis UI", copy: ANALYSIS_UI },
  { label: "dashboard", copy: DASHBOARD_COPY },
  ...supportedLocales.map((locale) => ({
    label: `site copy (${locale})`,
    copy: getSiteCopy(locale),
  })),
]

describe("user-facing copy names no AI vendor", () => {
  for (const { label, copy } of COPY_SOURCES) {
    it(label, () => {
      const offenders = stringsIn(copy).filter((text) =>
        VENDORS.some((vendor) => vendor.test(text))
      )

      expect(offenders).toEqual([])
    })
  }

  it("still explains every fallback without naming who failed", () => {
    for (const key of [
      "smartFallbackTimeout",
      "smartFallbackNotConfigured",
      "smartFallbackInvalid",
      "smartFallbackTruncated",
      "smartFallbackRefusal",
      "smartFallbackError",
    ] as const) {
      for (const locale of supportedLocales) {
        const text = ANALYSIS_UI[key][locale]

        // Says something, and says it about a service rather than a product.
        expect(text.length, `${key}.${locale}`).toBeGreaterThan(10)
        expect(text, `${key}.${locale}`).toMatch(/AI|IA/)
      }
    }
  })
})
