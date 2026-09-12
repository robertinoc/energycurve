import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getLegalCopy } from "@/lib/content/legal-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

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
  it("is partly closed: the name is self-serve, the email is not", () => {
    // This test used to assert the opposite. Its failing is what carried the
    // news that the gap had closed — which is the direction a gap assessment
    // rots in, and the reason these canaries point this way.
    expect(MATRIX).toMatch(/\| 16 \| Rectificación \| ⚠️/)

    const action = source("app/dashboard/account/actions.ts")
    expect(action).toMatch(/updateNameAction/)

    // The half that is still open, and pinned so it cannot close silently:
    // changing the email moves the login identity and drops every set shared
    // with you, because `set_collaborators` is keyed by address. If an email
    // field ever appears here, the matrix has to say so in the same change.
    expect(action).not.toMatch(/updateEmail|newEmail/)
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

describe("Art. 5(1)(a), 6 and 13 — what the policy actually tells the reader", () => {
  /**
   * Read through `getLegalCopy`, not off the file.
   *
   * The first version of this grepped `legal-copy.ts` for the word
   * "placeholder", and kept passing after the placeholder was gone — the
   * docblock that replaced it uses the word to say it is no longer one, and the
   * match was case-insensitive. The second version then failed for the mirror
   * reason: it looked for `EU region` and found the comment explaining that the
   * claim had been *removed*.
   *
   * Both were the same mistake, which `tests/workflow-integrity.test.ts` also
   * made: measuring the file instead of the thing the file produces. What a
   * reader sees is the rendered document, so that is what gets asserted.
   */
  function policy(locale: SiteLocale): string {
    const doc = getLegalCopy(locale, "privacy")

    return [
      doc.title,
      doc.intro,
      ...doc.sections.flatMap((section) => [section.heading, ...section.body]),
    ].join("\n")
  }

  const en = policy("en")
  const es = policy("es")

  it("read both, so nothing below passes vacuously", () => {
    expect(en.length).toBeGreaterThan(1000)
    expect(es.length).toBeGreaterThan(1000)
  })

  it("names a legal basis for each processing activity (Art. 6)", () => {
    expect(en).toMatch(/performance of a contract/i)
    expect(en).toMatch(/legitimate interest/i)
    expect(es).toMatch(/ejecución de un contrato/i)
    expect(es).toMatch(/interés legítimo/i)
  })

  it("states retention periods (Art. 13(2)(a))", () => {
    expect(en).toMatch(/How long we keep it/)
    expect(es).toMatch(/Cuánto tiempo los guardamos/)
  })

  it("carries the right to complain to a supervisory authority (Art. 77)", () => {
    expect(en).toMatch(/data protection authority/i)
    expect(es).toMatch(/autoridad de protección de datos/i)
  })

  it("does not claim a Supabase region nobody has confirmed", () => {
    // R3 on the remediation plan. The old copy stated "EU region" as fact in a
    // document people are entitled to rely on, and it can only be read off a
    // dashboard none of us has checked. It comes back when it is confirmed.
    expect(en).not.toMatch(/EU region/)
    expect(es).not.toMatch(/región UE/)
    expect(MATRIX).toMatch(/R3.*regi(ó|o)n de Supabase/i)
  })
})

describe("Art. 5(1)(e) — retention is written and not running", () => {
  it("names every window the code implements", () => {
    const retention = source("services/retention-service.ts")

    // One constant per window. A sweep landing without a line in the matrix is
    // exactly the drift this file exists to catch — and it already caught one:
    // the shared rate limiter (PR #206, migration 0029) brought a fourth while
    // the matrix still said three. A fifth has to update both places again.
    //
    // The match is loose on purpose: "cuatro ventanas" and "cuatro (4) ventanas"
    // are the same claim, and a checker that fails on the phrasing of a sentence
    // it agrees with gets deleted.
    const windows = [...retention.matchAll(/export const (\w+_RETENTION_DAYS)/g)]

    expect(windows).toHaveLength(4)
    expect(MATRIX).toMatch(/cuatro.{0,20}ventanas/i)
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
