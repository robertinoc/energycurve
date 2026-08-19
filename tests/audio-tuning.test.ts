import { describe, expect, it } from "vitest"

import { FRAME_SIZE } from "@/lib/audio/analysis-types"
import { MAX_HZ, MIN_HZ } from "@/lib/audio/chroma"
import { detectKeyFromChroma } from "@/lib/audio/key-detection"
import {
  BINS_PER_SEMITONE,
  FINE_BINS,
  estimateTuningOffset,
  fineChromaFromSpectrum,
  foldFineChroma,
  sumFineChroma,
} from "@/lib/audio/tuning"

const RATE = 44_100
const BIN_WIDTH = RATE / FRAME_SIZE

const PITCH_CLASS = { C: 0, "C#": 1, E: 4, F: 5, G: 7, A: 9, "A#": 10, B: 11 } as const

/**
 * A fine profile with all its energy `offsetSemitones` away from the given pitch
 * classes — i.e. what a track detuned by that much would produce.
 */
function fineAt(semitones: number[], offsetSemitones = 0, magnitude = 10) {
  const fine = new Array<number>(FINE_BINS).fill(0)

  for (const semitone of semitones) {
    const index =
      Math.round((semitone + offsetSemitones) * BINS_PER_SEMITONE) % FINE_BINS
    fine[((index % FINE_BINS) + FINE_BINS) % FINE_BINS] += magnitude
  }

  return fine
}

describe("estimating how far a track sits from A=440", () => {
  it("reports no offset for content on the semitone grid", () => {
    expect(estimateTuningOffset(fineAt([0, 4, 7]))).toBeCloseTo(0, 6)
  })

  it("recovers a sharp offset", () => {
    // Every note 30 cents sharp.
    expect(estimateTuningOffset(fineAt([0, 4, 7], 0.3))).toBeCloseTo(0.3, 6)
  })

  it("recovers a flat offset", () => {
    expect(estimateTuningOffset(fineAt([0, 4, 7], -0.2))).toBeCloseTo(-0.2, 6)
  })

  it("uses a circular mean, so offsets near the half-semitone don't cancel", () => {
    // The case an arithmetic mean gets exactly wrong. Two notes measured at -0.4
    // and +0.4 semitones are 20 cents apart across the wrap, not 80 apart: the
    // true centre is the half-semitone, not zero. An arithmetic mean would report
    // 0.0 — perfectly in tune — for a track that is half a semitone off.
    const fine = new Array<number>(FINE_BINS).fill(0)
    fine[Math.round(-0.4 * BINS_PER_SEMITONE + FINE_BINS) % FINE_BINS] = 10
    fine[Math.round(12.4 * BINS_PER_SEMITONE) % FINE_BINS] = 10

    const offset = estimateTuningOffset(fine)

    expect(Math.abs(offset)).toBeGreaterThan(0.4)
    expect(Math.abs(offset)).toBeLessThanOrEqual(0.5)
  })

  it("weights loud partials more than quiet ones", () => {
    const fine = new Array<number>(FINE_BINS).fill(0)
    // A loud in-tune note and a quiet badly-tuned one: the estimate should sit
    // much nearer the loud one.
    fine[0] = 100
    fine[Math.round(4.4 * BINS_PER_SEMITONE)] = 1

    expect(Math.abs(estimateTuningOffset(fine))).toBeLessThan(0.05)
  })

  it("returns 0 for an empty or silent profile", () => {
    expect(estimateTuningOffset([])).toBe(0)
    expect(estimateTuningOffset(new Array(FINE_BINS).fill(0))).toBe(0)
  })

  it("survives non-finite weights", () => {
    const fine = fineAt([0, 4, 7], 0.25)
    fine[13] = Number.NaN
    fine[14] = -3

    expect(Number.isFinite(estimateTuningOffset(fine))).toBe(true)
  })
})

describe("folding a fine profile down to twelve classes", () => {
  it("preserves classes when there is nothing to correct", () => {
    const chroma = foldFineChroma(fineAt([0, 4, 7]))

    expect(chroma[PITCH_CLASS.C]).toBeGreaterThan(0)
    expect(chroma[PITCH_CLASS.E]).toBeGreaterThan(0)
    expect(chroma[PITCH_CLASS.G]).toBeGreaterThan(0)
    expect(chroma.filter((value) => value > 0)).toHaveLength(3)
  })

  it("stops a detuned note's spread from leaking into the next class", () => {
    // What the correction actually buys, which is narrower than it first looks.
    //
    // The offset is bounded to ±0.5 semitones, so `round` always lands a *pure*
    // tone on the right class — a note 40 cents sharp still rounds down to its own
    // semitone. The real damage is spectral spread: a note isn't one bin, it's a
    // peak with skirts, and when the peak sits at +0.4 the upper half of its
    // energy rounds up into the neighbouring class. Correcting pulls the whole
    // shape back so all of it stays home.
    const spread = new Array<number>(FINE_BINS).fill(0)
    // A note centred +0.4 semitones above C, with energy at 0.3, 0.4, 0.5, 0.6.
    spread[3] = 4
    spread[4] = 10
    spread[5] = 8
    spread[6] = 3

    const uncorrected = foldFineChroma(spread)
    const corrected = foldFineChroma(spread, BINS_PER_SEMITONE, 0.4)

    // Uncorrected, the 0.5 and 0.6 bins round up to C#.
    expect(uncorrected[PITCH_CLASS["C#"]]).toBeGreaterThan(0)
    // Corrected, everything is on C.
    expect(corrected[PITCH_CLASS["C#"]]).toBe(0)
    expect(corrected[PITCH_CLASS.C]).toBe(25)
  })

  it("recovers the right key from a detuned recording", () => {
    // End to end: A minor, 30 cents flat.
    const detuned = fineAt([9, 0, 4], -0.3, 12)
    const offset = estimateTuningOffset(detuned)

    expect(offset).toBeCloseTo(-0.3, 4)
    expect(
      detectKeyFromChroma(foldFineChroma(detuned, BINS_PER_SEMITONE, offset))?.key
    ).toBe("Am")
  })

  it("can only express the offset to the fine grid's resolution", () => {
    // BINS_PER_SEMITONE = 10, so the estimate is quantised to 10 cents. Asking for
    // 35 cents gets 30 or 40, never 35 — worth knowing before reading a run's
    // Tuning column as a precise measurement.
    const offset = estimateTuningOffset(fineAt([0, 4, 7], -0.35))

    expect(Math.abs(offset * BINS_PER_SEMITONE) % 1).toBeCloseTo(0, 6)
    expect(offset).toBeGreaterThanOrEqual(-0.4)
    expect(offset).toBeLessThanOrEqual(-0.3)
  })

  it("wraps B into C rather than off the end of the array", () => {
    const chroma = foldFineChroma(fineAt([11]), BINS_PER_SEMITONE, -0.6)

    expect(chroma).toHaveLength(12)
    expect(chroma[PITCH_CLASS.C]).toBeGreaterThan(0)
  })

  it("degrades on nonsense", () => {
    expect(foldFineChroma([], BINS_PER_SEMITONE)).toEqual(new Array(12).fill(0))
    expect(foldFineChroma(fineAt([0]), 0)).toEqual(new Array(12).fill(0))
  })
})

describe("building fine profiles from a spectrum", () => {
  function spectrumAt(hz: number, magnitude = 10) {
    const spectrum = new Array<number>(FRAME_SIZE / 2).fill(0)
    spectrum[Math.round(hz / BIN_WIDTH)] = magnitude
    return spectrum
  }

  const options = {
    frameSize: FRAME_SIZE,
    minHz: MIN_HZ,
    maxHz: MAX_HZ,
  }

  it("resolves finer than a semitone", () => {
    // 880 Hz (A5) and a tone 30 cents above it land in different fine bins, which
    // is the resolution the correction needs and the twelve-bin chroma lacks.
    const onGrid = fineChromaFromSpectrum(spectrumAt(880), RATE, options)
    const sharp = fineChromaFromSpectrum(
      spectrumAt(880 * Math.pow(2, 0.3 / 12)),
      RATE,
      options
    )

    expect(onGrid.findIndex((v) => v > 0)).not.toBe(sharp.findIndex((v) => v > 0))
  })

  it("keeps the same band as the twelve-bin chroma", () => {
    // A finer grid can't invent resolution the transform never had, so the floor
    // has to be the same one.
    expect(
      fineChromaFromSpectrum(spectrumAt(110), RATE, options).every((v) => v === 0)
    ).toBe(true)
    expect(
      fineChromaFromSpectrum(spectrumAt(MAX_HZ + 400), RATE, options).every(
        (v) => v === 0
      )
    ).toBe(true)
  })

  it("folds octaves together", () => {
    const chroma = foldFineChroma(
      sumFineChroma([
        fineChromaFromSpectrum(spectrumAt(440), RATE, options),
        fineChromaFromSpectrum(spectrumAt(880), RATE, options),
      ])
    )

    expect(chroma[PITCH_CLASS.A]).toBeGreaterThan(0)
    expect(chroma.filter((value) => value > 0)).toHaveLength(1)
  })

  it("degrades on nonsense input", () => {
    expect(fineChromaFromSpectrum([], RATE, options)).toHaveLength(FINE_BINS)
    expect(
      fineChromaFromSpectrum(spectrumAt(440), 0, options).every((v) => v === 0)
    ).toBe(true)
  })
})

describe("summing fine profiles across frames", () => {
  it("adds bin by bin", () => {
    expect(sumFineChroma([fineAt([0]), fineAt([0]), fineAt([4])])[0]).toBe(20)
  })

  it("skips negatives and non-finite values", () => {
    const bad = new Array<number>(FINE_BINS).fill(0)
    bad[0] = Number.NaN
    bad[1] = -100

    const total = sumFineChroma([fineAt([0]), bad])
    expect(total.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
  })

  it("returns a zeroed profile for no frames", () => {
    expect(sumFineChroma([])).toEqual(new Array(FINE_BINS).fill(0))
  })
})
