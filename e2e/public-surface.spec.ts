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
  /**
   * What can honestly be asserted here, and what can't.
   *
   * This endpoint's whole job is to report whether the database is reachable, and
   * CI runs with placeholder Supabase credentials — so it answers 503 with
   * `database: "unreachable"`, which is the *correct* answer in that environment.
   * Asserting 200 would mean either faking the thing being probed or wiring a real
   * database into every pull request, and the first defeats the purpose while the
   * second is a bigger commitment than a health check is worth.
   *
   * So these assert the **contract** instead of the verdict, and that turns out to
   * catch more than the status code did: a route that 404s, a route that throws and
   * returns an HTML error page, a missing content type — which is the bug that was
   * actually reported against this endpoint — and a change to the field names an
   * uptime monitor reads. Whether the database is up is production's question, and
   * production has a monitor for it.
   */
  const OK_OR_DEGRADED = [200, 503]

  test("answers with JSON in the shape a monitor reads", async ({ request }) => {
    const response = await request.get("/api/health")

    expect(OK_OR_DEGRADED).toContain(response.status())
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()

    // Every field a monitor or a human would key off. Renaming one of these
    // silently breaks whatever is watching.
    expect(body).toHaveProperty("status")
    expect(body).toHaveProperty("database")
    expect(body).toHaveProperty("auth")
    expect(body).toHaveProperty("timestamp")

    // The two values are the two real states, and the pair has to stay consistent:
    // "ok" with an unreachable database would be the dangerous kind of wrong.
    expect(["ok", "degraded"]).toContain(body.status)
    expect(body.status === "ok").toBe(body.database === "ok")
  })

  test("leaks nothing about the configuration", async ({ request }) => {
    // A public probe: no counts, no versions, no connection strings. Worth pinning
    // because the natural way to debug a failing health check is to add detail to
    // its response, and this is the one endpoint where that's a disclosure.
    const body = await (await request.get("/api/health")).json()

    expect(Object.keys(body).sort()).toEqual([
      "auth",
      "database",
      "status",
      "timestamp",
    ])
  })

  test("answers a HEAD request too", async ({ request }) => {
    // Some monitors only send HEAD.
    const response = await request.head("/api/health")
    expect(OK_OR_DEGRADED).toContain(response.status())
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

test.describe("blog", () => {
  test("the Spanish index lists the articles", async ({ page }) => {
    await page.goto("/es/blog")

    await expect(page.locator("html")).toHaveAttribute("lang", "es")
    // Five seed articles, each written against a measured gap in the AEO baseline.
    await expect(page.locator("main ul li")).toHaveCount(5)
  })

  test("an article renders its markdown, not its markdown source", async ({
    page,
  }) => {
    await page.goto("/es/blog/esta-bien-el-orden-de-mi-set")

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /está bien el orden/i
    )
    // Headings became headings and bold became bold, rather than reaching the
    // page as literal ## and ** — the failure mode of a renderer that silently
    // does nothing.
    await expect(page.locator(".ec-prose h2").first()).toBeVisible()
    await expect(page.locator(".ec-prose strong").first()).toBeVisible()
    await expect(page.locator(".ec-prose")).not.toContainText("**")
  })

  test("an article claims no translation it doesn't have", async ({ page }) => {
    await page.goto("/es/blog/esta-bien-el-orden-de-mi-set")

    // Self-canonical and no hreflang pair: the article exists in Spanish only, and
    // advertising an English twin would point a crawler at a 404.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/es\/blog\/esta-bien-el-orden-de-mi-set$/
    )
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0)
  })

  test("the English index says where the writing is", async ({ page }) => {
    await page.goto("/blog")

    // No English articles yet, and the empty state names the reason rather than
    // promising a "coming soon".
    await expect(page.locator("main")).toContainText(/in Spanish for now/i)
    await expect(page.locator('a[href="/es/blog"]')).toBeVisible()
  })

  test("the sitemap lists the articles", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text()

    expect(body).toContain("/es/blog/esta-bien-el-orden-de-mi-set")
    expect(body).toContain("/es/blog")
  })
})

test.describe("third-party disclosure", () => {
  test("the privacy policy names GetSongBPM and repeats the audio promise", async ({
    page,
  }) => {
    // Title lookup sends artist and title to a third party. The policy has to
    // name them, and it has to keep saying what is NOT sent — the audio promise
    // is the thing a DJ is deciding on.
    await page.goto("/privacy")

    await expect(page.locator("body")).toContainText("GetSongBPM")
    await expect(page.locator("body")).toContainText(/never your audio/i)
  })

  test("the Spanish policy names it too", async ({ page }) => {
    // A disclosure that only exists in one language isn't a disclosure for the
    // audience the Spanish content was written to reach.
    await page.goto("/es/privacy")

    await expect(page.locator("body")).toContainText("GetSongBPM")
    await expect(page.locator("body")).toContainText(/nunca tu audio/i)
  })
})
