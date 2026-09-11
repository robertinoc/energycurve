import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Canaries for the claims in `docs/compliance/gap-assessment.md`.
 *
 * A gap assessment rots in one specific direction: someone closes a gap, and
 * the document keeps reporting it as open. That is not harmless — a reader who
 * finds one stale red entry stops trusting the green ones, and a remediation
 * plan whose top item is already done wastes the attention of whoever picks it
 * up.
 *
 * So the entries that are *checkable from the code* get checked. Each test here
 * fails when the gap **closes**, which reads backwards until you see what it is
 * for: the failure is the reminder to update the matrix in the same change that
 * fixed the thing.
 */

const MATRIX = readFileSync(
  join(process.cwd(), "docs/compliance/gap-assessment.md"),
  "utf8"
)

function source(relative: string): string {
  const path = join(process.cwd(), relative)

  return existsSync(path) ? readFileSync(path, "utf8") : ""
}

describe("the matrix read itself", () => {
  it("found the document", () => {
    expect(MATRIX).toMatch(/Matriz de cumplimiento/)
  })
})

describe("Art. 16 — rectification", () => {
  it("is still reported as a gap, and still is one", () => {
    expect(MATRIX).toMatch(/\| 16 \| Rectificación \| ❌/)

    // The account page is the only place this could live. When a name or email
    // edit lands, this test fails and the matrix has to be updated with it.
    const accountPage = source("app/dashboard/account/page.tsx")
    const hasEditSurface = /full_name|updateProfile|rectif/i.test(accountPage)

    expect(hasEditSurface).toBe(false)
  })
})

describe("Art. 17 — erasure", () => {
  it("is still admin-only", () => {
    expect(MATRIX).toMatch(/\| 17 \| Supresión \| ❌/)

    // `deleteUserEverywhere` exists and is tested — what is missing is a user
    // -facing way to reach it. If a self-serve route appears, the matrix is
    // stale from that commit.
    const selfServe = existsSync(
      join(process.cwd(), "app/api/account/delete/route.ts")
    )

    expect(selfServe).toBe(false)
  })
})

describe("Art. 5(1)(a) — the legal copy calls itself a placeholder", () => {
  it("still does, so the ⚠️ is still earned", () => {
    expect(MATRIX).toMatch(/se autodeclara "placeholder"/)
    expect(source("lib/content/legal-copy.ts")).toMatch(/Placeholder/i)
  })
})

describe("Art. 5(1)(e) — retention is written and not running", () => {
  it("names every window the code implements", () => {
    const retention = source("services/retention-service.ts")

    // Three constants, three windows. A fourth sweep landing without a line in
    // the matrix is exactly the drift this file exists to catch.
    const windows = [...retention.matchAll(/export const (\w+_RETENTION_DAYS)/g)]

    expect(windows).toHaveLength(3)
    expect(MATRIX).toMatch(/tres ventanas/i)
  })

  it("still depends on a secret that is checked before anything is deleted", () => {
    // The claim in the matrix is that nothing runs without CRON_SECRET. That is
    // only true while the route refuses without it.
    const cron = source("app/api/cron/retention/route.ts")

    expect(cron).toMatch(/CRON_SECRET/)
    expect(cron).toMatch(/503/)
  })
})

describe("CCPA/CPRA", () => {
  it("is reported as not applicable on thresholds, not on geography", () => {
    // The wrong reason to exclude CCPA is "we're not in California" — the
    // operator is a US company selling worldwide. The right one is the
    // thresholds, and the matrix has to say which.
    expect(MATRIX).toMatch(/25M|100\.000|100,000/)
  })
})
