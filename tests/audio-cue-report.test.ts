import { describe, expect, it } from "vitest"

import type { TrackAnalysis } from "@/lib/audio/analysis-types"
import { computeEnergyEnvelope } from "@/lib/audio/energy-envelope"
import {
  candidatesFor,
  summarise,
  toCsv,
  toCueRow,
  toJsonExport,
} from "@/lib/audio/cue-report"
import {
  kickIntroLayout,
  renderSyntheticTrack,
  syntheticTruth,
  type SyntheticSpec,
} from "@/lib/audio/synthetic-track"

const RATE = 11_025

function analysis(overrides: Partial<TrackAnalysis> = {}): TrackAnalysis {
  return {
    fileName: "a.wav",
    fileSizeBytes: 1,
    durationSeconds: 200,
    decodeMs: 100,
    bpmMs: 400,
    featuresMs: 1_000,
    totalMs: 1_600,
    realtimeFactor: 1,
    bpm: 128.004,
    detectedKey: null,
    keyConfidence: null,
    keyMargin: null,
    keyAgreement: null,
    keySegments: null,
    keyByVariant: {},
    features: null,
    taggedBpm: null,
    taggedKey: null,
    error: null,
    ...overrides,
  }
}

describe("CUE report", () => {
  const spec: SyntheticSpec = {
    bpm: 128,
    firstBeatSeconds: 0.1,
    sampleRate: RATE,
    sections: kickIntroLayout(),
  }
  const envelope = computeEnergyEnvelope(renderSyntheticTrack(spec), RATE)
  const measured = analysis({
    cue: {
      envelope,
      envelopeMs: 50,
      guess: { bpm: 128, offset: 0.1, tempo: 128.004 },
      guessMs: 350,
      guessError: null,
    },
  })

  it("derives candidates from the guess() grid and flattens them", () => {
    const row = toCueRow(measured, candidatesFor(measured))
    const truth = syntheticTruth(spec)

    expect(row.bpmAgrees).toBe(true)
    expect(row.entrySeconds).toBeCloseTo(truth.entrySeconds!, 6)
    expect(row.dropSeconds).toBeCloseTo(truth.dropSeconds!, 6)
    expect(row.exitSeconds).toBeCloseTo(truth.exitSeconds!, 6)
    expect(row.snapped).toBe(true)
  })

  it("has no candidates on a row analysed without the flag", () => {
    const plain = analysis()
    expect(candidatesFor(plain)).toBeNull()
    expect(toCueRow(plain, null).entrySeconds).toBeNull()
  })

  it("quotes CSV cells that need it and keeps a fixed header", () => {
    const row = toCueRow(analysis({ fileName: 'Artist, "Name".wav' }), null)
    const [header, line] = toCsv([row]).split("\n")

    expect(header.split(",")[0]).toBe("fileName")
    expect(header.split(",")).toHaveLength(21)
    expect(line.startsWith('"Artist, ""Name"".wav",200,128.0040,')).toBe(true)
  })

  it("exports the half-second envelope and leaves the 10 ms one out", () => {
    const json = toJsonExport([measured], "2026-10-31T00:00:00.000Z")
    const track = json.tracks[0]

    expect(track.envelope?.full).toHaveLength(envelope.full.length)
    expect(track.envelope).not.toHaveProperty("lowFine")
    expect(track.candidates?.entry?.snapped).toBe(true)
  })

  it("summarises cost as added share of today's analysis", () => {
    const summary = summarise([
      toCueRow(measured, candidatesFor(measured)),
      toCueRow(analysis({ error: "decode failed" }), null),
    ])

    expect(summary.tracks).toBe(1)
    expect(summary.failed).toBe(1)
    expect(summary.bpmAgree).toBe(1)
    // (50 + 350) / (100 + 400 + 1000)
    expect(summary.medianAddedShare).toBeCloseTo(400 / 1_500, 9)
  })
})
