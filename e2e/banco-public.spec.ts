import { expect, test, type Page } from "@playwright/test"

/**
 * Rows of the manual test bench (docs/qa/banco-de-pruebas.html) that a browser
 * can answer on its own, without an account.
 *
 * Each test names its row. The row left the bench when this test landed, and
 * docs/qa/automatizacion-banco-2026-10.md says which test replaced which row.
 * What stayed on the bench is what needs a person: an ear, a phone in a hand,
 * a screen reader, or a judgement about copy.
 */

// --- N · the Resources menu --------------------------------------------------

/** The Resources trigger on desktop, in whichever language the page is in. */
function resourcesTrigger(page: Page) {
  return page.getByRole("button", { name: /^(resources|recursos)$/i }).first()
}

test.describe("the Resources menu (banco N)", () => {
  test("N.1 · opens with Enter, takes Tab inside, and Escape gives focus back", async ({
    page,
    isMobile,
    browserName,
  }) => {
    test.skip(isMobile, "Below lg the groups live in the hamburger panel, already open: N.3.")

    await page.goto("/")
    const trigger = resourcesTrigger(page)
    await trigger.focus()
    await page.keyboard.press("Enter")

    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`)
    await expect(panel).toBeVisible()

    // Safari only Tabs to links with a setting most people never turn on, so
    // "Tab enters the panel" is a fact about Chromium and Firefox. Escape and
    // the focus coming back are true everywhere.
    if (browserName !== "webkit") {
      await page.keyboard.press("Tab")
      expect(
        await panel.evaluate((node) => node.contains(document.activeElement)),
        "the first Tab lands inside the panel"
      ).toBe(true)
    }

    await page.keyboard.press("Escape")
    await expect(panel).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  for (const width of [1440, 1280]) {
    test(`N.2 · the panel fits a ${width}px laptop screen`, async ({ page, isMobile }) => {
      test.skip(isMobile, "A desktop width; the phone is N.3.")

      await page.setViewportSize({ width, height: 800 })
      await page.goto("/")
      const trigger = resourcesTrigger(page)
      await trigger.click()

      const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`)
      const box = await panel.boundingBox()

      expect(box, "the panel is on screen").not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      expect(box!.y + box!.height, "not cut off at the bottom").toBeLessThanOrEqual(800)
    })
  }

  test("N.3 · at 390px the menu is one column with no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await page.getByRole("button", { name: "Open menu" }).click()

    const nav = page.locator("#mobile-nav")
    await expect(nav).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, "pixels of horizontal scroll").toBeLessThanOrEqual(0)

    // One column: every item starts at the same left edge. Measured on the
    // correct build, all of them sit at one x; with the panel's two desktop
    // columns forced onto the phone, half moved to a second x and this was
    // the assertion that saw it (a tolerance of two edges did not).
    const lefts = await nav
      .locator("a")
      .evaluateAll((links) =>
        links.filter((link) => link.getBoundingClientRect().width > 0).map((link) => Math.round(link.getBoundingClientRect().left))
      )
    expect([...new Set(lefts)], "the left edges of the menu's items").toHaveLength(1)
  })

  test("N.5 · in Spanish, the free tools land on their Spanish pages", async ({
    page,
    isMobile,
    request,
  }) => {
    await page.goto("/es")

    if (isMobile) {
      await page.getByRole("button", { name: /open menu|abrir men[uú]/i }).click()
    } else {
      await resourcesTrigger(page).click()
    }

    const scope = isMobile ? page.locator("#mobile-nav") : page
    const hrefs = await scope
      .locator('a[href*="/tools"], a[href*="/herramientas"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
    const tools = [...new Set(hrefs)].filter((href) => href !== "/es/herramientas")

    expect(tools.length, "the four tools of «Probalo gratis»").toBeGreaterThanOrEqual(4)
    expect(tools.filter((href) => !href.startsWith("/es/herramientas/"))).toEqual([])

    for (const href of tools) {
      expect((await request.get(href)).status(), href).toBe(200)
    }
  })
})

// --- CMP.5 · the language toggle on a comparison goes to its twin ------------

test.describe("comparison pages (banco CMP.5)", () => {
  for (const [from, to] of [
    ["/compare/lexicon", "/es/comparar/lexicon"],
    ["/es/comparar/lexicon", "/compare/lexicon"],
  ] as const) {
    test(`CMP.5 · the toggle on ${from} goes to ${to}`, async ({ page }) => {
      await page.goto(from)

      const other = from.startsWith("/es") ? "en" : "es"
      await page
        .locator('[aria-label="Language toggle"]')
        .first()
        .getByRole("button", { name: other, exact: true })
        .click()

      await expect(page).toHaveURL(new RegExp(`${to.replace(/\//g, "\\/")}$`))
    })
  }
})

// --- TOOL.8 · what the energy-curve tool refuses, it explains ----------------

test.describe("the energy curve tool refuses with a reason (banco TOOL.8)", () => {
  const CASES = [
    {
      label: "a set of one track",
      file: {
        name: "one.m3u8",
        mimeType: "audio/x-mpegurl",
        buffer: Buffer.from("#EXTM3U\n#EXTINF:360,Anetha - Pressure Drop\nPressure Drop.mp3\n"),
      },
      says: /at least two tracks|al menos dos temas/,
    },
    {
      label: "a Rekordbox XML cut in half",
      file: {
        name: "cut.xml",
        mimeType: "text/xml",
        buffer: Buffer.from('<?xml version="1.0"?><DJ_PLAYLISTS><COLLECTION Entries="3"><TRACK Name="A'),
      },
      says: /couldn't read that file|No pudimos leer ese archivo/,
    },
    {
      label: "a PDF",
      file: {
        name: "set.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n"),
      },
      says: /couldn't read that file|No pudimos leer ese archivo/,
    },
  ]

  for (const path of ["/tools/energy-curve", "/es/herramientas/curva-de-energia"]) {
    for (const { label, file, says } of CASES) {
      test(`TOOL.8 · ${path}, given ${label}, says why and stays usable`, async ({ page }) => {
        await page.goto(path)
        await page.setInputFiles('[data-testid="tool-file-input"]', file)

        await expect(page.getByTestId("tool-error")).toHaveText(says)
        await expect(page.getByTestId("tool-result")).toHaveCount(0)

        // "Without leaving the page half-done": the next thing still works.
        await page.getByTestId("tool-example").click()
        await expect(page.getByTestId("tool-result")).toBeVisible()
      })
    }
  }
})

// --- SEO4.1 · the first screen does not need JavaScript ----------------------

test.describe("the landing without JavaScript (banco SEO4.1)", () => {
  test.use({ javaScriptEnabled: false })

  for (const path of ["/", "/es"]) {
    test(`SEO4.1 · ${path} shows its whole hero with scripts off`, async ({ page }) => {
      await page.goto(path)

      const hero = page.locator("h1").first()
      await expect(hero).toBeVisible()

      // The defect was an opacity of 0 waiting for React: the hero was in the
      // HTML and invisible. Check the whole first screen, not only the h1.
      const hidden = await page.evaluate(() => {
        const fold = window.innerHeight
        return [...document.querySelectorAll("main *")]
          .filter((node) => {
            const box = node.getBoundingClientRect()
            // A box with no height is not on screen: the phone's closed menu
            // is a panel collapsed to 0px at opacity 0, on purpose, and the
            // first version of this test reported it as hidden hero text on
            // mobile-safari, three runs out of three.
            return (
              box.top < fold &&
              box.bottom > 0 &&
              box.width > 0 &&
              box.height > 0 &&
              (node.textContent ?? "").trim().length > 0
            )
          })
          .filter((node) => Number(getComputedStyle(node).opacity) === 0)
          .map((node) => (node.textContent ?? "").trim().slice(0, 40))
      })
      expect(hidden, "text above the fold at opacity 0").toEqual([])
    })
  }
})

// --- SEO3.1 and SEO4.2 · with the clock taken out ----------------------------
//
// Both were "automatable with work" for the same reason: written naively, each
// depends on how fast the machine is. SEO3.1 needs a choice made *before*
// hydration, and on a fast machine that window is too short to hit; SEO4.2
// needs an animation measured, and a sleep long enough to be safe on CI is a
// guess. So neither waits on time: SEO3.1 holds every JavaScript chunk at the
// network until the choice is made, and SEO4.2 waits on the opacity a section
// ends at, polled by Playwright.

/** True once React has attached to this element — the hydration signal. */
async function waitForHydration(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel)
      return el !== null && Object.keys(el).some((key) => key.startsWith("__react"))
    },
    selector
  )
}

test.describe("the blog filter before hydration (banco SEO3.1)", () => {
  test("SEO3.1 · a topic picked before the JavaScript arrives survives hydration", async ({ page }) => {
    // Every chunk waits here until the choice is made. Not a throttle: a
    // throttle shortens the race, this removes it.
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    await page.route("**/_next/static/chunks/**", async (route) => {
      await gate
      await route.continue()
    })

    await page.goto("/es/blog", { waitUntil: "commit" })

    const select = page.getByTestId("blog-tag-filter")
    await expect(select).toBeVisible()

    // Nothing has hydrated: the control is the server's HTML and nothing else.
    const hydratedEarly = await select.evaluate((el) =>
      Object.keys(el).some((key) => key.startsWith("__react"))
    )
    expect(hydratedEarly, "the gate held the JavaScript back").toBe(false)

    // The least-used topic, so the filtered list is a strict subset.
    const options = await select.locator("option").evaluateAll((nodes) =>
      nodes.map((node) => ({
        value: (node as HTMLOptionElement).value,
        label: node.textContent ?? "",
      }))
    )
    const topic = options.filter((option) => option.value !== "").at(-1)
    expect(topic, "the index offers at least one topic").toBeDefined()

    const items = page.locator("main ul > li")
    const total = await items.count()
    const expected = await items
      .filter({ has: page.locator("span", { hasText: new RegExp(`^${topic!.label}$`) }) })
      .count()
    expect(expected, "the chosen topic is a strict subset").toBeLessThan(total)
    expect(expected).toBeGreaterThan(0)

    await select.selectOption(topic!.value)

    release()
    await waitForHydration(page, '[data-testid="blog-tag-filter"]')

    await expect(select, "the choice is still in the control").toHaveValue(topic!.value)
    await expect(items, "the list is filtered by it, not showing everything").toHaveCount(expected)
  })
})

test.describe("the below-the-fold reveal (banco SEO4.2)", () => {
  /** The animated sections; an eager one carries no transition at all. */
  const REVEAL = 'main div[class*="transition-[opacity,transform]"]'

  test("SEO4.2 · the hero is painted at once, the rest waits for the scroll and then appears", async ({
    page,
  }) => {
    await page.goto("/")
    await waitForHydration(page, "main h1")

    // Above the fold: born visible, nothing to animate.
    await expect(page.locator("main h1").first()).toHaveCSS("opacity", "1")

    const reveals = page.locator(REVEAL)
    expect(await reveals.count(), "the landing still has sections to reveal").toBeGreaterThan(3)

    // Hydrated and settled, and the far sections are still hidden: they did not
    // all appear at once on load.
    const last = reveals.last()
    await expect(last, "a section far down waits for the scroll").toHaveCSS("opacity", "0")

    // Scroll to it; it reveals. Polled on the state, not slept on.
    await last.scrollIntoViewIfNeeded()
    await expect(last, "reaching it reveals it").toHaveCSS("opacity", "1")
  })

  test.describe("with reduced motion", () => {
    // Found by this test, on 10/10/2026: with reduced motion on, every section
    // under the hero stayed at opacity 0 for good, scroll or no scroll — a
    // hydration mismatch in SectionReveal (see the comment there).
    test("SEO4.2 · with reduced motion nothing waits to be revealed, and nothing stays hidden", async ({ page }) => {
      // `emulateMedia` rather than `test.use({ reducedMotion })`: the option
      // did not reach `matchMedia` with the container's Chromium, and a test
      // of reduced motion that runs without it would pass for the wrong
      // reason. The check right after makes that impossible to miss.
      await page.emulateMedia({ reducedMotion: "reduce" })
      expect(
        await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
        "the page really sees reduced motion"
      ).toBe(true)

      await page.goto("/")
      await waitForHydration(page, "main h1")

      const reveals = page.locator(REVEAL)
      const count = await reveals.count()
      expect(count).toBeGreaterThan(3)

      // Without scrolling to any of them.
      for (let i = 0; i < count; i += 1) {
        await expect(reveals.nth(i), `section ${i + 1} is visible without a scroll`).toHaveCSS(
          "opacity",
          "1"
        )
      }
    })
  })
})
