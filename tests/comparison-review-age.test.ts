import { describe, expect, it } from "vitest"

import { COMPARISONS } from "@/lib/content/compare/comparisons"

/**
 * How old each comparison's reading of its sources is (lote 21).
 *
 * The pages quote competitors and say when the quotes were read
 * (`verifiedAt`, published as `lastReviewed`). Two drifts showed up in twenty
 * days, both found by chance: a Lexicon quote changed within four days of
 * being read (H-15) and Serato's pricing page 22 days after (H-24).
 *
 * The age check is NOT part of CI, on purpose: it would turn every unrelated
 * pull request red the day a date crosses the line, which is the gate this repo
 * already refused for `npm audit`. It runs in the monthly review
 * (docs/seo/runbook-revision-mensual.md):
 *
 *   CHECK_REVIEW_AGE=1 npx vitest run tests/comparison-review-age.test.ts
 *
 * REVIEW_TODAY=2026-11-30 pretends today is another date, to see what will
 * expire when.
 *
 * MAX_AGE_DAYS is 35: the review is monthly, plus a week of slack. A page past
 * it means a monthly reading was skipped. No number catches a change made four
 * days after a reading; this one catches a page nobody has looked at.
 */
export const MAX_AGE_DAYS = 35

const today = new Date(process.env.REVIEW_TODAY ?? Date.now())
const ageInDays = (iso: string) =>
  Math.floor((today.getTime() - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000)

describe("every comparison says when its sources were read", () => {
  for (const comparison of COMPARISONS) {
    it(comparison.id, () => {
      expect(comparison.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(comparison.verifiedAt))).toBe(false)
      expect(ageInDays(comparison.verifiedAt), "a reading in the future").toBeGreaterThanOrEqual(0)
      expect(comparison.sources.length).toBeGreaterThan(0)
    })
  }
})

describe.skipIf(!process.env.CHECK_REVIEW_AGE)(
  `monthly review: no comparison older than ${MAX_AGE_DAYS} days`,
  () => {
    for (const comparison of COMPARISONS) {
      it(`${comparison.id} (read ${comparison.verifiedAt})`, () => {
        expect(ageInDays(comparison.verifiedAt)).toBeLessThanOrEqual(MAX_AGE_DAYS)
      })
    }
  }
)
