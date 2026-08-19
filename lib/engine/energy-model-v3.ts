/**
 * Energy Model v3: energy from the track's own audio rather than from its tempo
 * alone.
 *
 * The form is the one `docs/energy-model-v3.md` specifies and nothing more:
 *
 *   arousal = w₁·z(tempo) + w₂·z(rmsMean) + w₃·z(fluxMean)
 *           + w₄·z(entropyMean) + w₅·z(onsetRate) + b
 *   energy  = clamp(round(10 · sigmoid(arousal)), 1, 10)
 *
 * Linear in standardised features, squashed once at the end. Deliberately the
 * simplest thing that can work: it stays explainable — a DJ can be told *"this
 * scored high because it's dense and loud, not because it's fast"* — and with a
 * corpus in the low hundreds anything richer fits noise.
 *
 * `z()` standardises against the **corpus**, not the playlist. Normalising within
 * a set would make the same track score differently depending on its company,
 * which breaks every comparison the product makes.
 *
 * ## Why there are no coefficients in this file
 *
 * `ENERGY_MODEL_V3` is `null`, and until it isn't, nothing changes: the energy
 * ladder falls straight through to the BPM branch exactly as before. That is the
 * point. The spec is blunt about it — *"writing plausible-looking numbers here
 * would be the worst thing this could contain: they would get implemented, and
 * nobody would know they were invented rather than measured"* — so the scorer
 * ships with the slot empty and `fitEnergyModelV3` is how the slot gets filled,
 * from real labels, by whoever has them.
 *
 * ## The bar
 *
 * `fitEnergyModelV3` reports the fitted model's holdout error **and** the current
 * BPM-only model's error on that same holdout. A more complicated model that
 * predicts no better is strictly worse, so the comparison is returned rather than
 * left to whoever reads the number.
 */

import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"
import type { TrackAudioFeatures } from "@/lib/audio/track-features"

import { energyScoreFromBpmUniversal } from "./energy-score"

/** The five predictors, in a fixed order the matrix maths depends on. */
export const V3_FEATURES = [
  "tempo",
  "rmsMean",
  "fluxMean",
  "entropyMean",
  "onsetRate",
] as const

export type V3Feature = (typeof V3_FEATURES)[number]

export interface FeatureScaling {
  mean: number
  /** Standard deviation. Never zero — a constant feature is dropped to 1. */
  sd: number
}

export interface EnergyModelV3 {
  weights: Record<V3Feature, number>
  intercept: number
  /** Corpus statistics the weights were fitted against. */
  scaling: Record<V3Feature, FeatureScaling>
  /** How many labelled tracks produced these weights. */
  trainedOn: number
}

/**
 * The fitted model, or null while it doesn't exist.
 *
 * To fill this in: collect ratings in the harness (`Energy by ear`), copy the
 * labels JSON, run `fitEnergyModelV3` over it, confirm `holdoutMae` beats
 * `bpmBaselineMae`, write both numbers plus the weights into
 * docs/energy-model-v3.md, and only then paste the model here.
 */
export const ENERGY_MODEL_V3: EnergyModelV3 | null = null

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value))
}

/**
 * Feature vector for one track, in `V3_FEATURES` order.
 *
 * Tempo comes from the BPM the track already carries rather than from the feature
 * set, because tempo detection is a separate (and far more accurate) measurement —
 * 19/19 exact against tags in the spike — and there is no reason to re-derive it
 * from the spectrum.
 */
export function v3FeatureVector(
  features: TrackAudioFeatures,
  bpm: number | null
): number[] | null {
  if (bpm === null || !Number.isFinite(bpm) || bpm <= 0) {
    // Without tempo the vector is incomplete, and a partial vector fed to a
    // linear model produces a confident number from missing evidence.
    return null
  }

  return [
    bpm,
    features.rmsMean,
    features.fluxMean,
    features.entropyMean,
    features.onsetRate,
  ]
}

/**
 * Energy 1–10 from a track's audio, or null when it can't be computed — no fitted
 * model, or no tempo to pair with the spectral features.
 *
 * Returning null rather than a guess is what keeps the source ladder honest: the
 * caller falls through to the BPM branch and the UI still says where the number
 * came from.
 */
export function energyFromAudioFeatures(
  features: TrackAudioFeatures,
  bpm: number | null,
  model: EnergyModelV3 | null = ENERGY_MODEL_V3
): number | null {
  if (!model) {
    return null
  }

  const vector = v3FeatureVector(features, bpm)

  if (!vector) {
    return null
  }

  let arousal = model.intercept

  for (const [index, name] of V3_FEATURES.entries()) {
    const { mean, sd } = model.scaling[name]
    arousal += model.weights[name] * ((vector[index] - mean) / (sd || 1))
  }

  if (!Number.isFinite(arousal)) {
    return null
  }

  const scaled = Math.round(10 * sigmoid(arousal))

  return Math.min(
    ENERGY_SCORE_RANGE.max,
    Math.max(ENERGY_SCORE_RANGE.min, scaled)
  )
}

// ── Fitting ────────────────────────────────────────────────────────────────────

export interface LabelledTrack {
  features: TrackAudioFeatures
  bpm: number | null
  /** The listener's rating, 1–10. */
  label: number
}

export interface FitResult {
  model: EnergyModelV3
  /** Mean absolute error on the rows used to fit, in energy points. */
  trainingMae: number
  /** Mean absolute error on the held-out rows — the number that counts. */
  holdoutMae: number
  /**
   * The same holdout scored by today's BPM-only model.
   *
   * The bar v3 has to clear. A model with more inputs that predicts no better is
   * strictly worse, so this is returned next to `holdoutMae` rather than left for
   * someone to remember to check.
   */
  bpmBaselineMae: number
  usedRows: number
  holdoutRows: number
}

/** Every fifth row, so the split is reproducible across runs and machines. */
const HOLDOUT_EVERY = 5

/** Keeps the logit finite: a rating of 1 or 10 would otherwise map to ±∞. */
function labelToLogit(label: number): number {
  const clamped = Math.min(0.98, Math.max(0.02, label / 10))
  return Math.log(clamped / (1 - clamped))
}

/** Solves `A·x = b` in place by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] | null {
  const size = b.length

  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) {
        pivot = row
      }
    }

    if (Math.abs(a[pivot][column]) < 1e-12) {
      // Singular: two predictors are collinear, or a feature is constant across
      // the corpus. No unique solution, and inventing one would be a fabricated
      // coefficient by another route.
      return null
    }

    ;[a[column], a[pivot]] = [a[pivot], a[column]]
    ;[b[column], b[pivot]] = [b[pivot], b[column]]

    for (let row = column + 1; row < size; row += 1) {
      const factor = a[row][column] / a[column][column]
      for (let col = column; col < size; col += 1) {
        a[row][col] -= factor * a[column][col]
      }
      b[row] -= factor * b[column]
    }
  }

  const solution = new Array<number>(size).fill(0)

  for (let row = size - 1; row >= 0; row -= 1) {
    let sum = b[row]
    for (let col = row + 1; col < size; col += 1) {
      sum -= a[row][col] * solution[col]
    }
    solution[row] = sum / a[row][row]
  }

  return solution.every((value) => Number.isFinite(value)) ? solution : null
}

/**
 * Ordinary least squares on the logit of the rating, with a fifth of the rows held
 * out.
 *
 * Fitting on the logit rather than on the rating itself is what makes a linear
 * solve valid for a model that ends in a sigmoid: the link is inverted first, so
 * the thing being fitted really is linear in the features.
 *
 * Returns null when there isn't enough to fit — fewer rows than free parameters
 * means the solution is whatever noise the corpus happens to have.
 */
export function fitEnergyModelV3(rows: LabelledTrack[]): FitResult | null {
  const usable: { vector: number[]; label: number; bpm: number }[] = []

  for (const row of rows) {
    const vector = v3FeatureVector(row.features, row.bpm)
    if (
      vector &&
      Number.isInteger(row.label) &&
      row.label >= ENERGY_SCORE_RANGE.min &&
      row.label <= ENERGY_SCORE_RANGE.max
    ) {
      usable.push({ vector, label: row.label, bpm: row.bpm as number })
    }
  }

  const parameterCount = V3_FEATURES.length + 1

  // A holdout is only meaningful if the training half still outnumbers the
  // parameters; below that this is curve-tracing, not fitting.
  if (usable.length < parameterCount * 3) {
    return null
  }

  const holdout = usable.filter((_, index) => index % HOLDOUT_EVERY === 0)
  const training = usable.filter((_, index) => index % HOLDOUT_EVERY !== 0)

  if (holdout.length === 0 || training.length < parameterCount) {
    return null
  }

  // Standardise against the training rows only. Using every row — holdout
  // included — would leak the test set into the scaling and flatter the result.
  const scaling = {} as Record<V3Feature, FeatureScaling>

  for (const [index, name] of V3_FEATURES.entries()) {
    const values = training.map((row) => row.vector[index])
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    const sd = Math.sqrt(variance)

    scaling[name] = { mean, sd: sd > 1e-9 ? sd : 1 }
  }

  const design = training.map((row) => [
    1,
    ...V3_FEATURES.map(
      (name, index) =>
        (row.vector[index] - scaling[name].mean) / scaling[name].sd
    ),
  ])
  const targets = training.map((row) => labelToLogit(row.label))

  // Normal equations: XᵀX · w = Xᵀy
  const xtx = Array.from({ length: parameterCount }, (_, i) =>
    Array.from({ length: parameterCount }, (_, j) =>
      design.reduce((sum, sample) => sum + sample[i] * sample[j], 0)
    )
  )
  const xty = Array.from({ length: parameterCount }, (_, i) =>
    design.reduce((sum, sample, index) => sum + sample[i] * targets[index], 0)
  )

  const solution = solve(xtx, xty)

  if (!solution) {
    return null
  }

  const weights = {} as Record<V3Feature, number>
  for (const [index, name] of V3_FEATURES.entries()) {
    weights[name] = solution[index + 1]
  }

  const model: EnergyModelV3 = {
    weights,
    intercept: solution[0],
    scaling,
    trainedOn: training.length,
  }

  const maeOf = (
    subset: typeof usable,
    predict: (row: (typeof usable)[number]) => number | null
  ) => {
    let total = 0
    let counted = 0

    for (const row of subset) {
      const predicted = predict(row)
      if (predicted !== null) {
        total += Math.abs(predicted - row.label)
        counted += 1
      }
    }

    return counted === 0 ? Number.POSITIVE_INFINITY : total / counted
  }

  const predictV3 = (row: (typeof usable)[number]) => {
    let arousal = model.intercept
    for (const [index, name] of V3_FEATURES.entries()) {
      arousal +=
        model.weights[name] *
        ((row.vector[index] - scaling[name].mean) / scaling[name].sd)
    }
    return Math.min(
      ENERGY_SCORE_RANGE.max,
      Math.max(ENERGY_SCORE_RANGE.min, Math.round(10 * sigmoid(arousal)))
    )
  }

  return {
    model,
    trainingMae: maeOf(training, predictV3),
    holdoutMae: maeOf(holdout, predictV3),
    bpmBaselineMae: maeOf(holdout, (row) =>
      energyScoreFromBpmUniversal(row.bpm)
    ),
    usedRows: training.length,
    holdoutRows: holdout.length,
  }
}
