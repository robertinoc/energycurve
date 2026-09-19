import { expect, test, type APIRequestContext } from "@playwright/test"

/**
 * Walks the sitemap and follows every internal link it finds.
 *
 * The unit tests assert that the sitemap contains the URLs it should. They
 * cannot assert that those URLs answer, or that the links inside them go
 * anywhere — a renamed slug, a hand-written href, a page that 500s under a
 * production build are all invisible to them.
 *
 * Runs over HTTP against the production server Playwright starts, and uses the
 * request context rather than a browser: there are a few hundred links here and
 * rendering each page in four browsers to read its anchors would cost minutes
 * to learn nothing more.
 */

/** Ours, not somebody else's. Mailto, tel and external hosts are out of scope. */
function internalHrefs(html: string, origin: string): string[] {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])

  return [
    ...new Set(
      hrefs
        .filter((href) => href.startsWith("/") || href.startsWith(origin))
        .map((href) => (href.startsWith(origin) ? href.slice(origin.length) : href))
        // A fragment is a position on a page, not a page.
        .map((href) => href.split("#")[0])
        .filter((href) => href.startsWith("/"))
        // Next's own asset URLs are not navigable pages.
        .filter((href) => !href.startsWith("/_next/"))
        .filter((href) => !/\.(ico|png|jpg|svg|webmanifest|xml|txt)$/.test(href))
    ),
  ]
}

async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const response = await request.get("/sitemap.xml")
  expect(response.status(), "the sitemap itself").toBe(200)

  const xml = await response.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

  expect(locs.length, "the sitemap is not empty").toBeGreaterThan(0)

  // The sitemap carries production URLs; the server under test is on localhost.
  return locs.map((loc) => new URL(loc).pathname)
}

test.describe("the sitemap and what it links to", () => {
  // One browser project is enough: this is HTTP, not rendering.
  test.skip(({ browserName }) => browserName !== "chromium", "HTTP only")

  test("every URL in the sitemap answers 200", async ({ request }) => {
    const paths = await sitemapPaths(request)
    const broken: { path: string; status: number }[] = []

    for (const path of paths) {
      const response = await request.get(path)
      if (response.status() !== 200) {
        broken.push({ path, status: response.status() })
      }
    }

    expect(broken).toEqual([])
  })

  test("no internal link on a sitemap page is broken", async ({
    request,
    baseURL,
  }) => {
    const origin = baseURL!.replace(/\/$/, "")
    const paths = await sitemapPaths(request)

    const seen = new Map<string, number>()
    const broken: { from: string; href: string; status: number }[] = []

    for (const path of paths) {
      const page = await request.get(path)
      const html = await page.text()

      for (const href of internalHrefs(html, origin)) {
        let status = seen.get(href)

        if (status === undefined) {
          status = (await request.get(href)).status()
          seen.set(href, status)
        }

        // 200 or a redirect that resolves; anything else is a link a reader
        // would land on and find nothing.
        if (status >= 400) {
          broken.push({ from: path, href, status })
        }
      }
    }

    expect(broken).toEqual([])
  })

  test("the draft guide is reachable by URL but absent from the sitemap", async ({
    request,
  }) => {
    const paths = await sitemapPaths(request)

    for (const draft of ["/guide/components", "/es/guia/componentes"]) {
      expect(paths, `${draft} must not be listed`).not.toContain(draft)

      // Reachable on purpose — it exists to be reviewed — and noindex, which
      // is asserted on the HTML rather than inferred from the sitemap.
      const response = await request.get(draft)
      expect(response.status()).toBe(200)
      expect(await response.text()).toContain("noindex")
    }
  })
})
