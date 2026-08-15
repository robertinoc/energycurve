import { describe, expect, it } from "vitest"

import { detectKeyFromChroma } from "@/lib/audio/key-detection"
import {
  averageChroma,
  mean,
  onsetRate,
  percentile,
  spectralEntropy,
  spectralFlux,
  downmixToMono,
} from "@/lib/audio/spectral-features"
import { toCamelot } from "@/lib/music/camelot"

/** Builds a chroma vector where the given pitch classes carry the energy. */
function chromaFor(active: number[], strength = 1): number[] {
  const chroma = new Array<number>(12).fill(0.05)
  for (const pitchClass of active) {
    chroma[pitchClass] = strength
  }
  return chroma
}

// Index 0 = C. Triads as pitch-class sets.
const C_MAJOR = [0, 4, 7]
const A_MINOR = [9, 0, 4]
const F_SHARP_MAJOR = [6, 10, 1]

describe("key detection (Krumhansl-Schmuckler)", () => {
  it("finds the tonic of a clear major triad", () => {
    const result = detectKeyFromChroma(chromaFor(C_MAJOR))

    expect(result).not.toBeNull()
    expect(result!.key).toBe("C")
    expect(result!.scale).toBe("major")
    expect(result!.confidence).toBeGreaterThan(0.5)
  })

  it("distinguishes a minor triad from its relative major", () => {
    const result = detectKeyFromChroma(chromaFor(A_MINOR))

    expect(result).not.toBeNull()
    expect(result!.scale).toBe("minor")
    expect(result!.key).toBe("Am")
  })

  it("handles keys with accidentals", () => {
    const result = detectKeyFromChroma(chromaFor(F_SHARP_MAJOR))

    expect(result).not.toBeNull()
    expect(result!.key).toBe("F#")
  })

  it("emits keys that the Camelot mapper already understands", () => {
    // The detector feeds the existing harmonic engine, so every key it can
    // produce has to survive toCamelot() — otherwise harmony scoring silently
    // sees null for audio-derived keys.
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      for (const set of [
        [pitchClass, (pitchClass + 4) % 12, (pitchClass + 7) % 12],
        [pitchClass, (pitchClass + 3) % 12, (pitchClass + 7) % 12],
      ]) {
        const result = detectKeyFromChroma(chromaFor(set))
        expect(result).not.toBeNull()
        expect(toCamelot(result!.key)).not.toBeNull()
      }
    }
  })

  it("reports a small margin when the profile is ambiguous", () => {
    const clear = detectKeyFromChroma(chromaFor(C_MAJOR))!
    // A flat-ish profile with one weak accent: every key fits about as badly.
    const ambiguous = detectKeyFromChroma(chromaFor([0], 0.06))!

    expect(ambiguous.margin).toBeLessThan(clear.margin)
  })

  it("returns null on unusable input", () => {
    expect(detectKeyFromChroma([])).toBeNull()
    expect(detectKeyFromChroma(new Array(11).fill(1))).toBeNull()
    expect(detectKeyFromChroma(new Array(12).fill(0))).toBeNull()
  })

  it("survives NaN bins instead of returning NaN confidence", () => {
    const chroma = chromaFor(C_MAJOR)
    chroma[3] = Number.NaN

    const result = detectKeyFromChroma(chroma)
    expect(result).not.toBeNull()
    expect(Number.isFinite(result!.confidence)).toBe(true)
  })
})

describe("spectral entropy", () => {
  it("is ~0 for a single-bin (pure tone) spectrum", () => {
    const spectrum = new Array<number>(64).fill(0)
    spectrum[10] = 1

    expect(spectralEntropy(spectrum)).toBeCloseTo(0, 5)
  })

  it("is 1 for a perfectly flat (white noise) spectrum", () => {
    expect(spectralEntropy(new Array<number>(64).fill(0.25))).toBeCloseTo(1, 5)
  })

  it("orders a broad spectrum above a narrow one", () => {
    const narrow = new Array<number>(64).fill(0)
    narrow[0] = 1
    narrow[1] = 0.9

    const broad = new Array<number>(64).fill(0)
    for (let i = 0; i < 32; i += 1) {
      broad[i] = 1
    }

    expect(spectralEntropy(broad)).toBeGreaterThan(spectralEntropy(narrow))
  })

  it("degrades to 0 on empty or silent input", () => {
    expect(spectralEntropy([])).toBe(0)
    expect(spectralEntropy([1])).toBe(0)
    expect(spectralEntropy(new Array<number>(32).fill(0))).toBe(0)
  })
})

describe("onset rate", () => {
  it("counts regular peaks at roughly the expected rate", () => {
    // 100 frames at 10 fps = 10 seconds, with a peak every 10 frames.
    const flux = Array.from({ length: 100 }, (_, i) => (i % 10 === 5 ? 10 : 1))

    // 10 peaks over 10 seconds.
    expect(onsetRate(flux, 10)).toBeCloseTo(1, 1)
  })

  it("reports zero for a flat envelope", () => {
    expect(onsetRate(new Array<number>(50).fill(3), 10)).toBe(0)
  })

  it("guards against degenerate input", () => {
    expect(onsetRate([], 10)).toBe(0)
    expect(onsetRate([1, 2, 3], 0)).toBe(0)
  })
})

describe("frame aggregation", () => {
  it("averages chroma while skipping silent frames", () => {
    const loud = chromaFor([0])
    const silent = new Array<number>(12).fill(0)

    // Silence must not drag the profile toward zero — averaging it in would
    // flatten exactly the contrast the key detector reads.
    const withSilence = averageChroma([loud, silent, silent, loud])
    const withoutSilence = averageChroma([loud, loud])

    expect(withSilence).toEqual(withoutSilence)
  })

  it("returns zeros when every frame is silent", () => {
    expect(averageChroma([new Array<number>(12).fill(0)])).toEqual(
      new Array<number>(12).fill(0)
    )
  })

  it("ignores frames of the wrong width", () => {
    const loud = chromaFor([2])
    expect(averageChroma([loud, new Array<number>(7).fill(9)])).toEqual(loud)
  })

  it("computes mean and percentile", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(mean([])).toBe(0)
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10)
    expect(percentile([5], 50)).toBe(5)
    expect(percentile([], 95)).toBe(0)
  })
})

describe("spectral flux", () => {
  // Meyda 5.6.3's own extractor throws under ES modules (undeclared `x`) and
  // reads negative indices, so this replaces it. These tests pin the definition.
  it("is zero between identical spectra", () => {
    const spectrum = [1, 2, 3, 4]
    expect(spectralFlux(spectrum, spectrum)).toBe(0)
  })

  it("counts only increases (half-wave rectified)", () => {
    // +2 on one bin, -3 on another: only the rise counts.
    expect(spectralFlux([3, 1], [1, 4])).toBeCloseTo(1, 10)
  })

  it("grows with the size of the jump", () => {
    const quiet = spectralFlux([1.1, 1.1], [1, 1])
    const loud = spectralFlux([5, 5], [1, 1])
    expect(loud).toBeGreaterThan(quiet)
  })

  it("normalises by bin count so frame size doesn't change the scale", () => {
    const short = spectralFlux([2, 2], [1, 1])
    const long = spectralFlux([2, 2, 2, 2], [1, 1, 1, 1])
    expect(short).toBeCloseTo(long, 10)
  })

  it("never returns NaN on ragged or non-finite input", () => {
    expect(spectralFlux([], [])).toBe(0)
    expect(spectralFlux([1, 2, 3], [1])).toBeCloseTo(0, 10)
    expect(Number.isFinite(spectralFlux([Number.NaN, 5], [1, 1]))).toBe(true)
  })
})

describe("downmixToMono", () => {
  it("averages two channels", () => {
    const left = new Float32Array([1, 0, 0.5])
    const right = new Float32Array([0, 1, 0.5])

    expect(Array.from(downmixToMono([left, right]))).toEqual([0.5, 0.5, 0.5])
  })

  it("returns a single channel untouched", () => {
    const only = new Float32Array([0.25, 0.5])

    expect(downmixToMono([only])).toBe(only)
    expect(Array.from(only)).toEqual([0.25, 0.5])
  })

  it("averages more than two channels", () => {
    const result = downmixToMono([
      new Float32Array([3]),
      new Float32Array([0]),
      new Float32Array([0]),
    ])

    expect(result[0]).toBeCloseTo(1)
  })

  it("mutates the first channel, which is the documented contract", () => {
    // The worker owns these arrays by transfer, so writing through them is
    // deliberate — allocating a second 50 MB buffer to avoid a mutation nobody
    // can observe would cost more than the analysis. Pinned so a future
    // "cleanup" that starts copying is a visible decision, not a silent one.
    const left = new Float32Array([1, 1])
    const right = new Float32Array([0, 0])

    const result = downmixToMono([left, right])

    expect(result).toBe(left)
    expect(Array.from(left)).toEqual([0.5, 0.5])
  })

  it("survives a short channel instead of reading past its end", () => {
    // Every channel of an AudioBuffer is the same length, but a caller isn't
    // the spec, and NaN here would poison every downstream feature.
    const result = downmixToMono([
      new Float32Array([1, 1, 1]),
      new Float32Array([1]),
    ])

    expect(Array.from(result).every(Number.isFinite)).toBe(true)
  })

  it("handles no channels at all", () => {
    expect(downmixToMono([])).toHaveLength(0)
  })
})
