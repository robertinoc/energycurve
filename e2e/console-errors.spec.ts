import { expect, test, type Page } from "@playwright/test"

/**
 * Nothing in the console, and above all no hydration error.
 *
 * This exists because of #232. A tool page rendered correct HTML on the server,
 * passed every assertion about that HTML, and was still broken for anybody who
 * typed before React attached — the state and the DOM disagreed and nothing in
 * CI was watching the one place that says so. React announces that class of bug
 * in the console and nowhere else.
 *
 * So the sweep covers the pages this branch adds *and* the eight public tools:
 * the tools are where it happened, and a regression test that only covers the
 * new pages would have missed the original bug.
 *
 * Runs against the production build (see `playwright.config.ts`), which matters:
 * React's development build reports hydration mismatches in full, production
 * reports them as a numbered error, and both are caught here.
 */

const PAGES = [
  ["glossary index", "/glossary"],
  ["glossary entry", "/glossary/energy-curve"],
  ["guide index", "/guide"],
  ["draft guide", "/guide/components"],
  ["glossary index (es)", "/es/glosario"],
  ["glossary entry (es)", "/es/glosario/curva-de-energia"],
  ["guide index (es)", "/es/guia"],
  ["draft guide (es)", "/es/guia/componentes"],
  // The comparison pages. Two of the four rather than all eight: they share one
  // renderer and one registry, so a third adds coverage of the same code. These
  // two are the ones that differ — SetFlow's page is the only one with a
  // callout, and Lexicon's is the longest table.
  ["comparison (setflow)", "/compare/setflow"],
  ["comparison (lexicon)", "/compare/lexicon"],
  ["comparison (es, setflow)", "/es/comparar/setflow"],
  ["comparison (es, lexicon)", "/es/comparar/lexicon"],
  ["tools hub", "/tools"],
  ["energy curve tool", "/tools/energy-curve"],
  ["camelot wheel", "/tools/camelot-wheel"],
  ["key and BPM checker", "/tools/key-bpm-compatibility"],
  ["tools hub (es)", "/es/herramientas"],
  ["energy curve tool (es)", "/es/herramientas/curva-de-energia"],
  ["camelot wheel (es)", "/es/herramientas/rueda-camelot"],
  ["key and BPM checker (es)", "/es/herramientas/compatibilidad-tonalidad-bpm"],
  // The routes this branch touched. All three gained rendered copy and a
  // `<script type="application/ld+json">` emitted from a server component into
  // a client-component page, which is precisely the arrangement that produced
  // the hydration bug in #232 — and which server HTML assertions cannot see.
  ["energy tags", "/energy-tags"],
  ["import formats", "/import-formats"],
  ["install", "/install"],
  ["energy tags (es)", "/es/energy-tags"],
  ["import formats (es)", "/es/import-formats"],
  ["install (es)", "/es/install"],
  ["blog article (es)", "/es/blog/antes-de-tocar-no-despues"],
  ["landing", "/"],
  ["landing (es)", "/es"],
  // The blog index gained a controlled `<select>` (SEO-E16). That is the exact
  // shape of the #232 bug: a value that lives in the DOM before React attaches,
  // is never seen by it, and is then contradicted by the first render. Server
  // HTML assertions cannot see it, which is why this sweep exists.
  ["blog index (es)", "/es/blog"],
  ["blog index", "/blog"],
] as const

/**
 * What React says when the server's HTML and the client's first render
 * disagree, across development and production builds and across the wordings
 * it has used. Matched case-insensitively.
 */
const HYDRATION_SIGNS = [
  "hydration",
  "hydrating",
  "did not match",
  "server rendered html",
  "text content does not match",
  // Production builds replace the message with a link to this page.
  "react.dev/errors/418",
  "react.dev/errors/423",
  "react.dev/errors/425",
]

/**
 * Console noise that is not ours and not a defect.
 *
 * Kept deliberately short. Every entry here is a thing this test will never
 * catch again, so the bar is "provably not the application" — a blocked
 * third-party request, not "this one is probably fine".
 */
const IGNORED = [
  "favicon",
  "net::ERR_BLOCKED_BY_CLIENT",
  // PostHog is absent in CI (NEXT_PUBLIC_POSTHOG_KEY is unset), and its own
  // warning about that is not a page defect.
  "posthog",
  /**
   * Chromium says this on every page of the site, including the ones that
   * predate this branch: our Content-Security-Policy is delivered
   * report-only, and `upgrade-insecure-requests` does nothing in a report-only
   * policy. It is a real observation about the header and a real (small)
   * finding — but it is not a page defect, it is identical everywhere, and
   * leaving it un-ignored would make this sweep fail on all sixteen pages for
   * one header. Fixing the header belongs in whatever change owns the CSP.
   */
  "upgrade-insecure-requests",
]

function collect(page: Page) {
  const messages: string[] = []

  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return
    messages.push(message.text())
  })

  // An exception that escapes to the window never reaches console handlers in
  // some browsers, so it is collected separately.
  page.on("pageerror", (error) => {
    messages.push(`pageerror: ${error.message}`)
  })

  return messages
}

function meaningful(messages: string[]): string[] {
  return messages.filter(
    (message) =>
      !IGNORED.some((ignored) =>
        message.toLowerCase().includes(ignored.toLowerCase())
      )
  )
}

test.describe("no console errors and no hydration mismatch", () => {
  for (const [name, path] of PAGES) {
    test(`${name} hydrates cleanly`, async ({ page }) => {
      const messages = collect(page)

      await page.goto(path)
      await page.waitForLoadState("networkidle")

      // Hydration errors are reported after the first client render, which can
      // land a tick after the network goes quiet.
      await page.waitForTimeout(500)

      const seen = meaningful(messages)

      const hydration = seen.filter((message) =>
        HYDRATION_SIGNS.some((sign) =>
          message.toLowerCase().includes(sign.toLowerCase())
        )
      )

      // Asserted separately so the report says which kind of failure it is:
      // a hydration mismatch is a different bug from a failed fetch, and the
      // first one is the one that ships looking fine.
      expect(hydration, `hydration errors on ${path}`).toEqual([])
      expect(seen, `console errors on ${path}`).toEqual([])
    })
  }
})
