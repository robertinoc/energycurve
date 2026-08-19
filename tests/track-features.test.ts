import { describe, expect, it } from "vitest"

import type { AudioFeatures } from "@/lib/audio/analysis-types"
import {
  TRACK_FEATURES_VERSION,
  isCurrentFeatureVersion,
  parseTrackAudioFeatures,
  toTrackAudioFeatures,
} from "@/lib/audio/track-features"

/** A plausible measurement, in the shape the worker emits. */
function workerFeatures(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    rmsMean: 0.21,
    rmsPeak: 0.44,
    fluxMean: 1.13,
    entropyMean: 0.39,
    onsetRate: 2.28,
    chroma: new Array<number>(12).fill(0.08),
    chromaSegments: [new Array<number>(12).fill(0.08)],
    frameCount: 1938,
    analyzedSeconds: 90,
    ...overrides,
  }
}

const stored = () => ({
  rmsMean: 0.21,
  rmsPeak: 0.44,
  fluxMean: 1.13,
  entropyMean: 0.39,
  onsetRate: 2.28,
  analyzedSeconds: 90,
  version: TRACK_FEATURES_VERSION,
})

describe("persisting a track's audio features", () => {
  it("keeps the five predictors, the coverage and the version", () => {
    expect(toTrackAudioFeatures(workerFeatures())).toEqual(stored())
  })

  it("drops chroma", () => {
    // Not an oversight. Chroma is a product of the extraction pipeline, and the
    // open key-detection work changes that pipeline, so a stored vector would be
    // a cache guaranteed to go stale.
    const result = toTrackAudioFeatures(workerFeatures())
    expect(result).not.toHaveProperty("chroma")
    expect(result).not.toHaveProperty("chromaSegments")
    expect(result).not.toHaveProperty("frameCount")
  })

  it("round-trips through the parser", () => {
    const features = toTrackAudioFeatures(workerFeatures())
    expect(parseTrackAudioFeatures(features)).toEqual(features)
  })
})

describe("parsing untrusted feature input", () => {
  it("accepts a well-formed set", () => {
    expect(parseTrackAudioFeatures(stored())).toEqual(stored())
  })

  it("rejects anything that isn't an object", () => {
    for (const input of [null, undefined, 7, "features", [], [stored()], true]) {
      expect(parseTrackAudioFeatures(input)).toBeNull()
    }
  })

  it("rejects a set that is missing any single field", () => {
    // All-or-nothing on purpose: a model fed a partial feature vector produces a
    // plausible number from incomplete evidence, which is worse than no number
    // and a fall back to BPM.
    for (const key of Object.keys(stored())) {
      const partial: Record<string, unknown> = { ...stored() }
      delete partial[key]
      expect(
        parseTrackAudioFeatures(partial),
        `missing ${key} should reject the whole set`
      ).toBeNull()
    }
  })

  it("rejects non-finite numbers", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -Number.POSITIVE_INFINITY]) {
      expect(parseTrackAudioFeatures({ ...stored(), fluxMean: bad })).toBeNull()
    }
  })

  it("rejects values that a real measurement can't produce", () => {
    expect(parseTrackAudioFeatures({ ...stored(), rmsMean: 1.4 })).toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), rmsMean: -0.1 })).toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), entropyMean: 2 })).toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), onsetRate: -1 })).toBeNull()
    expect(
      parseTrackAudioFeatures({ ...stored(), analyzedSeconds: 90_000 })
    ).toBeNull()
  })

  it("accepts unusual but physically possible measurements", () => {
    // The bounds exist to reject payloads that aren't feature sets, not to reject
    // surprising music. Refusing to store a genuinely unusual track would bias
    // the very dataset this is collecting.
    expect(parseTrackAudioFeatures({ ...stored(), fluxMean: 47 })).not.toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), onsetRate: 19 })).not.toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), rmsMean: 0 })).not.toBeNull()
  })

  it("rejects a string that looks like a number", () => {
    expect(parseTrackAudioFeatures({ ...stored(), rmsMean: "0.21" })).toBeNull()
  })

  it("requires an integer version", () => {
    expect(parseTrackAudioFeatures({ ...stored(), version: 2.5 })).toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), version: 0 })).toBeNull()
    expect(parseTrackAudioFeatures({ ...stored(), version: "2" })).toBeNull()
  })

  it("still parses a set from an older extraction version", () => {
    // Readable, but flagged: the caller decides whether it's comparable.
    const old = { ...stored(), version: 1 }
    const parsed = parseTrackAudioFeatures(old)
    expect(parsed).not.toBeNull()
    expect(isCurrentFeatureVersion(parsed!)).toBe(false)
    expect(isCurrentFeatureVersion(stored())).toBe(true)
  })

  it("ignores extra keys rather than rejecting the set", () => {
    // Forward compatibility: a newer build that stores an extra feature must not
    // make its rows unreadable to an older one.
    const parsed = parseTrackAudioFeatures({ ...stored(), somethingNew: 3 })
    expect(parsed).toEqual(stored())
  })
})
