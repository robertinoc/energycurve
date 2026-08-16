import { describe, expect, it } from "vitest"

import { computeFirstRun } from "@/lib/product/first-run"

/**
 * Mirrors the real caller: the dashboard passes one history per loaded
 * playlist, so the default here is one empty history each rather than none —
 * fewer histories than playlists means "the list was truncated", which is a
 * different situation with its own tests below.
 */
const state = (
  playlistCount: number,
  scoreHistories: number[][] = Array.from({ length: playlistCount }, () => [])
) => computeFirstRun({ playlistCount, scoreHistories })

describe("computeFirstRun", () => {
  it("points a brand-new account at the first step", () => {
    const result = state(0)

    expect(result.visible).toBe(true)
    expect(result.currentIndex).toBe(0)
    expect(result.steps.every((step) => !step.done)).toBe(true)
  })

  it("ticks the import step as soon as a playlist exists", () => {
    const result = state(1)

    expect(result.steps[0].done).toBe(true)
    expect(result.currentIndex).toBe(1)
  })

  it("ticks analyse on the first recorded analysis, from any playlist", () => {
    // The history that matters can belong to any set, not just the newest.
    const result = state(3, [[], [], [6.8]])

    expect(result.steps[1].done).toBe(true)
    expect(result.currentIndex).toBe(2)
  })

  it("only ticks improve on a second analysis of the same set", () => {
    // One analysis is looking; two is acting on what we said. That second run
    // is the moment the product paid off, which is why it's the last step.
    expect(state(1, [[6.8]]).steps[2].done).toBe(false)
    expect(state(1, [[6.8, 7.4]]).steps[2].done).toBe(true)
  })

  it("disappears once all three are done", () => {
    const result = state(2, [[6.8, 7.4]])

    expect(result.visible).toBe(false)
    expect(result.currentIndex).toBe(-1)
  })

  it("comes back if the work behind it goes away", () => {
    // The reason this is derived rather than stored: a dismissal flag would keep
    // insisting they imported a playlist after they deleted their only one.
    expect(state(0, []).visible).toBe(true)
  })

  it("never marks a later step done while an earlier one isn't", () => {
    // Data can arrive in odd shapes — an imported analysis, a deleted playlist.
    // The pointer must still land on the first thing actually missing.
    const result = state(0, [[6.8, 7.4]])

    expect(result.currentIndex).toBe(0)
    expect(result.visible).toBe(true)
  })
})

describe("computeFirstRun — incomplete samples", () => {
  it("stands down when there are more playlists than histories loaded", () => {
    // The dashboard loads only the newest few. With more sets than that, an
    // empty history proves nothing — and nagging someone with twenty playlists
    // to "analyse your first set" is worse than showing nothing at all.
    const result = computeFirstRun({
      playlistCount: 20,
      scoreHistories: [[], [], [], [], []],
    })

    expect(result.visible).toBe(false)
  })

  it("still trusts a complete sample", () => {
    // Five playlists, five histories: nothing is hidden, so an empty one really
    // does mean they never analysed.
    const result = computeFirstRun({
      playlistCount: 5,
      scoreHistories: [[], [], [], [], []],
    })

    expect(result.visible).toBe(true)
    expect(result.currentIndex).toBe(1)
  })
})
