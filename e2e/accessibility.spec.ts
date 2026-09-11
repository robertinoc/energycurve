import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/**
 * Phase F4 — accessibility, on the pages a visitor can reach without a session.
 *
 * Scoped to WCAG 2.1 A and AA, which is the bar the plan sets. Axe finds roughly
 * a third of real barriers and no automated tool finds the rest, so a clean run
 * here is a floor and not a certificate — the keyboard and screen-reader passes
 * stay manual and are listed at the bottom of `docs/qa/test-strategy.md`.
 *
 * Failures are asserted as an empty array rather than a count, so the report
 * names the rule, the impact and the offending selector instead of saying 3 ≠ 0.
 */

const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

/** Every public route, in both languages. The Spanish half is a real site, not a toggle. */
const PUBLIC_PAGES = [
  ["landing", "/"],
  ["pricing", "/pricing"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
  ["cookie policy", "/cookie-policy"],
  ["install", "/install"],
  ["blog index", "/blog"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot password", "/forgot-password"],
  ["reset password", "/reset-password"],
  ["verify email", "/verify-email"],
  ["landing (es)", "/es"],
  ["pricing (es)", "/es/pricing"],
  ["terms (es)", "/es/terms"],
  ["privacy (es)", "/es/privacy"],
  ["blog index (es)", "/es/blog"],
] as const

async function violationsOn(page: Page, path: string) {
  await page.goto(path)
  // The landing reveals sections on scroll; analysing before they mount would
  // audit an empty page and report zero violations for the wrong reason.
  await page.waitForLoadState("networkidle")

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()

  return violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    where: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }))
}

test.describe("WCAG 2.1 AA on the public surface", () => {
  for (const [name, path] of PUBLIC_PAGES) {
    test(`${name} has no automatically detectable violations`, async ({ page }) => {
      expect(await violationsOn(page, path)).toEqual([])
    })
  }
})

test.describe("the parts axe cannot see on its own", () => {
  test("the page has exactly one h1, and it is not empty", async ({ page }) => {
    // Axe checks heading order but tolerates several h1s. A screen-reader user
    // navigating by heading needs one answer to "what is this page".
    for (const [name, path] of PUBLIC_PAGES) {
      await page.goto(path)

      const headings = page.locator("h1")
      await expect(headings, `${name} should have one h1`).toHaveCount(1)
      await expect(headings.first()).not.toBeEmpty()
    }
  })

  test("every FAQ answer is in the HTML even while collapsed", async ({ page }) => {
    // The FAQ uses native <details> precisely so answers ship server-side, for
    // answer engines and for assistive tech. A JS accordion would break both.
    await page.goto("/")

    const details = page.locator("details")
    const count = await details.count()
    expect(count).toBeGreaterThan(0)

    for (let index = 0; index < count; index += 1) {
      const answer = details.nth(index).locator("> :not(summary)").first()
      await expect(answer).not.toBeEmpty()
    }
  })

  test("the skip-or-first focusable element is reachable by keyboard", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")

    const focused = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) return null
      return {
        tag: element.tagName.toLowerCase(),
        text: (element.textContent ?? "").trim().slice(0, 40),
      }
    })

    // Something must take focus on the first Tab. A page where Tab does nothing
    // is unusable without a mouse.
    expect(focused).not.toBeNull()
  })

  test("the language toggle is a real control, not a styled div", async ({ page }) => {
    await page.goto("/")

    const toggle = page.getByRole("link", { name: /español|es\b/i }).first()
    await expect(toggle).toBeVisible()
  })
})
