import { describe, expect, it } from "vitest"

import type { TrackAnalysis } from "@/lib/audio/analysis-types"
import {
  bpmAgrees,
  buildSpikeReport,
  formatDuration,
  keysAgree,
  LONG_TRACK_SECONDS,
  sortTracks,
} from "@/lib/audio/spike-report"

function track(overrides: Partial<TrackAnalysis> = {}): TrackAnalysis {
  return {
    fileName: "track.mp3",
    fileSizeBytes: 5_000_000,
    durationSeconds: 300,
    decodeMs: 300,
    bpmMs: 250,
    featuresMs: 1_500,
    totalMs: 2_100,
    realtimeFactor: 140,
    bpm: 128,
    detectedKey: "Am",
    keyConfidence: 0.7,
    keyMargin: 0.1,
    keyAgreement: 1,
    keySegments: 3,
    features: null,
    taggedBpm: 128,
    taggedKey: "1m",
    error: null,
    ...overrides,
  }
}

describe("tag comparison", () => {
  it("matches a detected musical key against an Open Key tag", () => {
    // Mixed In Key writes Open Key ("1m"); we detect musical keys ("Am"). Both
    // go through Camelot, where 1m and Am are the same position (8A).
    expect(keysAgree("Am", "1m")).toBe(true)
    expect(keysAgree("Am", "8A")).toBe(true)
  })

  it("reports a genuine key mismatch", () => {
    expect(keysAgree("C", "10m")).toBe(false)
  })

  it("returns null when there's nothing to compare", () => {
    expect(keysAgree("Am", null)).toBeNull()
    expect(keysAgree(null, "1m")).toBeNull()
    // An unparseable tag isn't a failure — it's just not comparable.
    expect(keysAgree("Am", "not a key")).toBeNull()
  })

  it("tolerates half- and double-time BPM tags", () => {
    // A 160 BPM track tagged 80 is a convention, not an error.
    expect(bpmAgrees(160, 80)).toBe(true)
    expect(bpmAgrees(75, 150)).toBe(true)
    expect(bpmAgrees(128, 128)).toBe(true)
    expect(bpmAgrees(155.2, 155)).toBe(true)
  })

  it("rejects a BPM that is genuinely off", () => {
    expect(bpmAgrees(128, 140)).toBe(false)
    expect(bpmAgrees(128, null)).toBeNull()
  })
})

describe("verdicts", () => {
  it("calls tempo production-ready when it matches the tags", () => {
    const report = buildSpikeReport(
      Array.from({ length: 19 }, () => track()),
      40
    )

    expect(report.accuracy.bpm.verdict).toBe("good")
    expect(report.accuracy.bpm.value).toBe("19/19")
    expect(report.headlines[0].text).toContain("production-ready")
  })

  it("calls key detection unshippable at the rate we actually measured", () => {
    // The real run: 3 of 14 tagged files agreed.
    const rows = [
      ...Array.from({ length: 3 }, () => track({ detectedKey: "Am", taggedKey: "1m" })),
      ...Array.from({ length: 11 }, () => track({ detectedKey: "C", taggedKey: "10m" })),
    ]
    const report = buildSpikeReport(rows, 40)

    expect(report.accuracy.key.verdict).toBe("bad")
    expect(report.accuracy.key.value).toBe("3/14")
    expect(
      report.headlines.some((line) => line.text.includes("not shippable"))
    ).toBe(true)
  })

  it("separates untagged files from failures", () => {
    const report = buildSpikeReport(
      [
        track({ taggedKey: null, taggedBpm: null }),
        track({ taggedKey: "1m", taggedBpm: 128 }),
      ],
      10
    )

    // No tag is nothing to check, not a miss — otherwise the rate lies.
    expect(report.accuracy.keyBreakdown).toEqual({
      comparable: 1,
      agreed: 1,
      untagged: 1,
    })
  })

  it("leads with what the run actually took, not an extrapolation", () => {
    // Showing "a 40-track playlist" as the headline figure read as a miscount
    // when only 21 files were picked. The measurement comes first; the
    // projection is explained underneath.
    const report = buildSpikeReport(
      [track({ totalMs: 1_000 }), track({ totalMs: 3_000 })],
      10
    )

    expect(report.speed.batchTotal.value).toBe("4.00s for 2 tracks")
    expect(report.speed.batchTotal.meaning).toContain("40-track playlist")
  })

  it("says 'track' rather than 'tracks' for a single file", () => {
    expect(buildSpikeReport([track({ totalMs: 500 })], 10).speed.batchTotal.value).toBe(
      "500ms for 1 track"
    )
  })

  it("still judges shippability by the projected playlist time", () => {
    // 40 tracks × 1s = 40s (fine) vs 40 × 8s = 5m20s (nobody waits).
    const fast = buildSpikeReport([track({ totalMs: 1_000 })], 10)
    const slow = buildSpikeReport([track({ totalMs: 8_000 })], 10)

    expect(fast.speed.batchTotal.verdict).toBe("good")
    expect(slow.speed.batchTotal.verdict).toBe("bad")
    expect(
      slow.headlines.some((line) => line.text.includes("30-second windows"))
    ).toBe(true)
  })

  it("grades the UI freeze against perceptibility", () => {
    expect(buildSpikeReport([track()], 40).responsiveness.worstFreeze.verdict).toBe("good")
    expect(buildSpikeReport([track()], 300).responsiveness.worstFreeze.verdict).toBe("warn")
    // The 1.16s we actually measured in production.
    expect(buildSpikeReport([track()], 1_160).responsiveness.worstFreeze.verdict).toBe("bad")
  })

  it("says so when the freeze probe never ran", () => {
    // rAF is throttled in a background tab, which reports a meaningless zero.
    const report = buildSpikeReport([track()], null)

    expect(report.responsiveness.worstFreeze.verdict).toBe("unknown")
    expect(report.responsiveness.worstFreeze.value).toBe("not measured")
  })

  it("flags files that are recorded sets rather than tracks", () => {
    const report = buildSpikeReport(
      [track(), track({ durationSeconds: LONG_TRACK_SECONDS + 1 })],
      40
    )

    expect(report.longFiles).toBe(1)
  })

  it("counts failures without letting them skew the numbers", () => {
    const report = buildSpikeReport(
      [track({ totalMs: 1_000 }), track({ error: "decode failed", totalMs: 99_999 })],
      40
    )

    expect(report.tracks).toBe(1)
    expect(report.failed).toBe(1)
    // The broken row must not drag the median.
    expect(report.speed.medianPerTrack.value).toBe("1.00s")
    expect(report.headlines.some((line) => line.text.includes("failed to analyse"))).toBe(true)
  })

  it("survives an empty batch", () => {
    const report = buildSpikeReport([], null)

    expect(report.tracks).toBe(0)
    expect(report.accuracy.bpm.value).toBe("no tagged files")
    expect(report.accuracy.bpm.verdict).toBe("unknown")
  })

  it("gives every measure a plain-language meaning", () => {
    const report = buildSpikeReport([track()], 40)
    const measures = [
      report.speed.batchTotal,
      report.speed.medianPerTrack,
      report.speed.p95PerTrack,
      report.speed.realtimeFactor,
      report.responsiveness.worstFreeze,
      report.accuracy.bpm,
      report.accuracy.key,
    ]

    // The whole point of this module: no number ships without an explanation.
    for (const measure of measures) {
      expect(measure.meaning.length).toBeGreaterThan(30)
    }
  })
})

describe("formatDuration", () => {
  it("scales the unit to the magnitude", () => {
    expect(formatDuration(45)).toBe("45ms")
    expect(formatDuration(2_320)).toBe("2.32s")
    expect(formatDuration(104_800)).toBe("1m 45s")
  })
})

describe("sorting the detail table", () => {
  const rows = [
    track({ fileName: "b.mp3", totalMs: 2_000, bpm: 128, detectedKey: "Am" }),
    track({ fileName: "a.mp3", totalMs: 5_000, bpm: null, detectedKey: null }),
    track({ fileName: "c.mp3", totalMs: 1_000, bpm: 150, detectedKey: "C" }),
  ]

  it("orders numerically in both directions", () => {
    expect(sortTracks(rows, "totalMs", false).map((r) => r.totalMs)).toEqual([
      1_000, 2_000, 5_000,
    ])
    expect(sortTracks(rows, "totalMs", true).map((r) => r.totalMs)).toEqual([
      5_000, 2_000, 1_000,
    ])
  })

  it("orders strings alphabetically", () => {
    expect(sortTracks(rows, "fileName", false).map((r) => r.fileName)).toEqual([
      "a.mp3",
      "b.mp3",
      "c.mp3",
    ])
  })

  it("keeps nulls last in both directions", () => {
    // A track with no detected key isn't "the smallest key" — burying the
    // unknowns is what makes sorting useful for finding mismatches.
    for (const desc of [true, false]) {
      const sorted = sortTracks(rows, "bpm", desc)
      expect(sorted[sorted.length - 1].bpm).toBeNull()
    }

    for (const desc of [true, false]) {
      const sorted = sortTracks(rows, "detectedKey", desc)
      expect(sorted[sorted.length - 1].detectedKey).toBeNull()
    }
  })

  it("does not mutate the input", () => {
    const original = rows.map((row) => row.fileName)
    sortTracks(rows, "totalMs", true)
    expect(rows.map((row) => row.fileName)).toEqual(original)
  })
})

describe("recorded sets are listed but never counted", () => {
  /**
   * The bug this pins: a 56-minute recorded set was flagged in the table and then
   * included in every statistic anyway. Two of them in a 23-file folder pulled the
   * median analysis time from ~1 s to something that answered a question nobody
   * asked, and their flattering realtime factor made the distortion look like good
   * news.
   */
  const shortTracks = [
    track({ fileName: "a.mp3", durationSeconds: 300, totalMs: 1_000 }),
    track({ fileName: "b.mp3", durationSeconds: 300, totalMs: 1_000 }),
    track({ fileName: "c.mp3", durationSeconds: 300, totalMs: 1_000 }),
  ]
  const recordedSet = track({
    fileName: "my-set.mp3",
    durationSeconds: 56 * 60,
    totalMs: 9_000,
    realtimeFactor: 380,
  })

  it("leaves them out of the track count", () => {
    const report = buildSpikeReport([...shortTracks, recordedSet], null)
    expect(report.tracks).toBe(3)
    expect(report.longFiles).toBe(1)
  })

  it("keeps the median from being dragged by one long file", () => {
    const withSet = buildSpikeReport([...shortTracks, recordedSet], null)
    const without = buildSpikeReport(shortTracks, null)

    expect(withSet.speed.medianPerTrack.value).toBe(
      without.speed.medianPerTrack.value
    )
    expect(withSet.speed.p95PerTrack.value).toBe(without.speed.p95PerTrack.value)
    expect(withSet.speed.realtimeFactor.value).toBe(
      without.speed.realtimeFactor.value
    )
  })

  it("does not count their audio in the analysed total", () => {
    const report = buildSpikeReport([...shortTracks, recordedSet], null)
    expect(report.audioSeconds).toBe(900)
  })

  it("says out loud that they were excluded", () => {
    // Silently dropping them would be its own kind of wrong: the numbers would be
    // right and the reader wouldn't know why the counts don't match the folder.
    const report = buildSpikeReport([...shortTracks, recordedSet], null)
    const notice = report.headlines.find((line) =>
      line.text.includes("recorded set")
    )
    expect(notice).toBeDefined()
    expect(notice!.verdict).toBe("warn")
  })

  it("still separates a failure from a recorded set", () => {
    const broken = track({ fileName: "bad.mp3", error: "boom" })
    const report = buildSpikeReport([...shortTracks, recordedSet, broken], null)

    expect(report.failed).toBe(1)
    expect(report.longFiles).toBe(1)
    expect(report.tracks).toBe(3)
  })
})
