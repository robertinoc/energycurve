import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { ComparisonPage } from "@/components/content/comparison-page"
import { ContentFooter } from "@/components/marketing/content-footer"

import {
  KNOWN_SOURCES,
  MEDIUMS,
  touchFromVisit,
} from "@/lib/attribution/first-touch"
import { OUTBOUND_SOURCE, outboundHref } from "@/lib/attribution/utm"
import { COMPARISONS } from "@/lib/content/compare/comparisons"
import { buildComparisonStructuredData } from "@/lib/content/structured-data"
import { buildOrganization, SITE_URL } from "@/lib/seo"

/**
 * Lote 20, task 3: `docs/seo/utm-convention.md` is a closed list, and this file
 * is what keeps it closed. It fails when the document and the code disagree,
 * when an example in the document is not read the way the document says, and
 * when anything the repo publishes carries a `utm_source` outside the list.
 */

// The comparison page carries client pieces (the page shell's navigation) that
// ask for the App Router; a static render has none.
vi.mock("next/navigation", () => ({
  usePathname: () => "/compare",
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

const ROOT = process.cwd()
const DOC = readFileSync(join(ROOT, "docs/seo/utm-convention.md"), "utf8")

/** The rows of the first table under `## heading`, as arrays of cells. */
function tableUnder(heading: string): string[][] {
  const start = DOC.indexOf(`## ${heading}`)

  expect(start, `docs/seo/utm-convention.md has no "## ${heading}"`).toBeGreaterThan(-1)

  const after = DOC.slice(start).split("\n").slice(1)
  const rows: string[][] = []
  let inTable = false

  for (const line of after) {
    if (line.startsWith("|")) {
      inTable = true
      rows.push(
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim())
      )
    } else if (inTable) {
      break
    } else if (line.startsWith("## ")) {
      break
    }
  }

  // Header and separator rows out.
  return rows.slice(2)
}

const unquote = (cell: string) => cell.replace(/^`|`$/g, "")

describe("the document and the code say the same thing", () => {
  it("lists exactly the sources the product knows, with their mediums", () => {
    const documented = Object.fromEntries(
      tableUnder("Fuentes").map(([source, medium]) => [unquote(source!), medium])
    )

    expect(documented).toEqual(KNOWN_SOURCES)
  })

  it("lists exactly the mediums", () => {
    const documented = tableUnder("Medios").map(([medium]) => unquote(medium!))

    expect(documented).toEqual([...MEDIUMS])
  })

  it("has three examples, and the product reads each one the way the document says", () => {
    const examples = tableUnder("Tres ejemplos reales")

    expect(examples).toHaveLength(3)

    for (const [, link, readAs] of examples) {
      const touch = touchFromVisit({
        href: unquote(link!),
        referrer: "",
        at: new Date("2026-10-20T00:00:00Z"),
      })

      expect(`${touch?.source} · ${touch?.medium} · ${touch?.campaign}`).toBe(readAs)
    }
  })
})

describe("what the repo publishes", () => {
  const SCANNED = ["app", "components", "lib", "content", "public", "docs"]
  // The attribution code quotes the aliases assistants use (utm_source=chatgpt.com)
  // in its comments; the tests quote broken values on purpose.
  const SKIPPED = ["lib/attribution/", "node_modules", ".next"]
  const TEXT = /\.(ts|tsx|md|mdx|txt|json|html|mjs)$/

  function files(dir: string): string[] {
    const out: string[] = []

    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      const rel = relative(ROOT, path)

      if (SKIPPED.some((skip) => rel.startsWith(skip) || rel.includes(`/${skip}`))) {
        continue
      }

      if (statSync(path).isDirectory()) {
        out.push(...files(path))
      } else if (TEXT.test(name)) {
        out.push(path)
      }
    }

    return out
  }

  it("never carries a utm_source outside the closed list", () => {
    const allowed = new Set<string>([...Object.keys(KNOWN_SOURCES), OUTBOUND_SOURCE])
    const outside: string[] = []

    for (const dir of SCANNED) {
      for (const file of files(join(ROOT, dir))) {
        const text = readFileSync(file, "utf8")

        for (const match of text.matchAll(/utm_source=([A-Za-z0-9._-]+)/g)) {
          if (!allowed.has(match[1]!)) {
            outside.push(`${relative(ROOT, file)}: ${match[1]}`)
          }
        }
      }
    }

    expect(outside).toEqual([])
  })

  it("writes no link to StageLink by hand", () => {
    const handWritten: string[] = []

    for (const dir of ["app", "components"]) {
      for (const file of files(join(ROOT, dir))) {
        if (readFileSync(file, "utf8").includes('"https://stagelink.art"')) {
          handWritten.push(relative(ROOT, file))
        }
      }
    }

    expect(handWritten).toEqual([])
  })

  it("tags the one outbound link in llms.txt and leaves the site's own pages clean", async () => {
    const { GET } = await import("@/app/llms.txt/route")
    const body = await GET().text()
    const links = [...body.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0])
    const own = links.filter((link) => link.startsWith(SITE_URL))
    const outbound = links.filter((link) => !link.startsWith(SITE_URL))

    expect(own.length).toBeGreaterThan(10)
    expect(own.filter((link) => link.includes("utm_"))).toEqual([])
    expect(outbound).toEqual([
      "https://stagelink.art/?utm_source=energycurve&utm_medium=crosspromo&utm_campaign=llms-txt",
    ])
  })

  it("keeps identifiers clean: no UTM in the entity or in a comparison's citations", () => {
    expect(JSON.stringify(buildOrganization("en"))).not.toContain("utm_")

    for (const comparison of COMPARISONS) {
      expect(JSON.stringify(buildComparisonStructuredData(comparison, "en"))).not.toContain(
        "utm_"
      )
    }
  })
})

describe("rendered pages", () => {
  const hrefs = (html: string) =>
    [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!.replaceAll("&amp;", "&"))

  it("tags every StageLink link in the footer, and no link to the site", () => {
    const links = hrefs(renderToStaticMarkup(createElement(ContentFooter, { locale: "es" })))
    const stagelink = links.filter((link) => link.includes("stagelink.art"))

    expect(stagelink.length).toBeGreaterThan(0)
    for (const link of stagelink) {
      expect(link).toMatch(/utm_source=energycurve&utm_medium=crosspromo&utm_campaign=footer-/)
    }
    expect(links.filter((link) => link.startsWith("/") && link.includes("utm_"))).toEqual([])
  })

  it("tags every source link of a comparison", () => {
    for (const comparison of COMPARISONS) {
      const links = hrefs(
        renderToStaticMarkup(createElement(ComparisonPage, { comparison, locale: "en" }))
      )

      for (const source of comparison.sources) {
        expect(
          links.some(
            (link) =>
              link.startsWith(new URL(source.url).origin) &&
              link.includes("utm_source=energycurve&utm_medium=referral&utm_campaign=compare-sources")
          ),
          `${comparison.id}: ${source.url}`
        ).toBe(true)
      }
    }
  })
})

describe("outboundHref", () => {
  it("says the link came from EnergyCurve, and keeps what the URL had", () => {
    expect(
      outboundHref("https://example.com/plan/?a=1#top", {
        medium: "referral",
        campaign: "compare-sources",
      })
    ).toBe(
      "https://example.com/plan/?a=1&utm_source=energycurve&utm_medium=referral&utm_campaign=compare-sources#top"
    )
  })

  it("refuses a campaign outside the format, so a typo cannot ship", () => {
    expect(() =>
      outboundHref("https://stagelink.art", { medium: "crosspromo", campaign: "Footer Suite" })
    ).toThrow()
  })
})
