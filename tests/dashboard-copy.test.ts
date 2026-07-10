import { describe, expect, it } from "vitest"

import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { DASHBOARD_GREETINGS, pickGreeting } from "@/lib/content/greetings"
import { supportedLocales } from "@/lib/content/site-copy"
import { genreTip } from "@/lib/engine/genre-tips"

function collectLeaves(
  node: unknown,
  path: string,
  leaves: Array<{ path: string; label: Record<string, string> }>
) {
  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>
    const keys = Object.keys(record)
    const isLeaf =
      keys.length > 0 &&
      keys.every(
        (key) =>
          (supportedLocales as readonly string[]).includes(key) &&
          typeof record[key] === "string"
      )

    if (isLeaf) {
      leaves.push({ path, label: record as Record<string, string> })
      return
    }

    for (const key of keys) {
      collectLeaves(record[key], `${path}.${key}`, leaves)
    }
  }
}

describe("DASHBOARD_COPY", () => {
  it("has a non-empty string for every locale on every label", () => {
    const leaves: Array<{ path: string; label: Record<string, string> }> = []
    collectLeaves(DASHBOARD_COPY, "DASHBOARD_COPY", leaves)
    collectLeaves(CONTEXT_COPY, "CONTEXT_COPY", leaves)

    expect(leaves.length).toBeGreaterThan(50)

    for (const { path, label } of leaves) {
      for (const locale of supportedLocales) {
        expect(label[locale], `${path} (${locale})`).toBeTruthy()
      }
    }
  })

  it("keeps template slots consistent across locales", () => {
    const leaves: Array<{ path: string; label: Record<string, string> }> = []
    collectLeaves(DASHBOARD_COPY, "DASHBOARD_COPY", leaves)

    const slotsOf = (template: string) =>
      [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

    for (const { path, label } of leaves) {
      expect(slotsOf(label.es), `${path} slots`).toEqual(slotsOf(label.en))
    }
  })
})

describe("greetings", () => {
  it("has the same number of greetings per locale, all with a {name} slot", () => {
    expect(DASHBOARD_GREETINGS.es).toHaveLength(DASHBOARD_GREETINGS.en.length)

    for (const locale of supportedLocales) {
      for (const greeting of DASHBOARD_GREETINGS[locale]) {
        expect(greeting).toContain("{name}")
      }
    }
  })

  it("interpolates the name deterministically per locale", () => {
    expect(pickGreeting("Rober", "en", 0)).toBe("Welcome back, Rober")
    expect(pickGreeting("Rober", "es", 0)).toBe("Bienvenido de nuevo, Rober")
  })
})

describe("genreTip localization", () => {
  it("renders full Spanish sentences, not word swaps", () => {
    const es = genreTip("hard-techno", "main", [{ bpm: 120 }], "es")

    expect(es).toContain("suele vivir entre")
    expect(es).toContain("meseta")
    expect(es).toContain("por debajo del pocket")
    expect(es).not.toContain("usually lives")
  })

  it("defaults to English", () => {
    expect(genreTip("house", "main")).toContain("usually lives around")
  })
})
