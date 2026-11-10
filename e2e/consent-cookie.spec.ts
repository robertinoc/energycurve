import { expect, test, type Page } from "@playwright/test"

/**
 * The cookie the server reads before sending the sales-wall and score events
 * (lib/privacy/server-consent.ts). The unit tests drive a fake cookie jar; this
 * is the real browser deciding whether to keep it — host, path, SameSite and
 * Secure are exactly the attributes a jar can get wrong silently.
 */

const BANNER = '[role="region"][aria-label*="count this visit"]'
const COOKIE = "ec_analytics_consent"

async function consentCookie(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === COOKIE)
}

test("no answer, no consent cookie", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator(BANNER)).toBeVisible()

  expect(await consentCookie(page)).toBeUndefined()
})

test("a yes leaves the cookie the server reads, on every path", async ({ page }) => {
  await page.goto("/")
  await page.locator(`${BANNER} button`).last().click()
  await expect(page.locator(BANNER)).toHaveCount(0)

  const cookie = await consentCookie(page)
  expect(cookie?.value).toBe("granted.v1")
  expect(cookie?.path).toBe("/")
  expect(cookie?.sameSite).toBe("Lax")
  expect(cookie?.httpOnly).toBe(false)
})

test("a no leaves none", async ({ page }) => {
  await page.goto("/")
  await page.locator(`${BANNER} button`).first().click()
  await expect(page.locator(BANNER)).toHaveCount(0)

  expect(await consentCookie(page)).toBeUndefined()
})

test("withdrawing removes it", async ({ page }) => {
  await page.goto("/")
  await page.locator(`${BANNER} button`).last().click()
  expect(await consentCookie(page)).toBeDefined()

  await page.goto("/cookie-policy")
  await page.getByRole("button", { name: /change my analytics choice/i }).click()

  await expect.poll(async () => (await consentCookie(page)) ?? null).toBeNull()
})

test("someone who said yes before the cookie existed gets it on the next page", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("ec.analytics-consent.v1", "granted"))
  await page.goto("/pricing")

  await expect.poll(async () => (await consentCookie(page))?.value ?? null).toBe("granted.v1")
})
