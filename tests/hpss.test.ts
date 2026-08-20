import { describe, expect, it } from "vitest"

import {
  FREQ_MEDIAN_BINS,
  HarmonicWindow,
  TIME_MEDIAN_FRAMES,
  frequencyMedian,
  harmonicComponent,
  timeMedian,
} from "@/lib/audio/hpss"

const BINS = 64

/** A sustained tone: the same few bins, every frame. Horizontal in a spectrogram. */
function harmonicFrame(level = 1): number[] {
  return Array.from({ length: BINS }, (_, bin) =>
    bin === 20 || bin === 40 ? level : 0
  )
}

/** A hit: every bin at once, one frame. Vertical in a spectrogram. */
function percussiveFrame(level = 1): number[] {
  return Array.from({ length: BINS }, () => level)
}

describe("frequencyMedian", () => {
  it("survives a broadband frame", () => {
    // A percussive hit is flat across frequency, so its frequency median is
    // itself — which is what makes it separable from a tone.
    expect(frequencyMedian(percussiveFrame(3))).toEqual(
      Array.from({ length: BINS }, () => 3)
    )
  })

  it("erases an isolated peak", () => {
    // A tone occupies a few bins out of many, so the median of its neighbourhood
    // is the silence around it.
    const result = frequencyMedian(harmonicFrame(5))

    expect(result[20]).toBe(0)
    expect(result.every((value) => value === 0)).toBe(true)
  })

  it("clamps at the edges instead of wrapping", () => {
    // Wrapping would let the loudest bass in the track vote on the brightest
    // cymbal. Clamping replicates the edge instead, so bin 0's window is
    // [bin0, bin0, bin1] and a spike there survives its own median — which reads
    // as percussive and gets suppressed downstream. For bin 0, which is DC, that
    // is the desired outcome.
    expect(frequencyMedian([9, 0, 0, 0, 0], 3)[0]).toBe(9)
    // And the spike does not leak sideways into its neighbour.
    expect(frequencyMedian([9, 0, 0, 0, 0], 3)[2]).toBe(0)
  })
})

describe("timeMedian", () => {
  it("survives a tone held across the window", () => {
    const frames = Array.from({ length: 5 }, () => harmonicFrame(4))
    const result = timeMedian(frames)

    expect(result[20]).toBe(4)
    expect(result[21]).toBe(0)
  })

  it("erases a hit that happens once", () => {
    // Two frames of silence either side of one hit: the median is silence, which
    // is the whole reason a median beats a mean here.
    const frames = [
      Array.from({ length: BINS }, () => 0),
      Array.from({ length: BINS }, () => 0),
      percussiveFrame(10),
      Array.from({ length: BINS }, () => 0),
      Array.from({ length: BINS }, () => 0),
    ]

    expect(timeMedian(frames).every((value) => value === 0)).toBe(true)
  })

  it("returns nothing for no frames", () => {
    expect(timeMedian([])).toEqual([])
  })
})

describe("harmonicComponent", () => {
  /**
   * A tone held through the window, with a hit landing on the centre frame.
   *
   * `hit` has to be loud relative to `tone` or the fixture doesn't represent
   * anything: a broadband floor only a little above the tone reads as the noise
   * floor to the frequency median, the two estimates come out equal, and the mask
   * sits at 0.5 — which tests nothing.
   */
  const mixed = (tone = 1, hit = 5) => {
    const frames = Array.from({ length: TIME_MEDIAN_FRAMES }, () =>
      harmonicFrame(tone)
    )
    const centre = Math.floor(TIME_MEDIAN_FRAMES / 2)

    frames[centre] = frames[centre].map((value) => value + hit)

    return frames
  }

  it("keeps the tone and drops the hit", () => {
    // The whole point. On the frame where the hit lands, a bin that was sustained
    // keeps some of its magnitude and a bin that only ever held the hit keeps
    // none — which is the separation, stated relatively.
    //
    // Not "the tone comes through untouched": on a frame overwhelmingly occupied
    // by a hit, little harmonic content is recoverable, and the method recovers
    // the chord from the *other* frames. Asserting otherwise would be asserting
    // something HPSS doesn't claim.
    const result = harmonicComponent(mixed())

    expect(result[20]).toBeGreaterThan(0)
    expect(result[7]).toBe(0)
    expect(result[0]).toBe(0)
  })

  it("passes a purely tonal frame through nearly untouched", () => {
    // Nothing percussive to remove, so the mask should be ~1 where the tone is.
    const frames = Array.from({ length: TIME_MEDIAN_FRAMES }, () =>
      harmonicFrame(2)
    )

    expect(harmonicComponent(frames)[20]).toBeCloseTo(2, 5)
  })

  it("suppresses a purely percussive frame", () => {
    // A hit on every frame is, by this method's definition, no longer percussive
    // — a continuous broadband wash is horizontal too. What must not happen is it
    // coming through *amplified*.
    const frames = Array.from({ length: TIME_MEDIAN_FRAMES }, () =>
      percussiveFrame(1)
    )
    const result = harmonicComponent(frames)

    expect(Math.max(...result)).toBeLessThanOrEqual(1)
  })

  it("returns zero where there is nothing, instead of dividing by zero", () => {
    const silence = Array.from({ length: TIME_MEDIAN_FRAMES }, () =>
      Array.from({ length: BINS }, () => 0)
    )

    expect(harmonicComponent(silence).every((v) => v === 0)).toBe(true)
    expect(harmonicComponent(silence).some(Number.isNaN)).toBe(false)
  })

  it("preserves the input shape and never amplifies", () => {
    // The output goes straight into the existing chroma path, which assumes
    // magnitudes of the same length and order — and a mask is a fraction, so no
    // bin may come out louder than it went in.
    const frames = mixed()
    const centre = frames[Math.floor(frames.length / 2)]
    const result = harmonicComponent(frames)

    expect(result).toHaveLength(BINS)
    result.forEach((value, bin) => {
      expect(value).toBeLessThanOrEqual(centre[bin] + 1e-9)
    })
  })

  it("makes the mask harder as the exponent rises", () => {
    // MASK_POWER pushes each bin toward whichever estimate is larger, so the
    // direction of the effect depends on which one wins. Tested where the
    // harmonic estimate wins — a strong sustained tone under a light hit — which
    // is the case the exponent exists to sharpen.
    const frames = mixed(5, 1)
    const linear = harmonicComponent(frames, { maskPower: 1 })
    const wiener = harmonicComponent(frames, { maskPower: 2 })

    expect(wiener[20]).toBeGreaterThan(linear[20])
  })

  it("suppresses harder, not less, where the hit wins", () => {
    // The other direction of the same knob, so the asymmetry is pinned rather
    // than assumed: with a loud hit over a quiet tone, a higher exponent removes
    // more.
    const frames = mixed(1, 5)

    expect(harmonicComponent(frames, { maskPower: 2 })[20]).toBeLessThan(
      harmonicComponent(frames, { maskPower: 1 })[20]
    )
  })

  it("returns nothing for no frames", () => {
    expect(harmonicComponent([])).toEqual([])
  })
})

describe("HarmonicWindow", () => {
  it("says nothing until the window is full", () => {
    // An early estimate would separate the first frames against a window that is
    // mostly themselves, giving a ~0.5 mask everywhere and passing the percussion
    // straight through — the one output that looks like it worked and didn't.
    const window = new HarmonicWindow(5)

    expect(window.push(harmonicFrame())).toBeNull()
    expect(window.push(harmonicFrame())).toBeNull()
    expect(window.push(harmonicFrame())).toBeNull()
    expect(window.push(harmonicFrame())).toBeNull()
    expect(window.push(harmonicFrame())).not.toBeNull()
  })

  it("keeps producing as it rolls", () => {
    const window = new HarmonicWindow(3)

    window.push(harmonicFrame())
    window.push(harmonicFrame())

    for (let i = 0; i < 10; i += 1) {
      expect(window.push(harmonicFrame(2))).not.toBeNull()
    }
  })

  it("holds only its window, not the whole track", () => {
    // The affordability constraint: a three-minute track is ~7,700 frames of
    // 1,024 floats, and buffering it to take a 17-frame median would be 31 MB in
    // a browser worker.
    const window = new HarmonicWindow(3)

    for (let i = 0; i < 500; i += 1) {
      window.push(harmonicFrame())
    }

    // @ts-expect-error — reaching into the private field is the only way to
    // assert the bound, and the bound is the point.
    expect(window.frames).toHaveLength(3)
  })

  it("uses odd window sizes so there is a true centre", () => {
    expect(TIME_MEDIAN_FRAMES % 2).toBe(1)
    expect(FREQ_MEDIAN_BINS % 2).toBe(1)
  })
})
