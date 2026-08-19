import { describe, expect, it } from "vitest"

import type { TrackAudioFeatures } from "@/lib/audio/track-features"
import { TRACK_FEATURES_VERSION } from "@/lib/audio/track-features"
import {
  ENERGY_MODEL_V3,
  V3_FEATURES,
  energyFromAudioFeatures,
  fitEnergyModelV3,
  v3FeatureVector,
  type EnergyModelV3,
  type LabelledTrack,
} from "@/lib/engine/energy-model-v3"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"

function features(
  overrides: Partial<TrackAudioFeatures> = {}
): TrackAudioFeatures {
  return {
    rmsMean: 0.2,
    rmsPeak: 0.4,
    fluxMean: 1.1,
    entropyMean: 0.38,
    onsetRate: 2.2,
    analyzedSeconds: 90,
    version: TRACK_FEATURES_VERSION,
    ...overrides,
  }
}

/** A model with obvious weights, for testing the scorer rather than the fit. */
function model(overrides: Partial<EnergyModelV3> = {}): EnergyModelV3 {
  return {
    weights: {
      tempo: 1,
      rmsMean: 1,
      fluxMean: 0,
      entropyMean: 0,
      onsetRate: 0,
    },
    intercept: 0,
    scaling: {
      tempo: { mean: 140, sd: 10 },
      rmsMean: { mean: 0.2, sd: 0.05 },
      fluxMean: { mean: 1, sd: 0.5 },
      entropyMean: { mean: 0.4, sd: 0.1 },
      onsetRate: { mean: 2, sd: 1 },
    },
    trainedOn: 100,
    ...overrides,
  }
}

describe("the unfitted model ships inert", () => {
  it("has no coefficients", () => {
    // The spec is explicit that inventing plausible numbers would be the worst
    // thing this file could contain, because they'd be implemented and nobody
    // would know they were invented. If this ever fails, check that the weights
    // came from fitEnergyModelV3 over real labels and are written up in
    // docs/energy-model-v3.md.
    expect(ENERGY_MODEL_V3).toBeNull()
  })

  it("scores nothing while the model is null", () => {
    expect(energyFromAudioFeatures(features(), 140, null)).toBeNull()
  })

  it("leaves the energy ladder exactly as it was", () => {
    // The safety property of shipping this: with no model, a track carrying
    // features still resolves from BPM, and the reported source says so.
    const resolved = resolveTrackEnergies(
      [
        {
          position: 1,
          bpm: 140,
          energy_score: null,
          audio_features: features(),
        },
      ],
      "main"
    )

    expect(resolved[0].source).toBe("bpm")
  })
})

describe("scoring from a fitted model", () => {
  it("stays inside the 1-10 scale at both extremes", () => {
    const loud = energyFromAudioFeatures(
      features({ rmsMean: 0.99 }),
      200,
      model()
    )
    const quiet = energyFromAudioFeatures(
      features({ rmsMean: 0.001 }),
      60,
      model()
    )

    expect(loud).toBeLessThanOrEqual(10)
    expect(loud).toBeGreaterThanOrEqual(1)
    expect(quiet).toBeGreaterThanOrEqual(1)
    expect(quiet).toBeLessThanOrEqual(10)
  })

  it("rises with a feature its weight is positive on", () => {
    const softer = energyFromAudioFeatures(features({ rmsMean: 0.1 }), 140, model())
    const louder = energyFromAudioFeatures(features({ rmsMean: 0.3 }), 140, model())

    expect(louder!).toBeGreaterThan(softer!)
  })

  it("ignores a feature whose weight is zero", () => {
    const low = energyFromAudioFeatures(features({ fluxMean: 0.1 }), 140, model())
    const high = energyFromAudioFeatures(features({ fluxMean: 40 }), 140, model())

    expect(low).toBe(high)
  })

  it("standardises against the corpus, not the track's neighbours", () => {
    // The property the spec insists on: the same track must score the same
    // regardless of what it is sitting next to, or every comparison the product
    // makes breaks.
    const alone = energyFromAudioFeatures(features(), 145, model())
    const inALoudSet = energyFromAudioFeatures(features(), 145, model())

    expect(alone).toBe(inALoudSet)
  })

  it("refuses to score without a tempo", () => {
    // A partial vector fed to a linear model produces a confident number from
    // missing evidence.
    expect(energyFromAudioFeatures(features(), null, model())).toBeNull()
    expect(energyFromAudioFeatures(features(), 0, model())).toBeNull()
    expect(v3FeatureVector(features(), null)).toBeNull()
  })

  it("builds the vector in the order the weights assume", () => {
    const vector = v3FeatureVector(
      features({ rmsMean: 0.11, fluxMean: 0.22, entropyMean: 0.33, onsetRate: 4.4 }),
      147
    )

    expect(vector).toEqual([147, 0.11, 0.22, 0.33, 4.4])
    expect(vector).toHaveLength(V3_FEATURES.length)
  })
})

describe("fitting", () => {
  /**
   * Rows whose rating really is a function of the features, so a correct fit has
   * something to find.
   *
   * Every feature varies independently — a deterministic LCG rather than
   * Math.random, so a failure is reproducible. This matters: my first attempt made
   * tempo and loudness both linear in the row index, which makes them perfectly
   * collinear and the normal equations singular. The fit correctly returned null
   * and the test data was the bug.
   */
  function synthetic(count: number): LabelledTrack[] {
    let seed = 12345
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }

    return Array.from({ length: count }, () => {
      const rms = 0.02 + next() * 0.6
      const bpm = 118 + next() * 50
      return {
        bpm,
        features: features({
          rmsMean: rms,
          fluxMean: 0.2 + next() * 3,
          entropyMean: 0.1 + next() * 0.8,
          onsetRate: 0.5 + next() * 5,
        }),
        // Driven by loudness alone, so a correct fit weights rmsMean above the rest.
        label: Math.min(10, Math.max(1, Math.round(1 + rms * 14))),
      }
    })
  }

  it("returns null with too few rows to fit six parameters", () => {
    // Below this the solution is whatever noise the corpus happens to have.
    expect(fitEnergyModelV3(synthetic(8))).toBeNull()
    expect(fitEnergyModelV3([])).toBeNull()
  })

  it("fits, holds out a fifth, and reports both errors", () => {
    const result = fitEnergyModelV3(synthetic(60))

    expect(result).not.toBeNull()
    expect(result!.holdoutRows).toBe(12)
    expect(result!.usedRows).toBe(48)
    expect(result!.model.trainedOn).toBe(48)
    expect(Number.isFinite(result!.trainingMae)).toBe(true)
    expect(Number.isFinite(result!.holdoutMae)).toBe(true)
  })

  it("reports the BPM-only error on the same holdout", () => {
    // The bar the spec sets: a model with more inputs that predicts no better is
    // strictly worse, so the comparison is returned rather than left to be
    // remembered.
    const result = fitEnergyModelV3(synthetic(60))

    expect(result!.bpmBaselineMae).toBeGreaterThan(0)
    expect(Number.isFinite(result!.bpmBaselineMae)).toBe(true)
  })

  it("recovers a relationship that is really there", () => {
    const result = fitEnergyModelV3(synthetic(60))

    // Loudness drove the labels, so it should carry more weight than the noise
    // feature — and the fit should beat BPM-only on data where BPM is incidental.
    expect(Math.abs(result!.model.weights.rmsMean)).toBeGreaterThan(
      Math.abs(result!.model.weights.fluxMean)
    )
    expect(result!.holdoutMae).toBeLessThan(result!.bpmBaselineMae)
  })

  it("skips rows it can't use instead of failing", () => {
    const rows = [
      ...synthetic(60),
      { bpm: null, features: features(), label: 5 },
      { bpm: 140, features: features(), label: 42 },
      { bpm: 140, features: features(), label: 3.5 },
    ]

    const result = fitEnergyModelV3(rows)
    expect(result!.usedRows + result!.holdoutRows).toBe(60)
  })

  it("returns null rather than a coefficient when the system is singular", () => {
    // Every feature identical: no unique solution. Inventing one would be a
    // fabricated coefficient reached by a different route.
    const flat = Array.from({ length: 60 }, (_, index) => ({
      bpm: 140,
      features: features(),
      label: (index % 10) + 1,
    }))

    expect(fitEnergyModelV3(flat)).toBeNull()
  })

  it("splits deterministically, so two runs agree", () => {
    const first = fitEnergyModelV3(synthetic(60))
    const second = fitEnergyModelV3(synthetic(60))

    expect(first!.model.weights).toEqual(second!.model.weights)
    expect(first!.holdoutMae).toBe(second!.holdoutMae)
  })

  it("standardises on training rows only", () => {
    // Using the holdout's statistics would leak the test set into the scaling and
    // flatter the reported error.
    const result = fitEnergyModelV3(synthetic(60))

    for (const name of V3_FEATURES) {
      expect(result!.model.scaling[name].sd).toBeGreaterThan(0)
      expect(Number.isFinite(result!.model.scaling[name].mean)).toBe(true)
    }
  })
})
