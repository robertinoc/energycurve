import { describe, expect, it } from "vitest"

import { FRAME_SIZE } from "@/lib/audio/analysis-types"
import {
  MAX_HZ,
  MIN_HZ,
  chromaFromSpectrum,
  medianChroma,
  semitoneResolutionLimitHz,
} from "@/lib/audio/chroma"
import { detectKeyFromChroma } from "@/lib/audio/key-detection"

const RATE = 44_100
const BIN_WIDTH = RATE / FRAME_SIZE

/** A spectrum with energy only in the bins nearest the given frequencies. */
function spectrumAt(
  frequencies: { hz: number; magnitude?: number }[],
  bins = FRAME_SIZE / 2
): number[] {
  const spectrum = new Array<number>(bins).fill(0)

  for (const { hz, magnitude = 1 } of frequencies) {
    const bin = Math.round(hz / BIN_WIDTH)
    if (bin >= 0 && bin < bins) {
      spectrum[bin] += magnitude
    }
  }

  return spectrum
}

const PITCH_CLASS = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
} as const

describe("the band the chroma is limited to", () => {
  it("starts above the frequency where a semitone is narrower than one bin", () => {
    // The whole justification for band-limiting, as arithmetic rather than a
    // claim: below this frequency several semitones share a bin, so a bin's
    // magnitude cannot be attributed to one pitch class.
    const limit = semitoneResolutionLimitHz(RATE, FRAME_SIZE)

    expect(limit).toBeGreaterThan(350)
    expect(limit).toBeLessThan(375)
    expect(MIN_HZ).toBeGreaterThanOrEqual(limit - BIN_WIDTH)
  })

  it("scales the limit with the frame size, so the floor can be re-derived", () => {
    // Doubling the frame halves the bin width, which halves the limit. Kept as a
    // test so a future FRAME_SIZE change surfaces here instead of silently making
    // MIN_HZ wrong.
    expect(semitoneResolutionLimitHz(RATE, 4096)).toBeCloseTo(
      semitoneResolutionLimitHz(RATE, 2048) / 2,
      4
    )
  })

  it("ignores everything below the floor", () => {
    // A kick fundamental and a bass note: the loudest content in a dance track,
    // and the content whose pitch class a 2048-point FFT cannot determine.
    const chroma = chromaFromSpectrum(
      spectrumAt([
        { hz: 55, magnitude: 100 },
        { hz: 110, magnitude: 80 },
        { hz: 220, magnitude: 40 },
      ]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    expect(chroma.every((value) => value === 0)).toBe(true)
  })

  it("ignores everything above the ceiling", () => {
    const chroma = chromaFromSpectrum(
      spectrumAt([{ hz: MAX_HZ + 500, magnitude: 50 }]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    expect(chroma.every((value) => value === 0)).toBe(true)
  })

  it("honours an explicit band", () => {
    const spectrum = spectrumAt([{ hz: 440, magnitude: 10 }])

    expect(
      chromaFromSpectrum(spectrum, RATE, {
        frameSize: FRAME_SIZE,
        minHz: 500,
      })[PITCH_CLASS.A]
    ).toBe(0)

    expect(
      chromaFromSpectrum(spectrum, RATE, {
        frameSize: FRAME_SIZE,
        minHz: 400,
        maxHz: 500,
      })[PITCH_CLASS.A]
    ).toBeGreaterThan(0)
  })
})

describe("mapping frequencies to pitch classes", () => {
  it("puts A4 in the A bin", () => {
    const chroma = chromaFromSpectrum(
      spectrumAt([{ hz: 440, magnitude: 10 }]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    expect(chroma[PITCH_CLASS.A]).toBeGreaterThan(0)
    expect(chroma.filter((value) => value > 0)).toHaveLength(1)
  })

  it("folds octaves onto the same class", () => {
    // 440 and 880 are both A. Octave equivalence is the entire point of chroma.
    const chroma = chromaFromSpectrum(
      spectrumAt([
        { hz: 440, magnitude: 5 },
        { hz: 880, magnitude: 5 },
      ]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    expect(chroma.filter((value) => value > 0)).toHaveLength(1)
    expect(chroma[PITCH_CLASS.A]).toBeGreaterThan(0)
  })

  it("separates notes a semitone apart, inside the band", () => {
    // 880 (A5) and 932.3 (A#5). At this frequency a semitone spans ~52 Hz against
    // a ~21.5 Hz bin, so they resolve — which is what the band floor guarantees.
    const chroma = chromaFromSpectrum(
      spectrumAt([
        { hz: 880, magnitude: 5 },
        { hz: 932.33, magnitude: 5 },
      ]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    expect(chroma[PITCH_CLASS.A]).toBeGreaterThan(0)
    expect(chroma[PITCH_CLASS["A#"]]).toBeGreaterThan(0)
  })

  it("accumulates magnitude rather than counting bins", () => {
    const quiet = chromaFromSpectrum(
      spectrumAt([{ hz: 440, magnitude: 1 }]),
      RATE,
      { frameSize: FRAME_SIZE }
    )
    const loud = chromaFromSpectrum(
      spectrumAt([{ hz: 440, magnitude: 9 }]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    expect(loud[PITCH_CLASS.A]).toBeGreaterThan(quiet[PITCH_CLASS.A])
  })

  it("produces a profile a key detector can read", () => {
    // An A minor triad in the resolvable band: A4, C5, E5.
    const chroma = chromaFromSpectrum(
      spectrumAt([
        { hz: 440, magnitude: 10 },
        { hz: 523.25, magnitude: 8 },
        { hz: 659.26, magnitude: 8 },
      ]),
      RATE,
      { frameSize: FRAME_SIZE }
    )

    const detected = detectKeyFromChroma(chroma)
    expect(detected?.key).toBe("Am")
  })

  it("degrades on nonsense input instead of throwing", () => {
    expect(chromaFromSpectrum([], RATE, { frameSize: FRAME_SIZE })).toHaveLength(12)
    expect(
      chromaFromSpectrum(spectrumAt([{ hz: 440 }]), 0, { frameSize: FRAME_SIZE })
    ).toEqual(new Array(12).fill(0))
    expect(
      chromaFromSpectrum(spectrumAt([{ hz: 440 }]), RATE, { frameSize: 0 })
    ).toEqual(new Array(12).fill(0))
  })

  it("survives non-finite and negative magnitudes", () => {
    const spectrum = spectrumAt([{ hz: 440, magnitude: 4 }])
    spectrum[30] = Number.NaN
    spectrum[31] = -5

    const chroma = chromaFromSpectrum(spectrum, RATE, { frameSize: FRAME_SIZE })
    expect(chroma.every((value) => Number.isFinite(value))).toBe(true)
    expect(chroma[PITCH_CLASS.A]).toBeGreaterThan(0)
  })
})

describe("aggregating frames with a median", () => {
  it("discards a transient present in only a few frames", () => {
    // A sustained note in every frame, plus a percussive hit that lands on one
    // other class twice out of nine frames. The mean carries the hit into the
    // profile; the median does not.
    const sustained = () => {
      const frame = new Array<number>(12).fill(0)
      frame[PITCH_CLASS.A] = 5
      return frame
    }
    const withHit = () => {
      const frame = sustained()
      frame[PITCH_CLASS.F] = 40
      return frame
    }

    const frames = [
      sustained(), sustained(), withHit(), sustained(), sustained(),
      sustained(), withHit(), sustained(), sustained(),
    ]

    const median = medianChroma(frames)

    expect(median[PITCH_CLASS.A]).toBe(5)
    expect(median[PITCH_CLASS.F]).toBe(0)
  })

  it("keeps a class that is present in most frames", () => {
    const frames = Array.from({ length: 7 }, (_, index) => {
      const frame = new Array<number>(12).fill(0)
      frame[PITCH_CLASS.G] = 3
      // Absent from one frame only — still the majority.
      if (index !== 0) {
        frame[PITCH_CLASS.B] = 2
      }
      return frame
    })

    const median = medianChroma(frames)
    expect(median[PITCH_CLASS.G]).toBe(3)
    expect(median[PITCH_CLASS.B]).toBe(2)
  })

  it("skips silent frames rather than letting them flatten the profile", () => {
    const silent = new Array<number>(12).fill(0)
    const played = new Array<number>(12).fill(0)
    played[PITCH_CLASS.D] = 6

    // Five silent frames against three played ones: counting the silence would
    // put the median at 0 and erase the only content there is.
    const median = medianChroma([silent, silent, played, silent, played, silent, played, silent])
    expect(median[PITCH_CLASS.D]).toBe(6)
  })

  it("averages the two middle values on an even count", () => {
    const frame = (value: number) => {
      const bins = new Array<number>(12).fill(0)
      bins[PITCH_CLASS.C] = value
      return bins
    }

    expect(medianChroma([frame(2), frame(4)])[PITCH_CLASS.C]).toBe(3)
  })

  it("returns zeros for no usable frames", () => {
    expect(medianChroma([])).toEqual(new Array(12).fill(0))
    expect(medianChroma([new Array(12).fill(0)])).toEqual(new Array(12).fill(0))
    expect(medianChroma([[1, 2, 3]])).toEqual(new Array(12).fill(0))
  })
})
