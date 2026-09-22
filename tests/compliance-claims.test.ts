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

    const action = source("app/(en)/dashboard/account/actions.ts")
    expect(action).toMatch(/updateNameAction/)

    // The half that is still open, and pinned so it cannot close silently:
    // changing the email moves the login identity and drops every set shared
    // with you, because `set_collaborators` is keyed by address. If a field
    // that takes a new address ever appears here, the matrix has to say so in
    // the same change.
    expect(action).not.toMatch(/updateEmail|newEmail/)
  })
})

describe("Arts. 16, 18 and 21 — the rights that are a request, not a switch", () => {
  it("has a channel that records the request and its deadline", () => {
    // Added 22/09/2026. Three rows moved at once, and none of them to ✅ — the
    // distinction the matrix has to keep is between a right you can exercise
    // and one that is merely reachable. A request with a date on it is the
    // second, and calling it the first is the overclaim this test prevents.
    const action = source("app/(en)/dashboard/account/actions.ts")
    const service = source("services/privacy-request-service.ts")

    expect(action).toMatch(/filePrivacyRequestAction/)
    expect(service).toMatch(/createPrivacyRequest/)

    // Thirty calendar days, Art. 12(3), stored on the row rather than derived —
    // so a change to the window cannot retroactively shorten a promise already
    // made to somebody waiting.
    expect(service).toMatch(/PRIVACY_REQUEST_DEADLINE_DAYS = 30/)
  })

  it("does not claim more than a channel", () => {
    // Fails when a row goes green. The reminder is the point: if any of these
    // three ever becomes self-serve, the row moves in the same change that made
    // it so, and this assertion is what stops the matrix from lagging.
    expect(MATRIX).toMatch(/\| 18 \| Limitación \| ⚠️/)
    expect(MATRIX).toMatch(/\| 21 \| Oposición \| ⚠️/)
  })
})

describe("Art. 17 — erasure", () => {
  /**
   * This canary used to check that `app/api/account/delete/route.ts` did not
   * exist, and it **passed while the gap closed**: self-serve deletion landed
   * on 22/09/2026 as a server action, which is what every other write on the
   * account page is, so the file it was watching was never created.
   *
   * That is the third time a check in this repo has measured the wrong thing —
   * `workflow-integrity` read a word out of its own comment, the first version
   * of the test below grepped a file instead of the document the file renders —
   * and the shape is identical every time: **the check watched an artefact
   * instead of the behaviour.** A path is an artefact. What matters is whether a
   * user can reach erasure, so that is what it asks now.
   */
  it("is self-serve, and is not claimed as finished while the sweep cannot run", () => {
    // ⚠️ and not ✅, on purpose. The request works; the execution runs from the
    // daily cron, which answers 503 without CRON_SECRET — and that is unset. By
    // the audit's own scoring rule, a control that is written and not running
    // does not count as a control.
    expect(MATRIX).toMatch(/\| 17 \| Supresión \| ⚠️/)

    const action = source("app/(en)/dashboard/account/actions.ts")
    const service = source("services/account-deletion-service.ts")

    expect(action).toMatch(/requestAccountDeletionAction/)
    expect(action).toMatch(/cancelAccountDeletionAction/)

    // Thirty days of grace, matching the Art. 12(3) deadline so that the outer
    // bound of "we will act" and the inner bound of "you can change your mind"
    // are the same date.
    expect(service).toMatch(/ACCOUNT_DELETION_GRACE_DAYS = 30/)

    // The grace period is a promise made to the user in the copy, so the sweep
    // has to be the thing that honours it rather than something that deletes on
    // sight.
    expect(service).toMatch(/sweepDeletedAccounts/)
  })

  it("cancels the subscription before the profile row is deleted", () => {
    // The ordering IS the correctness: the profile row is the only place
    // `stripe_subscription_id` exists, so cancelling after the delete cannot
    // work at all. `tests/backstage-admin-actions.test.ts` asserts the ordering
    // against observed database state; this one only checks the call is there,
    // so that removing it shows up here too.
    const backstage = source("services/backstage-service.ts")
    const deleteIndex = backstage.indexOf('.from("profiles").delete()')
    const cancelIndex = backstage.indexOf("cancelSubscriptionNow(")

    expect(cancelIndex).toBeGreaterThan(-1)
    expect(deleteIndex).toBeGreaterThan(-1)
    expect(cancelIndex).toBeLessThan(deleteIndex)
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

  it("states a minimum age, in both documents and both languages (Art. 8)", () => {
    // The gap the StageLink cross-read found: its privacy plan has a "define a
    // minimum age" task and EnergyCurve's had none, so neither document said
    // anything. 18 rather than 16, which is Robertino's call: the product is a
    // professional tool and a subscription is a contract.
    //
    // Asserted in BOTH documents on purpose. The Terms make the age a condition
    // of use; the policy says what it means for data. One without the other is
    // a rule with no data consequence, or a data claim with no rule behind it.
    for (const locale of ["en", "es"] as const) {
      const terms = getLegalCopy(locale, "terms")
      const termsText = terms.sections
        .flatMap((section) => section.body)
        .join("\n")

      expect(termsText, `terms ${locale}`).toMatch(/\b18\b/)
    }

    expect(policy("en")).toMatch(/aged 18 or over/i)
    expect(policy("en")).toMatch(/do not knowingly collect/i)
    expect(policy("es")).toMatch(/18 años o más/i)
    expect(policy("es")).toMatch(/no recopilamos datos a sabiendas/i)
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
    // exactly the drift this file exists to catch — and it has now caught two:
    // the shared rate limiter (PR #206, migration 0029) brought a fourth while
    // the matrix still said three, and the rights queue (migration 0030)
    // brought a fifth while it still said four. A sixth has to move both again.
    //
    // The match is loose on purpose: "cuatro ventanas" and "cuatro (4) ventanas"
    // are the same claim, and a checker that fails on the phrasing of a sentence
    // it agrees with gets deleted.
    const windows = [...retention.matchAll(/export const (\w+_RETENTION_DAYS)/g)]

    expect(windows).toHaveLength(5)
    expect(MATRIX).toMatch(/cinco.{0,20}ventanas/i)
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
