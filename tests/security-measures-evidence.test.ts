import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every file `docs/compliance/security-measures.md` cites as evidence has to
 * exist.
 *
 * An Art. 32 document is read by someone deciding whether to trust the product
 * — a buyer in due diligence, an authority after an incident — and its failure
 * mode is specific: a control is removed or renamed in a refactor, and the
 * document goes on asserting it. Nobody notices, because prose does not break.
 *
 * This audit already produced that failure once. The compliance matrix listed
 * migrations 0027 and 0028 as applied; they were not, and it took a query
 * against the database to find out. A struck-through line is not something a
 * test can read, so the fix is to make the claims point at things that can be
 * checked.
 */

const DOC_PATH = "docs/compliance/security-measures.md"
const DOC = readFileSync(join(process.cwd(), DOC_PATH), "utf8")

/**
 * Paths cited inside backticks. Picked by shape — a slash and a known extension
 * — so prose about `profiles.email` or `CRON_SECRET` is not mistaken for a file.
 */
function citedPaths(): string[] {
  const matches = DOC.matchAll(/`([\w./@-]+\/[\w./@-]+\.(?:ts|tsx|yml|yaml|json|md|sql))`/g)

  return [...new Set([...matches].map((match) => match[1]))]
}

describe("the evidence exists", () => {
  const paths = citedPaths()

  it("cites a meaningful number of files, so the check isn't vacuous", () => {
    expect(paths.length).toBeGreaterThan(20)
  })

  it.each(citedPaths())("%s", (path) => {
    expect(existsSync(join(process.cwd(), path)), `${DOC_PATH} cites ${path}`).toBe(
      true
    )
  })
})

describe("the gaps stay visible", () => {
  it("still says the backup restore has never been run", () => {
    // The most serious Art. 32 gap, and the one most likely to quietly turn
    // green because "backups exist" feels like the same sentence. It is not:
    // a backup nobody restored is a hypothesis.
    expect(DOC).toMatch(/Nunca se hizo/)
    expect(DOC).toMatch(/no está cerrada/i)
  })

  it("still names the bus factor as the missing organisational measure", () => {
    expect(DOC).toMatch(/bus factor 1/i)
  })

  it("still says three controls are written and not running", () => {
    // `CRON_SECRET` unset and migrations 0027/0028 unapplied. If this ever
    // passes by accident, it is because someone edited the sentence rather than
    // the environment.
    expect(DOC).toMatch(/escritos y no corren/i)
    expect(DOC).toMatch(/CRON_SECRET/)
  })
})

describe("the linkage table covers what the gap assessment tracks", () => {
  const MATRIX = readFileSync(
    join(process.cwd(), "docs/compliance/gap-assessment.md"),
    "utf8"
  )

  it.each([
    "Art. 5(1)(f)",
    "Art. 7(3)",
    "Art. 15/20",
    "Art. 16",
    "Art. 17",
    "Art. 30",
    "Art. 32",
    "Art. 35",
  ])("maps %s to a control", (article) => {
    expect(DOC).toContain(article)
  })

  it("does not claim an article the matrix still reports as a red gap", () => {
    // Art. 18 is ❌ in the matrix. If it acquires a control here without the
    // matrix moving, the two documents disagree — and the one a reader believes
    // is whichever they opened first.
    const claimsRestriction = /\| \*\*Art\. 18\*\*/.test(DOC)
    const matrixStillRed = /\| 18 \| Limitación \| ❌/.test(MATRIX)

    expect(claimsRestriction && matrixStillRed).toBe(false)
  })
})
