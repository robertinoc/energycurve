import { expect, test } from "@playwright/test"

/**
 * What a stranger sees when a link doesn't resolve.
 *
 * The app had ten `notFound()` calls and no `not-found.tsx` behind any of them,
 * so all ten rendered Next's built-in page — unstyled, English only, no heading,
 * no way back. These tests exist because that page is reachable from outside the
 * app: a DJ sends a client a share link, the link is revoked or the set is
 * deleted, and the client lands on whatever this is.
 *
 * The public share page refuses on purpose to say *which* of those happened, so
 * these assertions check what a person needs (a heading, an explanation, a way
 * out) and never that the page names a cause.
 */

const BAD_TOKEN = "not-a-valid-signed-token"

test.describe("a link that no longer resolves", () => {
  test("answers 404 and still renders a page", async ({ page }) => {
    const response = await page.goto(`/c/${BAD_TOKEN}`)

    // Status first: a styled 404 that returns 200 is worse than the bare one,
    // because a crawler then indexes it.
    expect(response?.status()).toBe(404)

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("gives the visitor somewhere to go", async ({ page }) => {
    await page.goto(`/c/${BAD_TOKEN}`)

    const home = page.getByRole("link", { name: /back to home|volver al inicio/i })
    await expect(home).toBeVisible()
  })

  test("never says which of the three causes it was", async ({ page }) => {
    await page.goto(`/c/${BAD_TOKEN}`)

    const body = page.locator("body")

    // The signature check is the thing keeping set ids private. Copy that said
    // "this link expired" or "that set was deleted" would confirm the id existed
    // and undo it — from the friendliest-looking place in the app.
    await expect(body).not.toContainText(/expired|caduc|deleted|borrad|invalid signature/i)
  })

  test("stays out of the index, and says so at least once", async ({ page }) => {
    await page.goto(`/c/${BAD_TOKEN}`)

    // This started as `toHaveAttribute("content", /noindex/)` on a single
    // locator and failed, which turned out to be the test finding something:
    // the page carries **two** robots tags. Next emits `noindex` for a not-found
    // render and the root layout emits `index, follow` after it.
    //
    // Not a defect worth a third tag — the 404 status is what search engines act
    // on, and the more restrictive directive wins when they conflict — but it is
    // worth pinning that the restrictive one is present, so a future metadata
    // change cannot silently leave only `index, follow` behind.
    const contents = await page
      .locator('meta[name="robots"]')
      .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content")))

    expect(contents.some((value) => /noindex/i.test(value ?? ""))).toBe(true)
  })

  test("does not put the marketing title on a dead link", async ({ page }) => {
    await page.goto(`/c/${BAD_TOKEN}`)

    // Inherited from the root layout until this page declared its own, so every
    // dead link produced a tab reading "EnergyCurve — DJ Set Energy Analysis &
    // Track Order" — including in the history and link previews of whoever the
    // DJ sent the expired link to.
    await expect(page).toHaveTitle(/not found/i)
  })
})

test.describe("an address that was never a page", () => {
  test("renders the app's own 404, not the framework's", async ({ page }) => {
    const response = await page.goto("/this-was-never-a-page")

    expect(response?.status()).toBe(404)

    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible()
    // Next's built-in page has no h1 at all and says "404 | This page could not
    // be found." Pinning our copy is what distinguishes "we have a 404 page"
    // from "the framework answered".
    await expect(heading).toContainText(/doesn't exist|no existe/i)
  })

  test("speaks Spanish when the visitor does", async ({ page, context, baseURL }) => {
    // Same cookie the rest of the app reads (ANALYSIS_LOCALE_COOKIE), set
    // against the run's own baseURL so the port override still works.
    await context.addCookies([
      { name: "energycurve_locale", value: "es", url: baseURL ?? "" },
    ])

    await page.goto("/this-was-never-a-page")

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /no existe/i
    )
  })
})
