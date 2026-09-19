import { expect, test } from "@playwright/test"

/**
 * The glossary, the guides and the components, in both languages.
 *
 * What this covers that a unit test cannot: that the filter still shows every
 * entry in the HTML before it runs, that the tooltip can be reached with a
 * keyboard, that an embedded curve actually draws, and that the draft guide
 * renders every component on one page.
 */

const LOCALES = [
  {
    locale: "es",
    index: "/es/glosario",
    entry: "/es/glosario/curva-de-energia",
    otherEntry: "/es/glosario/tonalidad",
    guide: "/es/guia/componentes",
    guideIndex: "/es/guia",
    h1: "Glosario para DJs",
    // Matches exactly one entry in both languages. "camelot" does not: the
    // English Open Key entry mentions Camelot in its own definition, and a
    // filter that searches the definitions is doing its job by returning two.
    filterTerm: "beatmatching",
  },
  {
    locale: "en",
    index: "/glossary",
    entry: "/glossary/energy-curve",
    otherEntry: "/glossary/key",
    guide: "/guide/components",
    guideIndex: "/guide",
    h1: "DJ glossary",
    filterTerm: "beatmatching",
  },
] as const

for (const page_ of LOCALES) {
  test.describe(`the glossary in ${page_.locale}`, () => {
    test("lists all twenty-one entries in the server's HTML", async ({
      request,
    }) => {
      // Read over HTTP, not through the browser: the point is what arrives
      // before any JavaScript runs. A filter that rendered the list after
      // hydration would leave a crawler with an index of nothing.
      const html = await (await request.get(page_.index)).text()

      const links = [
        ...html.matchAll(new RegExp(`href="${page_.index}/[^"]+"`, "g")),
      ]

      expect(new Set(links.map((match) => match[0])).size).toBe(21)
    })

    test("filters the list as you type, and says so when nothing matches", async ({
      page,
    }) => {
      await page.goto(page_.index)

      const filter = page.getByTestId("glossary-filter")
      await filter.fill(page_.filterTerm)

      await expect(page.locator(`a[href^="${page_.index}/"]`)).toHaveCount(1)

      await filter.fill("zzzzzz")
      await expect(page.getByTestId("glossary-empty")).toBeVisible()

      await filter.fill("")
      await expect(page.locator(`a[href^="${page_.index}/"]`)).toHaveCount(21)
    })

    test("an entry leads with its short definition and links onward", async ({
      page,
    }) => {
      await page.goto(page_.entry)

      await expect(page.locator("h1")).toHaveCount(1)
      await expect(page.locator(`a[href="${page_.index}"]`).first()).toBeVisible()

      // Breadcrumbs, and the cross-references at the foot.
      await expect(page.locator(`a[href="${page_.otherEntry}"]`)).toHaveCount(1)
    })

    test("the language toggle keeps you on the same entry", async ({ page }) => {
      await page.goto(page_.entry)

      // The twin, named by its own hreflang. Attribute names are matched
      // case-insensitively in HTML, so this finds React's `hrefLang`.
      const twin = page_.locale === "es" ? "en" : "es"
      const expected =
        page_.locale === "es"
          ? "https://energycurve.app/glossary/energy-curve"
          : "https://energycurve.app/es/glosario/curva-de-energia"

      await expect(
        page.locator(`link[rel="alternate"][hreflang="${twin}"]`)
      ).toHaveAttribute("href", expected)
    })
  })

  test.describe(`the guide in ${page_.locale}`, () => {
    test("renders every component on the draft page", async ({ page }) => {
      await page.goto(page_.guide)

      await expect(page.getByTestId("guide-draft-badge")).toBeVisible()

      // Two curves, drawn rather than described.
      await expect(page.locator("figure svg")).toHaveCount(2)

      // The energy scale's ten rows, the steps, the comparison table, the FAQ.
      await expect(page.locator("details")).toHaveCount(2)
      await expect(page.locator("table")).toHaveCount(1)
      await expect(page.locator("ol li")).not.toHaveCount(0)
    })

    test("the table of contents jumps to each section", async ({ page }) => {
      await page.goto(page_.guide)

      const links = page.locator('nav[aria-label] a[href^="#"]')
      const count = await links.count()
      expect(count).toBeGreaterThan(0)

      for (let index = 0; index < count; index += 1) {
        const href = await links.nth(index).getAttribute("href")
        await expect(page.locator(href!)).toHaveCount(1)
      }
    })

    test("the guide index does not list the draft", async ({ page }) => {
      await page.goto(page_.guideIndex)

      await expect(page.locator(`a[href="${page_.guide}"]`)).toHaveCount(0)
    })
  })
}

test.describe("glossary terms inside an article", () => {
  const ARTICLE = "/es/blog/esta-bien-el-orden-de-mi-set"

  test("the first mention becomes a link, with its definition attached", async ({
    page,
  }) => {
    await page.goto(ARTICLE)

    const terms = page.locator(".ec-term")
    expect(await terms.count()).toBeGreaterThan(0)

    const first = terms.first()
    const link = first.locator("a")
    const tip = first.locator('[role="tooltip"]')

    // The definition is in the DOM whether or not anyone hovers — that is what
    // makes it available to a screen reader following aria-describedby.
    await expect(tip).toHaveCount(1)
    expect((await tip.textContent())?.trim().length).toBeGreaterThan(0)
    await expect(link).toHaveAttribute(
      "aria-describedby",
      (await tip.getAttribute("id")) as string
    )
  })

  test("the tooltip appears on keyboard focus, not only on hover", async ({
    page,
  }) => {
    await page.goto(ARTICLE)

    const first = page.locator(".ec-term").first()
    await first.locator("a").focus()

    await expect(first.locator('[role="tooltip"]')).toBeVisible()
  })

  test("a term is linked once per article, not on every mention", async ({
    page,
  }) => {
    await page.goto(ARTICLE)

    const hrefs = await page
      .locator(".ec-term a")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
