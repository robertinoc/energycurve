import { expect, test } from "@playwright/test"

/**
 * The pages a visitor sees before signing up, plus the wall that keeps them out of
 * the rest.
 *
 * These assertions were all being made by hand against production, after a deploy.
 * Moving them here moves them *before* the deploy, which is the only interesting
 * change: the same checks, but they can block a merge instead of producing a
 * finding.
 *
 * Each test asserts something a user or a crawler would notice if it broke, not
 * implementation detail — so a refactor that keeps the page correct keeps the suite
 * green.
 */

test.describe("landing", () => {
  test("renders the promise the product actually keeps", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /energy curve/i
    )

    // The claim the copy audit removed and must not come back: we read tags
    // locally, we have never accepted an uploaded mix, and promising otherwise is
    // the one thing on this page that would be a lie.
    await expect(page.locator("main")).not.toContainText(/upload (a|your) mix/i)
  })

  test("carries structured data a crawler can read", async ({ page }) => {
    await page.goto("/")

    const blocks = page.locator('script[type="application/ld+json"]')
    // Exactly one: a duplicate was reported once and turned out to be a
    // misreading, so this pins the real number rather than leaving it ambiguous.
    await expect(blocks).toHaveCount(1)

    const graph = JSON.parse((await blocks.first().textContent()) ?? "{}")
    const types = (graph["@graph"] ?? []).map(
      (node: { "@type": string }) => node["@type"]
    )

    expect(types).toContain("Organization")
    expect(types).toContain("SoftwareApplication")
    expect(types).toContain("FAQPage")
  })

  test("says who charges the card, before anyone reaches checkout", async ({
    page,
  }) => {
    // The transparency commitment: the statement reads StageLink LLC, and a person
    // has to be able to learn that without paying first.
    await page.goto("/")
    await expect(page.locator("body")).toContainText("StageLink LLC")
  })
})

test.describe("pricing", () => {
  test("shows all three plans as purchasable", async ({ page }) => {
    await page.goto("/pricing")

    await expect(page.locator("body")).toContainText("US$0")
    await expect(page.locator("body")).toContainText("US$9.99")
    await expect(page.locator("body")).toContainText("US$19.99")
  })

  test("does not claim the paid plans are still coming", async ({ page }) => {
    await page.goto("/pricing")

    // Checkout is live. Copy saying otherwise has drifted back twice, on four
    // separate surfaces, so it gets an assertion rather than another review pass.
    await expect(page.locator("body")).not.toContainText(
      /when paid plans launch|cuando lancemos los planes pagos/i
    )
  })

  test("marks unbuilt capabilities as such", async ({ page }) => {
    await page.goto("/pricing")

    // "Soon" has to still exist somewhere: several PRO+ capabilities genuinely
    // aren't built, and a matrix of unbroken check marks would be the dishonest
    // version of this page.
    await expect(page.locator("body")).toContainText(/soon/i)
  })
})

test.describe("legal", () => {
  for (const path of ["/terms", "/privacy"]) {
    test(`${path} names the operating company`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator("body")).toContainText("StageLink LLC")
    })
  }

  test("privacy policy lists the processors that actually receive data", async ({
    page,
  }) => {
    await page.goto("/privacy")

    // Each of these is a real recipient. Anthropic and Stripe were both missing
    // once while already in use, which is the kind of omission that matters.
    for (const processor of ["Anthropic", "Stripe", "Supabase", "WorkOS"]) {
      await expect(page.locator("body")).toContainText(processor)
    }
  })
})

test.describe("Spanish routes", () => {
  test("/es serves Spanish and declares it", async ({ page }) => {
    await page.goto("/es")

    await expect(page.locator("html")).toHaveAttribute("lang", "es")
    // A page that serves Spanish while declaring English is wrong for screen
    // readers and for anything that sniffs the document language.
    await expect(page.locator("body")).toContainText(/curva de energ[íi]a/i)
  })

  test("points crawlers at both languages", async ({ page }) => {
    await page.goto("/")

    const alternates = page.locator('link[rel="alternate"]')
    await expect(alternates.first()).toBeAttached()

    const langs = await alternates.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("hreflang"))
    )

    expect(langs).toContain("en")
    expect(langs).toContain("es")
  })

  test("the Spanish pricing page prices in Spanish", async ({ page }) => {
    await page.goto("/es/pricing")
    await expect(page.locator("html")).toHaveAttribute("lang", "es")
    await expect(page.locator("body")).toContainText("u$s9,99")
  })
})

test.describe("crawlability", () => {
  test("robots.txt allows the public pages and blocks the private ones", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt")
    expect(response.status()).toBe(200)

    const body = await response.text()
    expect(body).toContain("Sitemap:")
    // Blocking these is deliberate: an indexed dashboard or auth route is a
    // liability, not traffic.
    expect(body).toContain("/dashboard")
    expect(body).toContain("/api/")
  })

  test("sitemap.xml lists the public routes", async ({ request }) => {
    const response = await request.get("/sitemap.xml")
    expect(response.status()).toBe(200)

    const body = await response.text()
    for (const path of ["/pricing", "/terms", "/privacy"]) {
      expect(body).toContain(path)
    }
  })
})

test.describe("health probe", () => {
  test("answers with a body and a content type", async ({ request }) => {
    // An uptime monitor reads this. It was reported once as returning an empty
    // body, which would make the monitor useless while looking configured.
    const response = await request.get("/api/health")

    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body).toHaveProperty("status")
  })

  test("answers a HEAD request too", async ({ request }) => {
    // Some monitors only send HEAD.
    const response = await request.head("/api/health")
    expect(response.status()).toBe(200)
  })
})

test.describe("the login wall", () => {
  for (const path of ["/dashboard", "/backstage"]) {
    test(`${path} is not reachable without a session`, async ({ page }) => {
      await page.goto(path)

      // Where the authenticated coverage stops. Asserting the redirect is the most
      // this suite can honestly claim about anything behind it — see the note in
      // playwright.config.ts.
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test("the login page offers a way to sign up", async ({ page }) => {
    // Matched by destination rather than by label: the copy has been reworded once
    // already ("Create an account", not "Sign up"), and a test that breaks on a
    // wording change while the link still works is a test that trains people to
    // ignore it.
    await page.goto("/login")
    await expect(
      page.locator('a[href^="/signup"]').first()
    ).toBeVisible()
  })
})
