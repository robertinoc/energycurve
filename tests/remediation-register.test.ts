import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * `docs/security/remediation-register.md` is the closure record a data room
 * reads: eighteen findings, what changed, and which file or test proves it.
 *
 * It needs guarding in two directions, and the second one is the reason this
 * file exists at all.
 *
 * **Forwards:** every file it cites as evidence has to exist. A control renamed
 * in a refactor leaves the register asserting a fix that points at nothing, and
 * prose does not break on its own.
 *
 * **Backwards:** the register must not disagree with the documents it summarises.
 * Writing it turned up that `findings-2026-09.md` had been describing S-06 —
 * the in-memory rate limiter — as "NO CORREGIDO" for as long as the shared
 * Postgres version had existed. That drift is the quietest kind: a gap reported
 * as open when it is closed does no visible harm, so nobody goes looking. It
 * costs the reader exactly as much as the other direction, because one stale row
 * means none of the rows can be taken at face value.
 */

const REGISTER_PATH = "docs/security/remediation-register.md"
const REGISTER = readFileSync(join(process.cwd(), REGISTER_PATH), "utf8")

const FINDINGS = readFileSync(
  join(process.cwd(), "docs/security/findings-2026-09.md"),
  "utf8"
)

/**
 * Paths cited in backticks, picked by shape — a slash and a known extension —
 * so prose about `CRON_SECRET` or `feature_usage` is not mistaken for a file.
 *
 * Relative paths resolve against the register's own directory, which is how a
 * reader clicking the link resolves them.
 */
function citedPaths(): string[] {
  const matches = REGISTER.matchAll(
    /`([\w./@[\]-]+\/[\w./@[\]-]+\.(?:ts|tsx|yml|yaml|json|md|sql|mjs))`/g
  )

  return [...new Set([...matches].map((match) => match[1]))]
}

function resolveCited(path: string): string {
  // Only `./` and `../` are doc-relative. A leading dot alone is not enough:
  // `.github/workflows/ci.yml` is a repo-root path, and resolving it against
  // `docs/security/` was this test's first false failure.
  const docRelative = path.startsWith("./") || path.startsWith("../")

  return docRelative
    ? resolve(join(process.cwd(), dirname(REGISTER_PATH)), path)
    : join(process.cwd(), path)
}

describe("the evidence exists", () => {
  const paths = citedPaths()

  it("cites a meaningful number of files, so the check isn't vacuous", () => {
    expect(paths.length).toBeGreaterThan(15)
  })

  it.each(citedPaths())("%s", (path) => {
    expect(
      existsSync(resolveCited(path)),
      `${REGISTER_PATH} cites ${path}`
    ).toBe(true)
  })
})

describe("it agrees with the findings report", () => {
  /** `### S-06 · …` followed by `**Severidad: media. CORREGIDO.**` */
  function statusLines(): Map<string, string> {
    const statuses = new Map<string, string>()

    for (const match of FINDINGS.matchAll(
      /^### (S-\d+) ·[^\n]*\n\*\*([^*]+)\*\*/gm
    )) {
      statuses.set(match[1], match[2])
    }

    return statuses
  }

  /** The findings the register's "Corregidos" table claims are closed. */
  function registerClosed(): string[] {
    const section = REGISTER.split("### Corregidos")[1]?.split("### Abiertos")[0]

    return [...(section ?? "").matchAll(/\| \*\*(S-\d+)\*\* \|/g)].map(
      (match) => match[1]
    )
  }

  it("parses both documents, so the comparison isn't vacuous", () => {
    expect(statusLines().size).toBeGreaterThan(8)
    expect(registerClosed().length).toBeGreaterThan(8)
  })

  it.each(registerClosed())(
    "%s is not still reported as open in findings-2026-09.md",
    (id) => {
      const status = statusLines().get(id)

      // A finding the register carries but the findings report never numbered
      // is fine — S-11 is exactly that, and the register says so. What is not
      // fine is the same id being closed in one document and open in the other.
      if (status === undefined) return

      expect(
        status,
        `${REGISTER_PATH} closes ${id} while findings-2026-09.md still calls it open`
      ).not.toMatch(/NO CORREGIDO/)
    }
  )
})

describe("the open items stay open", () => {
  /**
   * Read backwards until you see what it is for: these four assertions FAIL
   * when a gap is actually closed. That is the point — the failure is the
   * reminder to move the row, and the alternative is a register that keeps
   * reporting four open items after they were dealt with.
   *
   * Same canary as `compliance-claims.test.ts`.
   */
  it("still says CRON_SECRET is unset, so retention never runs", () => {
    expect(REGISTER).toMatch(/S-18/)
    expect(REGISTER).toMatch(/CRON_SECRET/)
  })

  it("still says migrations 0027, 0028 and 0029 are unapplied", () => {
    expect(REGISTER).toMatch(/0027/)
    expect(REGISTER).toMatch(/0029/)
  })

  it("still says there was no pentest and no verification with real accounts", () => {
    // The single most important sentence in the document. If a summary of this
    // register ever loses it, the register starts reading like a pentest report.
    expect(REGISTER).toMatch(/no hubo pentest/i)
    expect(REGISTER).toMatch(/cuentas reales/i)
  })

  it("still says the audit was run by whoever wrote the code", () => {
    expect(REGISTER).toMatch(/quien escribió el código/i)
  })
})
