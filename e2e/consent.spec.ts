import { expect, test } from "@playwright/test"

/**
 * Analytics consent, end to end in a real browser — which is the only place a
 * cookie banner can be shown to work, because everything that makes it correct
 * (storage, cookies, hydration, Do Not Track) exists only there.
 *
 * The contract: nothing is collected until someone says yes, refusing costs the
 * same one click as accepting, and the answer can be withdrawn.
 */

const BANNER = '[role="region"][aria-label*="count this visit"]'
const BANNER_ES = '[role="region"][aria-label*="contar esta visita"]'
const STORAGE_KEY = "ec.analytics-consent.v1"

async function consentValue(page: import("@playwright/test").Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
}

async function posthogCookies(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies()
  return cookies.filter((cookie) => cookie.name.startsWith("ph_"))
}

test.describe("before anyone answers", () => {
  test("the banner asks, and nothing is stored", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator(BANNER)).toBeVisible()
    expect(await consentValue(page)).toBeNull()
    expect(await posthogCookies(page)).toHaveLength(0)
  })

  test("refusing is exactly as easy as accepting", async ({ page }) => {
    // Same element, same size, same place. A reject that is smaller, greyer or
    // one click further away is a dark pattern with a legal name, and this is
    // the assertion that notices a redesign quietly introducing one.
    await page.goto("/")

    const buttons = page.locator(`${BANNER} button`)
    await expect(buttons).toHaveCount(2)

    const [reject, accept] = await buttons.all()
    const rejectBox = await reject.boundingBox()
    const acceptBox = await accept.boundingBox()

    expect(rejectBox).not.toBeNull()
    expect(acceptBox).not.toBeNull()
    // Within a couple of pixels: same height, comparable width.
    expect(Math.abs(rejectBox!.height - acceptBox!.height)).toBeLessThan(3)
    expect(await reject.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      await accept.evaluate((el) => getComputedStyle(el).backgroundColor)
    )
  })

  test("it does not trap the page", async ({ page }) => {
    // No overlay, no scroll lock. Someone who wants to read the policy before
    // deciding can walk to it, and ignoring the banner is a valid answer.
    //
    // Asserted by scrolling rather than by clicking a nav link: the first
    // version clicked "Pricing" and failed on mobile-safari, where that link
    // sits under the sticky header and is not tappable — a fact about the
    // mobile nav, not about the banner. Scrolling is the property this test
    // actually cares about, and it means the same thing on every device.
    await page.goto("/")
    await expect(page.locator(BANNER)).toBeVisible()

    const overflow = await page.evaluate(() => ({
      body: getComputedStyle(document.body).overflow,
      html: getComputedStyle(document.documentElement).overflow,
    }))

    expect(overflow.body).not.toBe("hidden")
    expect(overflow.html).not.toBe("hidden")

    // `page.mouse.wheel` throws on mobile WebKit ("Mouse wheel is not supported"),
    // so scroll the way a page scrolls rather than the way a mouse does.
    await page.evaluate(() => window.scrollBy(0, 600))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    // And it still leaves most of the screen to the page.
    const banner = await page.locator(BANNER).boundingBox()
    const viewport = page.viewportSize()
    expect(banner!.height).toBeLessThan((viewport?.height ?? 800) / 2)
  })
})

test.describe("saying no", () => {
  test("stores the refusal, hides the banner, and sets no cookie", async ({ page }) => {
    await page.goto("/")
    await page.locator(`${BANNER} button`).first().click()

    await expect(page.locator(BANNER)).toHaveCount(0)
    expect(await consentValue(page)).toBe("denied")
    expect(await posthogCookies(page)).toHaveLength(0)
  })

  test("is remembered on the next page, so it is not asked twice", async ({ page }) => {
    await page.goto("/")
    await page.locator(`${BANNER} button`).first().click()
    await page.goto("/pricing")

    await expect(page.locator(BANNER)).toHaveCount(0)
    expect(await posthogCookies(page)).toHaveLength(0)
  })
})

test.describe("saying yes", () => {
  test("is the only thing that lets analytics start", async ({ page }) => {
    await page.goto("/")
    expect(await posthogCookies(page)).toHaveLength(0)

    await page.locator(`${BANNER} button`).last().click()
    await expect(page.locator(BANNER)).toHaveCount(0)

    expect(await consentValue(page)).toBe("granted")
    await expect
      .poll(async () => (await posthogCookies(page)).length, { timeout: 5000 })
      .toBeGreaterThan(0)
  })
})

test.describe("changing your mind", () => {
  test("the cookie policy can withdraw the answer and bring the banner back", async ({
    page,
  }) => {
    await page.goto("/")
    await page.locator(`${BANNER} button`).last().click()

    await page.goto("/cookie-policy")
    await expect(page.getByText(/right now: accepted/i)).toBeVisible()

    await page.getByRole("button", { name: /change my analytics choice/i }).click()

    expect(await consentValue(page)).toBeNull()
    await expect(page.locator(BANNER)).toBeVisible()
  })
})

test.describe("Do Not Track answers on the visitor's behalf", () => {
  test("no banner, and nothing collected, without being asked", async ({ browser }) => {
    // A browser sending DNT has already answered. Asking again is asking
    // someone to repeat themselves.
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "doNotTrack", { get: () => "1" })
    })

    await page.goto("/")

    await expect(page.locator(BANNER)).toHaveCount(0)
    expect(await posthogCookies(page)).toHaveLength(0)

    await context.close()
  })
})

test.describe("in Spanish", () => {
  test("asks in Spanish on /es", async ({ page }) => {
    await page.goto("/es")

    await expect(page.locator(BANNER_ES)).toBeVisible()
    await expect(page.getByRole("button", { name: /no, gracias/i })).toBeVisible()
  })
})
