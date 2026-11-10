import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

/**
 * Step 1.2 of docs/conversion-plan.md: a set that was never analysed and a set
 * that was do not offer the same thing with the same weight.
 *
 * The rules are in tests/analyze-prompt.test.ts. This file is the markup that
 * follows from them — what is on the page, in which order, and what the import
 * summary ends in.
 */

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }))

const { AnalyzeLink } = await import("@/components/playlists/analyze-link")
const { AnalyzeNextStep } = await import("@/components/playlists/analyze-next-step")
const { ImportSummary } = await import("@/components/playlists/import-summary")
const { PlaylistHeaderBar } = await import("@/components/playlists/playlist-header-bar")
const { DASHBOARD_COPY } = await import("@/lib/content/dashboard-copy")
const { supportedLocales } = await import("@/lib/content/site-copy")
const { importCoverage } = await import("@/lib/playlists/import-coverage")

const COPY = DASHBOARD_COPY.analyzeNext
const ANALYSIS_HREF = 'href="/dashboard/playlists/playlist_1/analysis"'

/** Copy as React writes it into markup. */
const inMarkup = (text: string) => text.replace(/'/g, "&#x27;")

function headerBar(emphasis: "lead" | "peer") {
  return renderToStaticMarkup(
    createElement(PlaylistHeaderBar, {
      emphasis,
      hint: COPY.hint.en,
      moreLabel: COPY.moreActions.en,
      back: createElement("a", { href: "/dashboard/playlists" }, "BACK"),
      analyze: createElement(
        AnalyzeLink,
        {
          playlistId: "playlist_1",
          placement: "header",
          firstAnalysis: emphasis === "lead",
          locale: "en",
        } as Parameters<typeof AnalyzeLink>[0],
        "ANALYZE"
      ),
      secondary: createElement("a", { href: "/export" }, "EXPORT"),
    })
  )
}

describe("the action bar of a playlist, in its two states", () => {
  it("never analysed: the analysis comes first and says what it gives", () => {
    const html = headerBar("lead")

    expect(html).toContain('data-emphasis="lead"')
    expect(html.indexOf("ANALYZE")).toBeLessThan(html.indexOf("EXPORT"))
    expect(html).toContain(COPY.hint.en)
  })

  it("never analysed: the other actions step back into a named group, still there", () => {
    const html = headerBar("lead")
    const group = html.slice(html.indexOf('role="group"'))

    expect(html).toContain(`aria-label="${COPY.moreActions.en}"`)
    expect(group).toContain("EXPORT")
    expect(group).not.toContain("ANALYZE")
  })

  it("already analysed: one row, the analysis last, nothing explained", () => {
    const html = headerBar("peer")

    expect(html).toContain('data-emphasis="peer"')
    expect(html.indexOf("EXPORT")).toBeLessThan(html.indexOf("ANALYZE"))
    expect(html).not.toContain(COPY.hint.en)
    expect(html).not.toContain('role="group"')
  })

  it("both states lead to the same analysis", () => {
    expect(headerBar("lead")).toContain(ANALYSIS_HREF)
    expect(headerBar("peer")).toContain(ANALYSIS_HREF)
  })

  it("both states wrap, so seven controls cannot push a phone sideways", () => {
    const peer = headerBar("peer")
    const lead = headerBar("lead")

    // Every row that holds more than one control.
    expect(peer.match(/flex-wrap/g)).toHaveLength(2)
    expect(lead.slice(lead.indexOf('role="group"'))).toContain("flex-wrap")
  })
})

describe("the note that says what the analysis gives", () => {
  for (const locale of supportedLocales) {
    it(`says what will happen, not only "analyse" (${locale})`, () => {
      const html = renderToStaticMarkup(
        createElement(AnalyzeNextStep, { playlistId: "playlist_1", locale })
      )

      expect(html).toContain(inMarkup(COPY.title[locale]))
      expect(html).toContain(inMarkup(COPY.body[locale]))
      expect(html).toContain(ANALYSIS_HREF)
      expect(html).toContain(DASHBOARD_COPY.playlistDetail.analyzeSet[locale])
    })
  }

  it("names the curve, the jumps and what to move, in both languages", () => {
    expect(COPY.body.en).toMatch(/curve/)
    expect(COPY.body.en).toMatch(/jumps/)
    expect(COPY.body.en).toMatch(/move/)
    expect(COPY.body.es).toMatch(/curva/)
    expect(COPY.body.es).toMatch(/saltos/)
    expect(COPY.body.es).toMatch(/mover/)
  })

  it("says it is free, because it is — this is not a sales wall", () => {
    expect(COPY.body.en).toMatch(/free/i)
    expect(COPY.body.es).toMatch(/gratis/i)

    for (const locale of supportedLocales) {
      const everything = Object.values(COPY)
        .map((entry) => entry[locale])
        .join(" ")

      expect(everything).not.toMatch(/\bPRO\b|upgrade|pricing|plan\b/i)
    }
  })

  it("keeps the house vocabulary in Spanish", () => {
    const spanish = Object.values(COPY)
      .map((entry) => entry.es)
      .join(" ")

    expect(spanish).toMatch(/temas/)
    expect(spanish).not.toMatch(/\btracks?\b|\bkey\b|biblioteca/i)
    // Voseo: "mirá", never "mira" or "mire".
    expect(COPY.title.es).toMatch(/^Mirá /)
  })

  it("is in the page, not over it", () => {
    const html = renderToStaticMarkup(
      createElement(AnalyzeNextStep, { playlistId: "playlist_1", locale: "en" })
    )

    expect(html).not.toMatch(/role="dialog"|aria-modal|fixed |\bfixed"|z-\d/)
  })

  it("tells the two places apart, so the clicks can be", () => {
    const standalone = renderToStaticMarkup(
      createElement(AnalyzeNextStep, { playlistId: "playlist_1", locale: "en" })
    )
    const embedded = renderToStaticMarkup(
      createElement(AnalyzeNextStep, { playlistId: "playlist_1", locale: "en", embedded: true })
    )

    expect(standalone).toContain('data-analyze-placement="next_step"')
    expect(embedded).toContain('data-analyze-placement="import_summary"')
  })
})

describe("what the import summary ends in", () => {
  /** An import with no energy in its tags: the case that shows the docs link. */
  const coverage = importCoverage(
    Array.from({ length: 8 }, () => ({
      bpm: 124,
      musicalKey: "8A",
      genre: "House",
      energyScore: null,
      durationSeconds: 300,
    }))
  )

  function summary(nextStep?: ReactNode) {
    return renderToStaticMarkup(
      createElement(ImportSummary, {
        coverage,
        importSource: "rekordbox_xml",
        locale: "en",
        nextStep,
      })
    )
  }

  const nextStep = createElement(AnalyzeNextStep, {
    playlistId: "playlist_1",
    locale: "en",
    embedded: true,
  })

  it("never analysed: it ends in the analysis, after the energy-tags link", () => {
    const html = summary(nextStep)
    const docs = html.indexOf('href="/energy-tags"')
    const analysis = html.indexOf(ANALYSIS_HREF)

    expect(docs).toBeGreaterThan(-1)
    expect(analysis).toBeGreaterThan(docs)
    // The last thing to click in the card.
    expect(html.lastIndexOf("<a ")).toBe(html.lastIndexOf("<a ", analysis))
    expect(html).toContain(inMarkup(COPY.body.en))
  })

  it("the documentation link is no longer the only thing to click", () => {
    expect(summary(nextStep).match(/<a /g)).toHaveLength(2)
    expect(summary().match(/<a /g)).toHaveLength(1)
  })

  it("already analysed: the summary is what it was, with no step added", () => {
    const html = summary()

    expect(html).toContain('href="/energy-tags"')
    expect(html).not.toContain(ANALYSIS_HREF)
    expect(html).not.toContain(inMarkup(COPY.title.en))
  })
})
