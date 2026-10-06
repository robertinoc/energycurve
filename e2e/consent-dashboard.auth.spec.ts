import { expect, test } from "@playwright/test"

import { accountFor, skipReason } from "./helpers/accounts"

/**
 * Banco AUD.1, the half that needed a session.
 *
 * Finding A2 of the F1 audit: the consent banner sat on top of the dashboard's
 * import button, and a click retried for four minutes against the banner's own
 * paragraph. The public half — every control of `/` and `/es` reachable while
 * the banner shows — is `e2e/consent.spec.ts`, and its `mobile-safari` project
 * already runs it at a phone's width. What the bench still asked a person to
 * do by hand was the dashboard at 390 px, because that page needs an account.
 */

const BANNER = '[role="region"][aria-label*="count this visit"], [role="region"][aria-label*="contar esta visita"]'
const STORAGE_KEY = "ec.analytics-consent.v1"

test("AUD.1 · at 390 px the banner covers nothing on /dashboard/playlists", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "auth-pro", "Runs once, as the PRO account.")
  test.skip(!accountFor("pro"), skipReason("pro"))

  // A first visit: whatever the saved session answered about analytics is
  // forgotten before the page's own scripts read it.
  await page.addInitScript((key) => window.localStorage.removeItem(key), STORAGE_KEY)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/dashboard/playlists")

  const banner = page.locator(BANNER).first()
  await expect(banner).toBeVisible()
  await expect(page.locator("#import-file"), "the import control is on the page").toHaveCount(1)

  // The same measurement as the public test: every control scrolled into view
  // the way the browser does for focus, and none of them under the banner.
  const covered = await page.evaluate((selector) => {
    const shade = document.querySelector(selector)!
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
    }

    return Array.from(document.querySelectorAll("a[href], button, label[for]"))
      .filter((el) => !el.closest(selector) && visible(el))
      .flatMap((el) => {
        el.scrollIntoView({ block: "nearest", behavior: "instant" })
        const box = el.getBoundingClientRect()
        const bar = shade.getBoundingClientRect()
        return box.bottom > bar.top + 1 && box.top < bar.bottom
          ? [`${(el.textContent ?? "").trim().slice(0, 40) || "(no text)"} @ y=${Math.round(box.top)}`]
          : []
      })
  }, BANNER)

  expect(covered, `controls under the consent banner: ${covered.join(" · ")}`).toEqual([])
})
