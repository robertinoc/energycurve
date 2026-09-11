import { describe, expect, it } from "vitest"

import {
  buildLandingStructuredData,
  buildPricingStructuredData,
  serializeStructuredData,
} from "@/lib/seo"

/**
 * JSON-LD is embedded in a `<script>` tag with `dangerouslySetInnerHTML`, which
 * is the one place in this product where a string becomes executable markup.
 *
 * `JSON.stringify` alone does not escape `<`, so a value containing
 * `</script>` closes the tag early and everything after it is parsed as HTML.
 * That is script injection through a JSON blob, and it does not care that the
 * blob is valid JSON.
 *
 * Nothing hostile can reach these graphs today — they are built entirely from
 * static copy in this repo, and a test below pins that. The escaping exists
 * because that is a property of the current call sites and not of the
 * mechanism: the day someone adds a blog title or a playlist name to structured
 * data, the guard has to already be there, because the surrounding code will
 * look like it already works.
 */

describe("a hostile value cannot close the script tag", () => {
  it("escapes a literal </script>", () => {
    const serialised = serializeStructuredData({
      name: "Warm-up </script><script>alert(1)</script>",
    })

    expect(serialised).not.toContain("</script>")
    expect(serialised).not.toContain("<script>")
    expect(serialised).toContain("\\u003c")
  })

  it("escapes it however it is cased or spaced", () => {
    // `</SCRIPT >` closes a tag just as well, and a check that only looked for
    // the lowercase literal would miss it. Escaping every `<` sidesteps the
    // whole family rather than enumerating it.
    for (const attempt of [
      "</SCRIPT>",
      "</ScRiPt >",
      "</script\n>",
      "<img src=x onerror=alert(1)>",
      "<!--<script>",
    ]) {
      const serialised = serializeStructuredData({ name: attempt })

      expect(serialised, attempt).not.toContain("<")
      expect(serialised, attempt).not.toContain(">")
    }
  })

  it("escapes the line separators that are legal in JSON and illegal in a script", () => {
    // U+2028 and U+2029 are valid inside a JSON string and are raw line
    // terminators in older JavaScript parsers, which turns one value into two
    // statements.
    const serialised = serializeStructuredData({ name: "a b c" })

    expect(serialised).not.toContain(" ")
    expect(serialised).not.toContain(" ")
    expect(serialised).toContain("\\u2028")
  })
})

describe("and the output is still what a crawler reads", () => {
  it("round-trips to the identical object", () => {
    // Escaping that changed the value would be a different bug: Google would
    // read something other than what the page says.
    const graph = {
      "@context": "https://schema.org",
      name: "EnergyCurve — análisis de sets </script>",
      offers: [{ price: "9.99" }],
    }

    expect(JSON.parse(serializeStructuredData(graph))).toEqual(graph)
  })

  it("keeps accents and em dashes intact", () => {
    const serialised = serializeStructuredData({ name: "Análisis — curva" })

    expect(JSON.parse(serialised).name).toBe("Análisis — curva")
  })

  it("produces valid JSON for the real graphs, in both locales", () => {
    for (const locale of ["en", "es"] as const) {
      for (const build of [buildLandingStructuredData, buildPricingStructuredData]) {
        const serialised = serializeStructuredData(build({ locale }))

        expect(() => JSON.parse(serialised)).not.toThrow()
        expect(serialised).not.toContain("</")
      }
    }
  })
})

describe("what is actually in the graphs today", () => {
  it("carries nothing shaped like user data", () => {
    // The reason the escaping above is defence and not a fix.
    //
    // Searching for words was the first attempt and it was wrong: "playlist"
    // appears in the FAQ copy, because the product is about playlists. What
    // distinguishes a user's data from prose about users is its *shape* — a
    // UUID, an email address, a Stripe id. Marketing copy contains none of
    // those, and a leak would contain at least one.
    const serialised = JSON.stringify([
      buildLandingStructuredData({ locale: "en" }),
      buildLandingStructuredData({ locale: "es" }),
      buildPricingStructuredData({ locale: "en" }),
      buildPricingStructuredData({ locale: "es" }),
    ])

    const shapes: Array<[string, RegExp]> = [
      ["a uuid", /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i],
      ["a Stripe id", /\b(cus|sub|price|evt|cs)_[A-Za-z0-9]{8,}/],
    ]

    for (const [name, pattern] of shapes) {
      expect(pattern.test(serialised), `found ${name}`).toBe(false)
    }

    // Email needs its own handling rather than a blanket ban: an Organization
    // schema is *supposed* to publish a contact address, and
    // hello@energycurve.app is in there on purpose. What must not appear is
    // anyone else's — so the check is an allowlist, which is also what makes it
    // fail usefully if a customer address ever lands in a graph.
    const addresses = serialised.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []
    const ours = new Set(["hello@energycurve.app"])

    expect(addresses.filter((address) => !ours.has(address))).toEqual([])
  })

  it("is a pure function of the static copy", () => {
    // Built twice, byte-identical. Anything read from a request, a clock or a
    // database would differ between calls — which is the cheapest way to notice
    // that something dynamic crept in.
    expect(JSON.stringify(buildLandingStructuredData({ locale: "en" }))).toBe(
      JSON.stringify(buildLandingStructuredData({ locale: "en" }))
    )
  })
})
