import { describe, expect, it } from "vitest"

import {
  ANALYSIS_UI,
  CONTEXT_DISPLAY_NAMES,
  CONTEXT_LABELS,
  ISSUE_COPY,
  SEVERITY_LABELS,
  SUBSCORE_LABELS,
} from "@/lib/content/analysis-copy"
import { supportedLocales } from "@/lib/content/site-copy"

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

function allLeaves() {
  const leaves: Array<{ path: string; label: Record<string, string> }> = []
  collectLeaves(ANALYSIS_UI, "ANALYSIS_UI", leaves)
  collectLeaves(CONTEXT_LABELS, "CONTEXT_LABELS", leaves)
  collectLeaves(CONTEXT_DISPLAY_NAMES, "CONTEXT_DISPLAY_NAMES", leaves)
  collectLeaves(SEVERITY_LABELS, "SEVERITY_LABELS", leaves)
  collectLeaves(SUBSCORE_LABELS, "SUBSCORE_LABELS", leaves)
  collectLeaves(ISSUE_COPY, "ISSUE_COPY", leaves)
  return leaves
}

describe("analysis-copy", () => {
  it("has a non-empty string for every locale on every label", () => {
    const leaves = allLeaves()
    expect(leaves.length).toBeGreaterThan(40)

    for (const { path, label } of leaves) {
      for (const locale of supportedLocales) {
        expect(label[locale], `${path} (${locale})`).toBeTruthy()
      }
    }
  })

  it("keeps template slots consistent across locales", () => {
    const slotsOf = (template: string) =>
      [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

    for (const { path, label } of allLeaves()) {
      expect(slotsOf(label.es), `${path} slots`).toEqual(slotsOf(label.en))
    }
  })
})
