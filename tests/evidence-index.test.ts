import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The evidence index has to point at documents that exist.
 *
 * It is the first page of a data room: someone opens it, picks a row, and
 * follows the link. A row pointing at a document that was renamed or never
 * landed does more damage than a missing index, because it converts "here is
 * our evidence" into "they did not check their own index".
 *
 * This audit has already produced the same failure twice in prose — a
 * compliance matrix listing migrations that were not applied, and a processor
 * list naming a vendor the code never calls. Both were caught by measuring
 * rather than reading. This is the same idea aimed at the index.
 */

const INDEX_PATH = "docs/audit360/evidence-index.md"
const INDEX = readFileSync(join(process.cwd(), INDEX_PATH), "utf8")

/**
 * Rows cite documents as `` `qa/test-strategy.md` `` — relative to `docs/`,
 * because spelling `docs/` on every row of every table is noise a reader skips.
 */
function citedDocs(): Array<{ path: string; pending: boolean }> {
  const rows = INDEX.split("\n").filter((line) => line.trim().startsWith("|"))
  const found = new Map<string, boolean>()

  for (const row of rows) {
    for (const match of row.matchAll(/`([\w./@-]+\.(?:md|json))`/g)) {
      const path = `docs/${match[1]}`
      // A row may name a document that is still in an open pull request. That is
      // allowed exactly once — when it says so on the row — because the
      // alternative is an index that is wrong for as long as review takes.
      const pending = /llega con el PR #\d+/.test(row)

      found.set(path, (found.get(path) ?? false) || pending)
    }
  }

  return [...found].map(([path, pending]) => ({ path, pending }))
}

const docs = citedDocs()

describe("the index was read", () => {
  it("cites a meaningful number of documents", () => {
    expect(docs.length).toBeGreaterThan(15)
  })

  it("marks at most one row as pending, so the exception stays an exception", () => {
    expect(docs.filter((doc) => doc.pending).length).toBeLessThanOrEqual(1)
  })
})

describe("every document it cites exists", () => {
  it.each(docs.filter((doc) => !doc.pending))("$path", ({ path }) => {
    expect(existsSync(join(process.cwd(), path)), `${INDEX_PATH} cites ${path}`).toBe(
      true
    )
  })
})

describe("the index keeps the uncomfortable half", () => {
  it("lists what was never tested, as its own section", () => {
    // Scattered through twelve documents' limitations sections, and repeated
    // here on purpose: it is the first thing a sceptical buyer looks for, and
    // making them assemble it themselves reads as hiding it.
    expect(INDEX).toMatch(/lo que NO se probó/i)
  })

  it.each([
    [/cuentas reales/i, "no test against real accounts"],
    [/pentest/i, "no penetration test"],
    [/restauración de backups nunca/i, "backup restore never run"],
    [/bajo carga/i, "never load tested"],
    [/consolas no se auditaron/i, "consoles not audited"],
  ])("still admits: %s", (pattern) => {
    expect(INDEX).toMatch(pattern)
  })
})

describe("the baseline is reproducible", () => {
  const BASELINE = readFileSync(
    join(process.cwd(), "docs/audit360/baseline.md"),
    "utf8"
  )

  it("gives the commands that regenerate its own numbers", () => {
    // A baseline nobody can retake is a screenshot, not a measurement.
    expect(BASELINE).toMatch(/npx vitest run --coverage/)
    expect(BASELINE).toMatch(/npx playwright test --list/)
  })

  it("states the scoring rule before any score exists", () => {
    // Written ahead of the scorecard so a grade cannot be tuned to the
    // conclusion someone wants. The load-bearing half is the first rule.
    expect(BASELINE).toMatch(/no puntúa como control/i)
  })
})
