import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SetSheet, type SetSheetProps } from "@/components/playlists/set-sheet"
import { clockAt, resolveSlot } from "@/lib/engine/slot"

/**
 * Rendered to static markup rather than asserted on props: what matters about a
 * printable sheet is what actually reaches the page. This also catches a missing
 * copy key, which the type system happily allows to render as "undefined".
 */
function render(overrides: Partial<SetSheetProps> = {}) {
  const slot = overrides.slot ?? null
  const rows =
    overrides.rows ??
    [
      { artist: "Nu Zau", name: "Cuando", bpm: 122, camelot: "8A", energy: 6 },
      { artist: "Sam Shure", name: "Ravel", bpm: 124, camelot: "8B", energy: 8.5 },
      { artist: "Trikk", name: "Ondas", bpm: 123, camelot: "9B", energy: 7 },
    ].map((track, index, all) => ({
      ...track,
      position: index + 1,
      clockMinutes: slot ? clockAt(index, all.length, slot) : null,
    }))

  return renderToStaticMarkup(
    SetSheet({
      playlistName: "Friday warm-up",
      description: null,
      genre: "house",
      context: "opening",
      targetShape: null,
      slot,
      rows,
      peakPosition: 2,
      estimatedMinutes: 90,
      locale: "en",
      ...overrides,
    })
  )
}

describe("SetSheet", () => {
  it("prints every track with its BPM, key and energy", () => {
    const html = render()

    expect(html).toContain("Friday warm-up")
    expect(html).toContain("Nu Zau")
    expect(html).toContain("Cuando")
    expect(html).toContain("122")
    expect(html).toContain("8A")
  })

  it("never renders an undefined copy key", () => {
    // The failure this exists for: a missing entry in DASHBOARD_COPY.setSheet
    // type-checks and then ships the literal word "undefined" onto paper.
    for (const locale of ["en", "es"] as const) {
      expect(render({ locale }), locale).not.toContain("undefined")
    }
  })

  it("adds the clock column only when a slot was declared", () => {
    const withSlot = render({ slot: resolveSlot(60, 180) })
    const withoutSlot = render()

    expect(withSlot).toContain("01:00")
    expect(withSlot).toContain(">Time<")
    expect(withoutSlot).not.toContain(">Time<")
  })

  it("shows the estimated runtime only when there is no slot to state instead", () => {
    // With a real slot the estimate is noise — worse, it can contradict it.
    expect(render()).toContain("1h30")
    expect(render({ slot: resolveSlot(60, 180) })).not.toContain("1h30")
  })

  it("marks the peak track", () => {
    expect(render({ peakPosition: 2 })).toContain(">Peak<")
  })

  it("draws the curve, with the peak on it", () => {
    const html = render()

    expect(html).toContain("<polyline")
    expect(html).toContain("<circle")
  })

  it("omits the curve for a single-track set instead of dividing by zero", () => {
    const html = render({
      rows: [
        {
          position: 1,
          artist: "Solo",
          name: "One",
          bpm: 120,
          camelot: null,
          energy: 5,
          clockMinutes: null,
        },
      ],
      peakPosition: 1,
    })

    expect(html).not.toContain("<polyline")
    expect(html).not.toContain("NaN")
  })

  it("prints an em dash for missing BPM and key rather than a blank cell", () => {
    const html = render({
      rows: [
        {
          position: 1,
          artist: "Unknown",
          name: "Untagged",
          bpm: null,
          camelot: null,
          energy: 5,
          clockMinutes: null,
        },
        {
          position: 2,
          artist: "Second",
          name: "Track",
          bpm: 120,
          camelot: "5A",
          energy: 6,
          clockMinutes: null,
        },
      ],
      peakPosition: 2,
    })

    expect(html).toContain("—")
  })

  it("includes the declared shape and the notes in the header and body", () => {
    const html = render({
      targetShape: "after_hours",
      description: "Hand over to Ana at 3.",
    })

    expect(html).toContain("After-hours")
    expect(html).toContain("Hand over to Ana at 3.")
  })

  it("keeps the sheet on a white background so it survives a printer", () => {
    // A dark sheet is unreadable printed and empties the cartridge.
    expect(render()).toContain("bg-white")
  })
})
