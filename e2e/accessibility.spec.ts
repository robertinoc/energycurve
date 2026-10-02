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
  // The three lote-10 articles: English-only, each answering a learning query
  // the keyword map saw with no page. One is enough for the renderer they
  // share with the other eight, but all three are new HTML and each has its
  // own FAQ block, which is the part that has gone wrong before.
  ["article: how to structure a dj set", "/blog/how-to-structure-a-dj-set"],
  ["article: how does a dj set work", "/blog/how-does-a-dj-set-work"],
  ["article: what is a dj set", "/blog/what-is-a-dj-set"],
  // Lote 12: the A→B articles, with a table and a FAQ block each.
  ["article: traktor to rekordbox", "/blog/export-traktor-playlist-to-rekordbox"],
  ["article: serato crates and rekordbox", "/blog/serato-crates-and-rekordbox"],
  ["article: rekordbox to usb", "/blog/rekordbox-export-playlist-to-usb-greyed-out"],
  ["article: crates de serato (es)", "/es/blog/crates-de-serato-y-rekordbox"],
  // Lote 14: the other two Spanish twins of the A→B articles.
  ["article: traktor a rekordbox (es)", "/es/blog/exportar-playlist-de-traktor-a-rekordbox"],
  ["article: rekordbox a usb (es)", "/es/blog/exportar-playlist-de-rekordbox-a-usb"],
  // Lote 13: the preparation article.
  ["article: how djs prepare their sets", "/blog/how-djs-prepare-their-sets"],
  // The public tools. They arrived in two batches (#229, #231) and neither added
  // them here, so the WCAG sweep skipped the only pages on the site a stranger
  // is expected to *operate* rather than read — and #229's own Lighthouse run
  // caught an unlabelled file input on its first pass.
  ["tools hub", "/tools"],
  ["energy curve tool", "/tools/energy-curve"],
  ["camelot wheel", "/tools/camelot-wheel"],
  ["key and BPM checker", "/tools/key-bpm-compatibility"],
  ["playlist converter", "/tools/traktor-rekordbox-converter"],
  ["tools hub (es)", "/es/herramientas"],
  ["energy curve tool (es)", "/es/herramientas/curva-de-energia"],
  ["camelot wheel (es)", "/es/herramientas/rueda-camelot"],
  ["key and BPM checker (es)", "/es/herramientas/compatibilidad-tonalidad-bpm"],
  ["playlist converter (es)", "/es/herramientas/conversor-traktor-rekordbox"],
  // The content pages. One glossary entry rather than all twenty-one: they are
  // one component rendered with different words, and sweeping forty-two pages
  // would add minutes to every CI run to re-test the same markup. The draft
  // guide is here because it is the page that carries every component at once,
  // which makes it the most interesting page on the site for this sweep.
  ["glossary index", "/glossary"],
  ["glossary entry", "/glossary/energy-curve"],
  ["guide index", "/guide"],
  ["draft guide", "/guide/components"],
  ["glossary index (es)", "/es/glosario"],
  ["glossary entry (es)", "/es/glosario/curva-de-energia"],
  ["guide index (es)", "/es/guia"],
  ["draft guide (es)", "/es/guia/componentes"],
  // The first real guide, in both languages (lote 11). One page per language
  // rather than the index alone: the index existed before and was swept; the
  // guide is where every content component renders at once, on a real page.
  ["guide: energy curve", "/guide/energy-curve-in-a-dj-set"],
  ["guide: energy curve (es)", "/es/guia/curva-de-energia-en-un-set-de-dj"],
  // The comparison pages. Two of the four rather than all eight: they share one
  // renderer and one registry, so a third adds coverage of the same code. These
  // two are the ones that differ — SetFlow's page is the only one with a
  // callout, and Lexicon's is the longest table.
  ["comparison (setflow)", "/compare/setflow"],
  ["comparison (lexicon)", "/compare/lexicon"],
  ["comparison (es, setflow)", "/es/comparar/setflow"],
  ["comparison (es, lexicon)", "/es/comparar/lexicon"],
  // Lote 13: the market comparisons, five programs and no "us" column.
  ["comparison (rekordbox vs serato vs traktor)", "/compare/rekordbox-vs-serato-vs-traktor"],
  ["comparison (best dj software)", "/compare/best-dj-software"],
  ["comparison (es, rekordbox vs serato vs traktor)", "/es/comparar/rekordbox-vs-serato-vs-traktor"],
  ["comparison (es, mejor software para dj)", "/es/comparar/mejor-software-para-dj"],
  // SEO-E30. The two reference pages were outside the sweep in both languages,
  // and they are dense data tables inside horizontally scrollable regions —
  // the exact shape that produced the keyboard trap #232 found on the Camelot
  // wheel. They also gained a `<details>` FAQ in this branch.
  ["energy tags", "/energy-tags"],
  ["import formats", "/import-formats"],
  ["energy tags (es)", "/es/energy-tags"],
  ["import formats (es)", "/es/import-formats"],
  // Lote 13: the generated harmonic table, two wide tables and an SVG preview.
  ["harmonic cheat sheet", "/harmonic-mixing-cheat-sheet"],
  ["harmonic cheat sheet (es)", "/es/tabla-de-mezcla-armonica"],
  // One article, Spanish, because Spanish is the only language they exist in.
  // Like the glossary, the five are one component rendered with different
  // words, so one of them tests the markup.
  ["blog article (es)", "/es/blog/antes-de-tocar-no-despues"],
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
  // Axe checks heading order but tolerates several h1s. A screen-reader user
  // navigating by heading needs one answer to "what is this page".
  // One test per page, like the WCAG sweep above: a single test looping over
  // every public page outgrew the 30 s budget on mobile-safari.
  for (const [name, path] of PUBLIC_PAGES) {
    test(`${name} has exactly one h1, and it is not empty`, async ({ page }) => {
      await page.goto(path)

      const headings = page.locator("h1")
      await expect(headings, `${name} should have one h1`).toHaveCount(1)
      await expect(headings.first()).not.toBeEmpty()
    })
  }

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

  // WCAG 2.1 · 1.4.13: content that appears on focus has to be dismissible
  // without moving the focus. Axe cannot check that — it is behaviour, not
  // markup — and the glossary tooltip failed it until H-19, with a comment
  // saying Escape was not needed. One article per language: the tooltip is the
  // same component everywhere, and the two root layouts are what could differ.
  for (const [name, path] of [
    ["an article (es)", "/es/blog/esta-bien-el-orden-de-mi-set"],
    ["an article (en)", "/blog/how-to-structure-a-dj-set"],
  ] as const) {
    test(`${name}: Escape closes a term's tooltip without moving focus`, async ({
      page,
    }) => {
      await page.goto(path)
      await page.waitForLoadState("networkidle")

      const term = page.locator(".ec-term").first()
      const link = term.locator("a")
      const tip = term.locator('[role="tooltip"]')

      await link.focus()
      await expect(tip).toBeVisible()

      await page.keyboard.press("Escape")
      await expect(tip).toBeHidden()

      // The point of the criterion: the reader is still where they were.
      expect(
        await link.evaluate((node) => node === document.activeElement)
      ).toBe(true)

      // And the definition comes back the next time somebody asks for it,
      // rather than staying dismissed for the rest of the visit. Leaving and
      // re-entering by focus() rather than Tab/Shift+Tab: WebKit, like Safari by
      // default, does not move Tab focus onto links, so a Tab there never leaves
      // the term — which said nothing about the tooltip.
      await link.evaluate((node) => (node as HTMLElement).blur())
      await link.focus()
      await expect(tip).toBeVisible()
    })
  }

  test("the language toggle is a real control, not a styled div", async ({ page }) => {
    await page.goto("/")

    const toggle = page.getByRole("link", { name: /español|es\b/i }).first()
    await expect(toggle).toBeVisible()
  })
})
