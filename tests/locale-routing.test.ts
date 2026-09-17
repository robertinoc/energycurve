import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import {
  indexableLocales,
  isIndexable,
  LOCALIZED_PATHS,
  isPrefixedLocalePath,
  localizedPath,
  splitLocalePath,
} from "@/lib/content/locale-routing"
import { PAGE_METADATA } from "@/lib/content/page-metadata"
import { getSiteCopy } from "@/lib/content/site-copy"
import {
  buildAlternates,
  marketingMetadata,
  openGraphLocale,
  SITE_URL,
} from "@/lib/seo"

describe("localizedPath", () => {
  it("leaves English at the root", () => {
    expect(localizedPath("/", "en")).toBe("/")
    expect(localizedPath("/pricing", "en")).toBe("/pricing")
  })

  it("prefixes Spanish", () => {
    expect(localizedPath("/pricing", "es")).toBe("/es/pricing")
    expect(localizedPath("/cookie-policy", "es")).toBe("/es/cookie-policy")
  })

  it("maps the Spanish home to /es, not /es/", () => {
    // A trailing slash would be a second URL for the same page, which is a
    // duplicate-content report waiting to happen.
    expect(localizedPath("/", "es")).toBe("/es")
  })

  it("tolerates a path given without its leading slash", () => {
    expect(localizedPath("pricing", "es")).toBe("/es/pricing")
    expect(localizedPath("pricing", "en")).toBe("/pricing")
  })
})

describe("splitLocalePath", () => {
  it("reads the locale back out of a pathname", () => {
    expect(splitLocalePath("/es/pricing")).toEqual({
      locale: "es",
      path: "/pricing",
    })
    expect(splitLocalePath("/es")).toEqual({ locale: "es", path: "/" })
    expect(splitLocalePath("/es/")).toEqual({ locale: "es", path: "/" })
  })

  it("treats unprefixed paths as English", () => {
    expect(splitLocalePath("/pricing")).toEqual({
      locale: "en",
      path: "/pricing",
    })
    expect(splitLocalePath("/")).toEqual({ locale: "en", path: "/" })
  })

  it("matches whole segments only", () => {
    // The bug this prevents: reading /estudio as /es + "tudio".
    for (const pathname of ["/estudio", "/essentials", "/es-la", "/establish"]) {
      expect(splitLocalePath(pathname).locale).toBe("en")
      expect(isPrefixedLocalePath(pathname)).toBe(false)
    }
  })

  it("round-trips every localized path in both languages", () => {
    for (const path of LOCALIZED_PATHS) {
      for (const locale of ["en", "es"] as const) {
        const url = localizedPath(path, locale)
        expect(splitLocalePath(url)).toEqual({ locale, path })
      }
    }
  })
})

describe("hreflang and canonicals", () => {
  it("canonicalises each language to itself", () => {
    // Pointing the Spanish page at the English one would tell Google the Spanish
    // page is a duplicate not worth indexing — the exact outcome the /es routes
    // exist to undo.
    expect(buildAlternates("/pricing", "es").canonical).toBe("/es/pricing")
    expect(buildAlternates("/pricing", "en").canonical).toBe("/pricing")
  })

  it("offers both languages plus an x-default from either side", () => {
    for (const locale of ["en", "es"] as const) {
      const { languages } = buildAlternates("/pricing", locale)
      expect(languages).toEqual({
        en: "/pricing",
        es: "/es/pricing",
        "x-default": "/pricing",
      })
    }
  })

  it("drops the English alternate from a page that is noindex in English", () => {
    // /blog in English is a near-empty page pointing at the Spanish articles.
    // Naming it as the English version of /es/blog would advertise a page we
    // have asked Google to ignore, so the Spanish index stands alone — and
    // x-default falls to it, because it is the only blog index left to serve.
    expect(buildAlternates("/blog", "es").languages).toEqual({
      es: "/es/blog",
      "x-default": "/es/blog",
    })
  })

  it("marks the English blog index noindex, and nothing else", () => {
    expect(marketingMetadata("/blog", "en").robots).toEqual({
      index: false,
      follow: true,
    })

    for (const path of LOCALIZED_PATHS) {
      for (const locale of ["en", "es"] as const) {
        if (path === "/blog" && locale === "en") {
          continue
        }

        expect(
          marketingMetadata(path, locale).robots,
          `${locale}:${path}`
        ).toBeUndefined()
      }
    }
  })

  it("puts the same social card on every localized page", () => {
    // /es used to carry six og: tags to the English home's eleven, because the
    // file-based opengraph-image only merged into the page in its own segment.
    for (const path of LOCALIZED_PATHS) {
      for (const locale of ["en", "es"] as const) {
        const meta = marketingMetadata(path, locale)
        expect(meta.openGraph?.images, `${locale}:${path}`).toBeDefined()
        expect(meta.twitter?.images, `${locale}:${path}`).toBeDefined()
      }
    }
  })

  it("names the other language as the Open Graph alternate", () => {
    expect(marketingMetadata("/", "es").openGraph?.alternateLocale).toBe("en_US")
    expect(marketingMetadata("/", "en").openGraph?.alternateLocale).toBe("es_LA")
  })

  it("uses a bare `es` for hreflang so every Spanish region is served", () => {
    // Region-specific hreflang (es-AR) would exclude the rest of the market;
    // Open Graph's dialect hint is where the Rioplatense copy is declared.
    expect(Object.keys(buildAlternates("/", "es").languages)).toContain("es")
    expect(openGraphLocale("es")).toBe("es_LA")
    expect(openGraphLocale("en")).toBe("en_US")
  })
})

describe("page metadata", () => {
  it("covers every localized path in both languages", () => {
    for (const path of LOCALIZED_PATHS) {
      const meta = PAGE_METADATA[path]
      for (const locale of ["en", "es"] as const) {
        expect(meta.title[locale].length).toBeGreaterThan(0)
        expect(meta.description[locale].length).toBeGreaterThan(0)
      }
    }
  })

  it("actually translates — no page shares a title across languages", () => {
    // Guards the failure this whole change is about: a Spanish page shipping an
    // English <title>, which is what a search result is built from.
    for (const path of LOCALIZED_PATHS) {
      const { title, description } = PAGE_METADATA[path]
      expect(title.es, `${path} title`).not.toBe(title.en)
      expect(description.es, `${path} description`).not.toBe(description.en)
    }
  })

  it("builds a Spanish page's Open Graph URL and locale from its own route", () => {
    const meta = marketingMetadata("/pricing", "es")
    expect(meta.openGraph).toMatchObject({
      url: `${SITE_URL}/es/pricing`,
      locale: "es_LA",
    })
    expect(meta.alternates?.canonical).toBe("/es/pricing")
  })
})

describe("sitemap", () => {
  const entries = sitemap()

  /**
   * Blog articles are in the sitemap too, and they are not localized pages: each
   * exists in the one language it was written in. Split here so the assertions
   * about localized pages stay exact instead of being loosened to accommodate them.
   */
  const isArticle = (url: string) => /\/blog\/[^/]+$/.test(url)
  const pageEntries = entries.filter((entry) => !isArticle(entry.url))
  const articleEntries = entries.filter((entry) => isArticle(entry.url))

  it("lists every indexable language of every localized page", () => {
    for (const path of LOCALIZED_PATHS) {
      for (const locale of ["en", "es"] as const) {
        const url = `${SITE_URL}${localizedPath(path, locale)}`
        expect(entries.some((entry) => entry.url === url), url).toBe(
          isIndexable(path, locale)
        )
      }
    }
  })

  it("leaves the noindex English blog index out entirely", () => {
    // The inverse of the assertion above, spelled out because it is the whole
    // point of the noindex list: a sitemap that lists a page we have asked
    // Google not to index is asking and un-asking in the same file.
    expect(entries.some((entry) => entry.url === `${SITE_URL}/blog`)).toBe(false)
    expect(entries.some((entry) => entry.url === `${SITE_URL}/es/blog`)).toBe(true)
  })

  it("names only indexable languages in each page's alternates", () => {
    for (const entry of pageEntries) {
      expect(entry.alternates?.languages).toBeDefined()
      const languages = entry.alternates!.languages as Record<string, string>

      // Which path this entry belongs to, read back off its own URL.
      const path = LOCALIZED_PATHS.find((candidate) =>
        (["en", "es"] as const).some(
          (locale) => `${SITE_URL}${localizedPath(candidate, locale)}` === entry.url
        )
      )!

      expect(Object.keys(languages).sort(), entry.url).toEqual(
        [...indexableLocales(path)].sort()
      )
    }
  })

  it("dates each article from its own revision, never the build", () => {
    // A build timestamp here would tell a crawler that every article changed on
    // every deploy, which is how `lastmod` stops being believed.
    const today = new Date().toISOString().slice(0, 10)

    for (const entry of articleEntries) {
      const lastModified = new Date(entry.lastModified!).toISOString().slice(0, 10)
      expect(lastModified, entry.url).not.toBe(today)
    }
  })

  it("gives an article no alternates at all", () => {
    // The inversion of the rule above, and the reason the split exists: an article
    // has no translation, and advertising one would point a crawler at a 404.
    expect(articleEntries.length).toBeGreaterThan(0)

    for (const entry of articleEntries) {
      expect(entry.alternates?.languages, entry.url).toBeUndefined()
    }
  })

  it("emits no duplicate URLs", () => {
    const urls = entries.map((entry) => entry.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe("route files exist for both languages", () => {
  /**
   * The pages are the one part of this that types can't check: forgetting to
   * create the Spanish terms page produces a 404 in production and a green CI.
   *
   * The two directories are route groups — `app/(en)` and `app/(es)/es` — and
   * they are why the served HTML can say `lang="es"`. A route group is invisible
   * in the URL, so `/pricing` and `/es/pricing` are unchanged; what it buys is a
   * second root layout, and a root layout is the only place `<html>` is written.
   */
  const ROUTE_FILE: Record<string, string> = {
    "/": "page.tsx",
    "/pricing": "pricing/page.tsx",
    "/blog": "blog/page.tsx",
    "/install": "install/page.tsx",
    "/energy-tags": "energy-tags/page.tsx",
    "/import-formats": "import-formats/page.tsx",
    "/privacy": "privacy/page.tsx",
    "/terms": "terms/page.tsx",
    "/cookie-policy": "cookie-policy/page.tsx",
    "/subprocessors": "subprocessors/page.tsx",
  }

  const ROUTE_DIR = { en: "app/(en)", es: "app/(es)/es" } as const

  it("has an English and a Spanish route file per localized path", () => {
    for (const path of LOCALIZED_PATHS) {
      const relative = ROUTE_FILE[path]
      expect(relative, `no route file mapped for ${path}`).toBeDefined()

      for (const locale of ["en", "es"] as const) {
        const file = join(process.cwd(), ROUTE_DIR[locale], relative)
        expect(() => readFileSync(file, "utf8"), file).not.toThrow()
      }
    }
  })

  it("pins each route file to one locale, matching its directory", () => {
    for (const path of LOCALIZED_PATHS) {
      const relative = ROUTE_FILE[path]

      for (const locale of ["en", "es"] as const) {
        const file = join(process.cwd(), ROUTE_DIR[locale], relative)
        expect(readFileSync(file, "utf8"), file).toContain(
          `const LOCALE = "${locale}"`
        )
      }
    }
  })

  it("gives each language a root layout that states its own lang", () => {
    // The whole reason the route groups exist. A single root layout cannot know
    // which language the route below it renders in, which is how every /es page
    // used to serve `<html lang="en">` and correct it from an effect after
    // hydration — too late for anything that reads the HTML rather than the DOM.
    for (const [locale, dir] of [
      ["en", "app/(en)"],
      ["es", "app/(es)"],
    ] as const) {
      const layout = readFileSync(join(process.cwd(), dir, "layout.tsx"), "utf8")
      expect(layout, `${dir}/layout.tsx`).toContain(`lang="${locale}"`)
    }
  })
})

describe("resolved site copy carries its locale", () => {
  it("reports the language it was built for", () => {
    // Every internal link is derived from this, so a wrong value silently sends
    // Spanish visitors to English pages.
    expect(getSiteCopy("es").locale).toBe("es")
    expect(getSiteCopy("en").locale).toBe("en")
    expect(getSiteCopy().locale).toBe("en")
  })
})
