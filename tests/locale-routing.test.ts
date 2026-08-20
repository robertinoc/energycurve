import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import {
  LOCALE_PREFIX,
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

  it("lists both languages of every localized page", () => {
    expect(pageEntries).toHaveLength(LOCALIZED_PATHS.length * 2)

    for (const path of LOCALIZED_PATHS) {
      for (const locale of ["en", "es"] as const) {
        const url = `${SITE_URL}${localizedPath(path, locale)}`
        expect(entries.some((entry) => entry.url === url), url).toBe(true)
      }
    }
  })

  it("gives every localized page the alternates block, in both directions", () => {
    for (const entry of pageEntries) {
      expect(entry.alternates?.languages).toBeDefined()
      const languages = entry.alternates!.languages as Record<string, string>
      expect(Object.keys(languages).sort()).toEqual(["en", "es"])
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
   * create `app/es/terms/page.tsx` produces a 404 in production and a green CI.
   */
  const ROUTE_FILE: Record<string, string> = {
    "/": "page.tsx",
    "/pricing": "pricing/page.tsx",
    "/blog": "blog/page.tsx",
    "/install": "install/page.tsx",
    "/privacy": "privacy/page.tsx",
    "/terms": "terms/page.tsx",
    "/cookie-policy": "cookie-policy/page.tsx",
  }

  it("has an English and a Spanish route file per localized path", () => {
    for (const path of LOCALIZED_PATHS) {
      const relative = ROUTE_FILE[path]
      expect(relative, `no route file mapped for ${path}`).toBeDefined()

      for (const dir of ["app", `app${LOCALE_PREFIX}`]) {
        const file = join(process.cwd(), dir, relative)
        expect(() => readFileSync(file, "utf8"), file).not.toThrow()
      }
    }
  })

  it("pins each route file to one locale, matching its directory", () => {
    for (const path of LOCALIZED_PATHS) {
      const relative = ROUTE_FILE[path]

      const english = readFileSync(join(process.cwd(), "app", relative), "utf8")
      expect(english, `app/${relative}`).toContain('const LOCALE = "en"')

      const spanish = readFileSync(
        join(process.cwd(), `app${LOCALE_PREFIX}`, relative),
        "utf8"
      )
      expect(spanish, `app/es/${relative}`).toContain('const LOCALE = "es"')
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
