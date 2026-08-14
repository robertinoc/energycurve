import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { VersionComparisonView } from "@/components/playlists/version-comparison"
import { diffVersions } from "@/lib/playlists/version-diff"
import type { VersionTrack } from "@/lib/playlists/versions"

function snapshot(ids: readonly string[], energies?: readonly number[]): VersionTrack[] {
  return ids.map((id, index) => ({
    trackId: id,
    position: index + 1,
    artist: `Artist ${id}`,
    name: `Track ${id}`,
    bpm: 124,
    energyScore: null,
    resolvedEnergy: energies ? energies[index] : null,
  }))
}

function render(
  before: VersionTrack[],
  after: VersionTrack[],
  scores: { before: number | null; after: number | null } = { before: 7.4, after: 6.9 },
  locale: "en" | "es" = "en"
) {
  const delta =
    scores.before === null || scores.after === null
      ? null
      : Math.round((scores.after - scores.before) * 10) / 10

  return renderToStaticMarkup(
    VersionComparisonView({
      comparison: {
        diff: diffVersions(before, after),
        scoreBefore: scores.before,
        scoreAfter: scores.after,
        delta,
      },
      locale,
    })
  )
}

describe("VersionComparisonView", () => {
  it("never renders an undefined copy key, in either locale", () => {
    for (const locale of ["en", "es"] as const) {
      expect(
        render(snapshot(["a", "b"], [5, 8]), snapshot(["b", "a"], [8, 5]), undefined, locale),
        locale
      ).not.toContain("undefined")
    }
  })

  it("shows the score change with an explicit sign", () => {
    expect(render(snapshot(["a"]), snapshot(["a"]), { before: 6.8, after: 7.9 })).toContain(
      "+1.1"
    )
    expect(render(snapshot(["a"]), snapshot(["a"]), { before: 7.4, after: 6.9 })).toContain(
      "-0.5"
    )
  })

  it("says so plainly when the orders are identical", () => {
    const html = render(snapshot(["a", "b"]), snapshot(["a", "b"]))

    expect(html).toContain("Identical")
    // And doesn't render empty group headings alongside it.
    expect(html).not.toContain("Never played")
    expect(html).not.toContain("Moved")
  })

  it("separates skipped tracks from unplanned ones by heading", () => {
    const html = render(snapshot(["a", "b", "c"]), snapshot(["a", "c", "z"]))

    expect(html).toContain("Never played")
    expect(html).toContain("Artist b")
    expect(html).toContain("Played unplanned")
    expect(html).toContain("Artist z")
  })

  it("draws both curves when both versions have energies", () => {
    const html = render(snapshot(["a", "b", "c"], [5, 7, 9]), snapshot(["c", "b", "a"], [9, 7, 5]))

    expect((html.match(/<polyline/g) ?? []).length).toBe(2)
  })

  it("explains the gap instead of drawing a fabricated curve", () => {
    // A version captured before per-track energy existed can only be compared by
    // score, and the reader has to be told that rather than shown a flat line.
    const html = render(snapshot(["a", "b"]), snapshot(["b", "a"]))

    expect(html).not.toContain("<polyline")
    expect(html).toContain("predates")
  })

  it("says there is nothing to compare when a side was never scored", () => {
    const html = render(snapshot(["a"]), snapshot(["a"]), { before: null, after: 7 })

    expect(html).toContain("never scored")
    expect(html).not.toContain("→ 7.0")
  })

  it("does not colour a zero delta as a win or a loss", () => {
    const html = render(snapshot(["a", "b"]), snapshot(["b", "a"]), {
      before: 7,
      after: 7,
    })

    expect(html).toContain("0.0")
    expect(html).not.toContain("text-ec-cyan tabular-nums")
  })
})
