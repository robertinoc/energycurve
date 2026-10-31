import { describe, expect, it } from "vitest"

import {
  beatsBetween,
  findCueCandidates,
  formatMinutesSeconds,
  normalise,
  snapToGrid,
} from "@/lib/audio/cue-candidates"
import {
  ENVELOPE_SECONDS,
  FINE_ENVELOPE_SECONDS,
  computeEnergyEnvelope,
} from "@/lib/audio/energy-envelope"
import {
  ambientIntroLayout,
  kickIntroLayout,
  renderSyntheticTrack,
  syntheticTruth,
  type SyntheticSpec,
} from "@/lib/audio/synthetic-track"

// A quarter of CD rate keeps these fast; the 150 Hz band and a 10 ms grid are
// both far inside what 11 kHz can represent.
const RATE = 11_025

function sine(hz: number, seconds: number, rate = RATE) {
  return Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) =>
    Math.sin((2 * Math.PI * hz * i) / rate)
  )
}

describe("energy envelope", () => {
  it("keeps one point per half second over the whole track", () => {
    const envelope = computeEnergyEnvelope(new Float32Array(6 * 60 * 44_100), 44_100)

    expect(envelope.secondsPerPoint).toBe(ENVELOPE_SECONDS)
    expect(envelope.full).toHaveLength(720)
    expect(envelope.low).toHaveLength(720)
    expect(envelope.fineSecondsPerPoint).toBe(FINE_ENVELOPE_SECONDS)
    expect(envelope.lowFine).toHaveLength(36_000)
    expect(envelope.fullFine).toHaveLength(36_000)
  })

  it("keeps a partial block at the end instead of dropping it", () => {
    const envelope = computeEnergyEnvelope(sine(50, 10.25), RATE)
    expect(envelope.full).toHaveLength(21)
  })

  it("aligns coarse and fine points on the same audio", () => {
    // 11 025 Hz: a 10 ms hop is 110 samples, so half a second is 50 of them —
    // the coarse hop is a whole number of fine hops even when neither is exact.
    const envelope = computeEnergyEnvelope(sine(50, 4), RATE)
    const ratio = envelope.secondsPerPoint / envelope.fineSecondsPerPoint
    expect(Number.isInteger(Math.round(ratio * 1e9) / 1e9)).toBe(true)
  })

  it("puts a kick-range tone in the low band and keeps a synth out of it", () => {
    const bass = computeEnergyEnvelope(sine(50, 4), RATE)
    const lead = computeEnergyEnvelope(sine(2_000, 4), RATE)

    // Skip the first point: the filter is still settling there.
    expect(bass.low[3] / bass.full[3]).toBeGreaterThan(0.9)
    expect(lead.low[3] / lead.full[3]).toBeLessThan(0.01)
  })

  it("returns an empty envelope rather than throwing on nothing", () => {
    expect(computeEnergyEnvelope(new Float32Array(0), RATE).full).toEqual([])
    expect(computeEnergyEnvelope(sine(50, 1), 0).full).toEqual([])
  })
})

describe("beat grid helpers", () => {
  const grid = { bpm: 120, offsetSeconds: 0.2 }

  it("snaps to the nearest beat", () => {
    expect(snapToGrid(10.1, grid)).toBeCloseTo(10.2, 9)
    expect(snapToGrid(10.44, grid)).toBeCloseTo(10.2, 9)
    expect(snapToGrid(10.46, grid)).toBeCloseTo(10.7, 9)
    // Never before the first beat.
    expect(snapToGrid(0, grid)).toBeCloseTo(0.2, 9)
  })

  it("lists the beats inside a span", () => {
    expect(beatsBetween(grid, 1, 2.2)).toEqual([1.2, 1.7, 2.2])
  })

  it("normalises by the 95th percentile, not the maximum", () => {
    const values = [...Array.from({ length: 99 }, () => 1), 50]
    expect(normalise(values)[0]).toBe(1)
    expect(normalise([0, 0])).toEqual([0, 0])
  })
})

describe("CUE candidates on synthetic tracks, given the true beat grid", () => {
  // The true grid isolates the envelope method from the beat tracker: if these
  // miss, the envelope is the problem; how far off guess() puts the grid is
  // measured separately, in the browser, because it needs Web Audio.
  const cases: Array<[string, SyntheticSpec]> = [
    [
      "beatless intro, 128 BPM",
      { bpm: 128, firstBeatSeconds: 0.233, sampleRate: RATE, sections: ambientIntroLayout() },
    ],
    [
      "kick from the first beat, 140 BPM",
      { bpm: 140, firstBeatSeconds: 0.333, sampleRate: RATE, sections: kickIntroLayout() },
    ],
    [
      "non-integer tempo, 124.5 BPM",
      { bpm: 124.5, firstBeatSeconds: 0.21, sampleRate: RATE, sections: ambientIntroLayout() },
    ],
  ]

  it.each(cases)("%s: entry, drop and exit land on the right beat", (_, spec) => {
    const truth = syntheticTruth(spec)
    const envelope = computeEnergyEnvelope(renderSyntheticTrack(spec), RATE)
    const cues = findCueCandidates(envelope, {
      bpm: spec.bpm,
      offsetSeconds: spec.firstBeatSeconds,
    })

    expect(cues.notes).toEqual([])
    expect(cues.entry?.seconds).toBeCloseTo(truth.entrySeconds!, 6)
    expect(cues.drop?.seconds).toBeCloseTo(truth.dropSeconds!, 6)
    expect(cues.exit?.seconds).toBeCloseTo(truth.exitSeconds!, 6)
    for (const cue of [cues.entry, cues.drop, cues.exit]) {
      expect(cue?.snapped).toBe(true)
    }
  })

  it("leaves times unsnapped, and says so, when there is no grid", () => {
    const spec: SyntheticSpec = {
      bpm: 128,
      firstBeatSeconds: 0.233,
      sampleRate: RATE,
      sections: ambientIntroLayout(),
    }
    const truth = syntheticTruth(spec)
    const cues = findCueCandidates(
      computeEnergyEnvelope(renderSyntheticTrack(spec), RATE),
      null
    )

    expect(cues.notes).toContain("no beat grid: times are not snapped to a beat")
    expect(cues.entry?.snapped).toBe(false)
    // Still the right section, to within the envelope's half second.
    expect(Math.abs(cues.entry!.seconds - truth.entrySeconds!)).toBeLessThanOrEqual(
      ENVELOPE_SECONDS
    )
  })

  it("reports no entry and no drop on a track with no kick at all", () => {
    const spec: SyntheticSpec = {
      bpm: 128,
      firstBeatSeconds: 0,
      sampleRate: RATE,
      sections: [
        { role: "intro", bars: 64, kick: false, bass: false, hats: true, pad: true },
      ],
    }
    const envelope = computeEnergyEnvelope(renderSyntheticTrack(spec), RATE)
    // Low band is filter leakage from the pad: a level, not a groove. Zeroing it
    // makes the "never holds" branch explicit instead of threshold-dependent.
    const cues = findCueCandidates(
      { ...envelope, low: envelope.low.map(() => 0) },
      { bpm: 128, offsetSeconds: 0 }
    )

    expect(cues.entry).toBeNull()
    expect(cues.drop).toBeNull()
    expect(cues.notes.join(" ")).toMatch(/entry/)
  })
})

describe("m:ss", () => {
  it("formats like a CDJ screen", () => {
    expect(formatMinutesSeconds(0)).toBe("0:00")
    expect(formatMinutesSeconds(59.99)).toBe("0:59")
    expect(formatMinutesSeconds(61)).toBe("1:01")
    expect(formatMinutesSeconds(480)).toBe("8:00")
    expect(formatMinutesSeconds(null)).toBe("—")
    expect(formatMinutesSeconds(Number.NaN)).toBe("—")
  })
})
