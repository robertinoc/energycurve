import { describe, expect, it } from "vitest"

import { getLegalCopy } from "@/lib/content/legal-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Keeps the published subprocessor list matching the software.
 *
 * A subprocessor page is a public commitment, and it has two ways of being
 * wrong. It can omit a company that receives data — which is the failure that
 * matters, because a reader takes the list as exhaustive. And it can name one
 * that receives nothing, which is a smaller error but still a false statement
 * about where someone's data goes.
 *
 * Crisp is the reason the second half of that is not hypothetical: a
 * `NEXT_PUBLIC_CRISP_WEBSITE_ID` exists in the Vercel project, the RoPA listed
 * Crisp among the processors, and **nothing in the code loads it**. Publishing
 * that as fact would have declared a data flow that does not exist.
 *
 * So the list is checked against the integrations the application actually has,
 * derived from what the code imports and calls rather than from a list kept
 * alongside it — a second list would be the next thing to drift.
 */

/**
 * The companies this codebase actually sends data to, and the evidence for each.
 *
 * Evidence is a module path plus the thing inside it that does the sending, so a
 * failure points at what to look at rather than just asserting a name is absent.
 */
const INTEGRATIONS = [
  { name: "Vercel", evidence: "deployment target (vercel.json)" },
  { name: "Supabase", evidence: "lib/supabase/server.ts" },
  { name: "WorkOS", evidence: "@workos-inc/authkit-nextjs" },
  { name: "Stripe", evidence: "lib/config/stripe.ts" },
  { name: "Resend", evidence: "RESEND_API_KEY, services/email" },
  { name: "PostHog", evidence: "NEXT_PUBLIC_POSTHOG_KEY" },
  { name: "GetSongBPM", evidence: "GETSONGBPM_API_KEY" },
  { name: "Anthropic", evidence: "ANTHROPIC_API_KEY, smart order" },
] as const

/** Named in the RoPA or in an env var, but not wired into any code path. */
const NOT_INTEGRATED = ["Crisp"] as const

const LOCALES: SiteLocale[] = ["en", "es"]

function pageText(locale: SiteLocale): string {
  const doc = getLegalCopy(locale, "subprocessors")

  return [
    doc.title,
    doc.intro,
    ...doc.sections.flatMap((section) => [section.heading, ...section.body]),
  ].join("\n")
}

describe.each(LOCALES)("the %s subprocessor page", (locale) => {
  const text = pageText(locale)

  it("is not empty, so the checks below aren't vacuous", () => {
    expect(text.length).toBeGreaterThan(500)
  })

  it.each(INTEGRATIONS)("names $name ($evidence)", ({ name }) => {
    expect(text).toContain(name)
  })

  it.each(NOT_INTEGRATED)("does not claim %s receives data", (name) => {
    // It would be a true statement about the Vercel project and a false one
    // about the product. The page describes the software.
    expect(text).not.toContain(name)
  })

  it("says where the companies are", () => {
    // The whole point of publishing this for an EEA reader: an international
    // transfer they can't see is one they can't object to.
    expect(text).toMatch(/United States|EE\.UU\./)
  })

  it("repeats that audio never leaves the device", () => {
    // The strongest promise this product makes, and a page listing everyone who
    // receives data is exactly where a reader will look to see if it survives.
    expect(text).toMatch(/audio/i)
    expect(text).toMatch(/never (leaves|uploaded)|nunca (sale|se sube)/i)
  })

  it("does not promise a DPA with GetSongBPM, because there isn't one", () => {
    // The RoPA records that no data processing agreement is available with them.
    // The page has to carry that rather than let the reader assume the list is
    // uniformly papered.
    expect(text).toMatch(
      /no data processing agreement|No tenemos acuerdo de tratamiento/i
    )
  })
})

describe("both languages say the same thing", () => {
  it("names the same companies in each", () => {
    const en = pageText("en")
    const es = pageText("es")

    for (const { name } of INTEGRATIONS) {
      expect(en.includes(name), `en: ${name}`).toBe(true)
      expect(es.includes(name), `es: ${name}`).toBe(true)
    }
  })

  it("has the same number of sections in each", () => {
    // A section that exists in one language and not the other is how a
    // translated legal page quietly makes two different commitments.
    expect(getLegalCopy("es", "subprocessors").sections).toHaveLength(
      getLegalCopy("en", "subprocessors").sections.length
    )
  })
})
