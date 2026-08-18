import { describe, expect, it } from "vitest"

import { FRAME_SIZE, HOP_SIZE } from "@/lib/audio/analysis-types"
import {
  SAMPLE_WINDOW_COUNT,
  SAMPLE_WINDOW_SECONDS,
  countPlannedFrames,
  planSampleWindows,
} from "@/lib/audio/sample-windows"
import { onsetRateFromSegments } from "@/lib/audio/spectral-features"

const RATE = 44_100
const minutes = (value: number) => Math.round(value * 60 * RATE)

describe("sample window placement", () => {
  it("places one window at the centre of each equal division", () => {
    const total = minutes(6)
    const windows = planSampleWindows(total, RATE)

    expect(windows).toHaveLength(SAMPLE_WINDOW_COUNT)

    const division = total / SAMPLE_WINDOW_COUNT
    windows.forEach((window, index) => {
      const centre = (window.start + window.end) / 2
      const expected = division * (index + 0.5)
      // Within one hop: the start is aligned down to a hop boundary.
      expect(Math.abs(centre - expected)).toBeLessThan(HOP_SIZE)
    })
  })

  it("never touches either edge of the track", () => {
    const total = minutes(6)
    const windows = planSampleWindows(total, RATE)

    expect(windows[0].start).toBeGreaterThan(0)
    expect(windows.at(-1)!.end).toBeLessThan(total)
  })

  it("produces windows that do not overlap and stay in order", () => {
    const windows = planSampleWindows(minutes(6), RATE)

    for (let i = 1; i < windows.length; i += 1) {
      expect(windows[i].start).toBeGreaterThanOrEqual(windows[i - 1].end)
    }
  })

  it("cuts the work by about the window count on a long track", () => {
    // The whole point of the change, asserted as arithmetic: cost is linear in
    // frames (measured in docs/spike-browser-audio-analysis.md), so a 3× drop in
    // frames is a 3× drop in the framewise pass.
    const total = minutes(6)

    const whole = countPlannedFrames([{ start: 0, end: total }])
    const sampled = countPlannedFrames(planSampleWindows(total, RATE))

    const sampledSeconds = SAMPLE_WINDOW_COUNT * SAMPLE_WINDOW_SECONDS
    expect(sampled / whole).toBeCloseTo(sampledSeconds / 360, 2)
    expect(sampled).toBeLessThan(whole / 3)
  })

  it("analyses a short track whole rather than sampling it", () => {
    // Under windowCount × windowSeconds the windows would cover everything
    // anyway, so sampling would add bookkeeping and buy nothing.
    const total = Math.round(60 * RATE)
    expect(planSampleWindows(total, RATE)).toEqual([{ start: 0, end: total }])
  })

  it("treats the break-even duration as whole-track", () => {
    const total = SAMPLE_WINDOW_COUNT * SAMPLE_WINDOW_SECONDS * RATE
    expect(planSampleWindows(total, RATE)).toEqual([{ start: 0, end: total }])
  })

  it("samples just past the break-even duration", () => {
    const total = SAMPLE_WINDOW_COUNT * SAMPLE_WINDOW_SECONDS * RATE + RATE
    expect(planSampleWindows(total, RATE)).toHaveLength(SAMPLE_WINDOW_COUNT)
  })

  it("keeps every window long enough for flux to exist", () => {
    for (const window of planSampleWindows(minutes(6), RATE)) {
      expect(window.end - window.start).toBeGreaterThanOrEqual(
        FRAME_SIZE + HOP_SIZE
      )
    }
  })

  it("falls back to the whole track when a window couldn't hold two frames", () => {
    const total = minutes(6)
    const windows = planSampleWindows(total, RATE, { windowSeconds: 0.01 })
    expect(windows).toEqual([{ start: 0, end: total }])
  })

  it("returns nothing when there isn't audio for a single frame", () => {
    expect(planSampleWindows(FRAME_SIZE - 1, RATE)).toEqual([])
    expect(planSampleWindows(0, RATE)).toEqual([])
  })

  it("guards against nonsense input instead of emitting a bad plan", () => {
    expect(planSampleWindows(minutes(6), 0)).toEqual([])
    expect(planSampleWindows(Number.NaN, RATE)).toEqual([])
    expect(planSampleWindows(minutes(6), Number.NaN)).toEqual([])
  })

  it("respects an explicit window count", () => {
    const windows = planSampleWindows(minutes(10), RATE, { windowCount: 5 })
    expect(windows).toHaveLength(5)
  })

  it("aligns every start to a hop boundary so the frame grid is reproducible", () => {
    for (const window of planSampleWindows(minutes(7.3), RATE)) {
      expect(window.start % HOP_SIZE).toBe(0)
    }
  })

  it("stays inside the track for awkward durations", () => {
    for (const durationMinutes of [1.6, 2.7, 3.33, 5.9, 12.4]) {
      const total = minutes(durationMinutes)
      for (const window of planSampleWindows(total, RATE)) {
        expect(window.start).toBeGreaterThanOrEqual(0)
        expect(window.end).toBeLessThanOrEqual(total)
      }
    }
  })
})

describe("onset rate across sampled windows", () => {
  /** Flux envelope with a peak every `period` frames. */
  function pulses(length: number, period: number): number[] {
    return Array.from({ length }, (_, i) => (i % period === 0 ? 10 : 1))
  }

  it("matches the whole-track rate to within the cost of the extra seams", () => {
    // Same total frames either way, so the rate is comparable: onsets per second
    // of audio *examined*, not per second of track.
    const whole = onsetRateFromSegments([pulses(300, 10)], 10)
    const sampled = onsetRateFromSegments(
      [pulses(100, 10), pulses(100, 10), pulses(100, 10)],
      10
    )

    // They are not identical, and the gap is exactly explainable rather than
    // fuzzy: a peak needs a neighbour on each side, so every segment's first
    // frame is disqualified. One segment loses one candidate; three lose three.
    // With 30 s examined at one pulse per second that is 29/30 vs 27/30.
    const seconds = 300 / 10
    expect(whole - sampled).toBeCloseTo(2 / seconds, 5)

    // And in the terms that matter, the estimate is within a few percent.
    expect(sampled).toBeGreaterThan(whole * 0.9)
  })

  it("does not invent an onset at a window seam", () => {
    // Two windows whose junction is a huge jump — quiet window then loud one.
    // Concatenating the envelopes would read that jump as an onset; segmenting
    // means the boundary frames are never compared.
    const quiet = new Array<number>(50).fill(1)
    const loud = new Array<number>(50).fill(1)
    loud[0] = 500

    const segmented = onsetRateFromSegments([quiet, loud], 10)
    const concatenated = onsetRateFromSegments([[...quiet, ...loud]], 10)

    expect(segmented).toBe(0)
    expect(concatenated).toBeGreaterThan(0)
  })

  it("pools the threshold across windows so a quiet window stays quiet", () => {
    // One busy window and one flat one. A per-window threshold would rescale
    // itself inside the flat window and find peaks in noise; a pooled threshold
    // reports only the real ones.
    const busy = pulses(100, 10)
    const flat = Array.from({ length: 100 }, (_, i) => 1 + (i % 2) * 0.01)

    const pooled = onsetRateFromSegments([busy, flat], 10)
    const busyAlone = onsetRateFromSegments([busy], 10)

    // Same onsets, spread over twice the audio: about half the rate. If the flat
    // window had contributed phantom onsets this would sit near busyAlone.
    expect(pooled).toBeCloseTo(busyAlone / 2, 1)
  })

  it("degrades on empty and undersized input", () => {
    expect(onsetRateFromSegments([], 10)).toBe(0)
    expect(onsetRateFromSegments([[]], 10)).toBe(0)
    expect(onsetRateFromSegments([[1, 2]], 10)).toBe(0)
    expect(onsetRateFromSegments([pulses(100, 10)], 0)).toBe(0)
  })
})
