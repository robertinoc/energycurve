/**
 * Tuning correction, via a higher-resolution chroma folded down afterwards.
 *
 * ## The problem
 *
 * Mapping a frequency to a pitch class assumes the track is tuned to A = 440 Hz.
 * A lot of dance music isn't. Tracks get pitched to mix, masters drift, samples
 * arrive at whatever tuning their source had, and a vinyl rip inherits the
 * turntable's error.
 *
 * The damage is narrower than it first appears, and worth stating precisely.
 * Because the offset is bounded to ±0.5 semitones, rounding still lands a *pure*
 * tone on the right class: a note 40 cents sharp rounds back down to its own
 * semitone. What detuning actually costs is the **spread**. A note in a real
 * spectrum is not one bin but a peak with skirts, and once the peak sits at +0.4
 * the upper part of that shape rounds up into the neighbouring class. Every note
 * in the track donates a slice of itself to its neighbour, and the profile the key
 * detector correlates against gets flatter — which is exactly the condition under
 * which the wrong mode wins. Correcting shifts the whole shape back so all of it
 * stays home.
 *
 * ## Why a fine chroma rather than a second pass
 *
 * The offset can only be estimated from the whole track — a single frame is far
 * too noisy — but chroma is computed frame by frame in a streaming loop, so the
 * offset isn't known yet when each frame is folded. Estimating per frame and
 * correcting that same frame would be worse than not correcting at all: every
 * frame would shift by a different noisy amount, which smears the profile instead
 * of sharpening it.
 *
 * Re-running the frame loop would double the FFT cost, and the FFT is ~88% of the
 * expense. Buffering every spectrum would cost megabytes.
 *
 * So each frame accumulates into a **fine** chroma — `BINS_PER_SEMITONE` bins per
 * semitone instead of one — which is cheap and streams. The offset is read off the
 * aggregated fine profile at the end, and the fold to twelve applies it. One pass,
 * no buffering, and the estimate sees the whole track. This is the standard
 * approach, not a trick of ours.
 */

/**
 * Bins per semitone in the fine profile. Ten gives 10-cent resolution — finer
 * than the tuning errors worth correcting (usually 10–50 cents) and finer than
 * pitch discrimination matters at in this context.
 */
export const BINS_PER_SEMITONE = 10

/** Total fine bins: twelve semitones at BINS_PER_SEMITONE each. */
export const FINE_BINS = 12 * BINS_PER_SEMITONE

export interface FineChromaOptions {
  frameSize: number
  minHz: number
  maxHz: number
  binsPerSemitone?: number
}

/**
 * One frame's spectrum → a fine pitch-class profile.
 *
 * Same band limiting as the twelve-bin version and for the same reason (see
 * lib/audio/chroma.ts): below the frequency where a semitone is wider than one FFT
 * bin, a bin's magnitude cannot be attributed to a pitch at all — and a finer grid
 * does not create resolution the transform never had.
 */
export function fineChromaFromSpectrum(
  spectrum: readonly number[] | Float32Array,
  sampleRate: number,
  options: FineChromaOptions
): number[] {
  const { frameSize, minHz, maxHz, binsPerSemitone = BINS_PER_SEMITONE } = options
  const total = 12 * binsPerSemitone
  const fine = new Array<number>(total).fill(0)

  if (
    spectrum.length === 0 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    frameSize <= 0 ||
    binsPerSemitone <= 0
  ) {
    return fine
  }

  const binWidth = sampleRate / frameSize

  for (let bin = 1; bin < spectrum.length; bin += 1) {
    const magnitude = spectrum[bin]

    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      continue
    }

    const frequency = bin * binWidth

    if (frequency < minHz || frequency > maxHz) {
      continue
    }

    const midi = 69 + 12 * Math.log2(frequency / 440)
    const index = Math.round(midi * binsPerSemitone)
    fine[((index % total) + total) % total] += magnitude
  }

  return fine
}

/**
 * Estimates how far the track sits from A = 440, in semitones, from an aggregated
 * fine profile. Result is in (-0.5, 0.5].
 *
 * A **circular** mean, not an arithmetic one, because the quantity lives on a
 * circle whose period is one semitone. Two notes measured at -0.48 and +0.48
 * semitones are 4 cents apart, not 96: an arithmetic mean would report 0 —
 * perfectly in tune — for a track that is almost exactly a half-semitone off. The
 * vector mean gets that case right.
 *
 * Each bin is weighted by its magnitude, so loud partials — the ones whose
 * frequency is measured most reliably — dominate.
 */
export function estimateTuningOffset(
  fine: readonly number[],
  binsPerSemitone = BINS_PER_SEMITONE
): number {
  if (fine.length === 0 || binsPerSemitone <= 0) {
    return 0
  }

  let x = 0
  let y = 0

  for (let index = 0; index < fine.length; index += 1) {
    const weight = fine[index]

    if (!Number.isFinite(weight) || weight <= 0) {
      continue
    }

    // Where this bin sits inside its semitone, as an angle over one full turn.
    const angle = (2 * Math.PI * (index % binsPerSemitone)) / binsPerSemitone

    x += weight * Math.cos(angle)
    y += weight * Math.sin(angle)
  }

  if (x === 0 && y === 0) {
    return 0
  }

  // atan2 returns (-π, π], so this is already in (-0.5, 0.5].
  return Math.atan2(y, x) / (2 * Math.PI)
}

/**
 * Folds a fine profile down to twelve bins, shifting by the tuning offset so a
 * detuned track's notes land on the class they were played as.
 *
 * The shift is applied when deciding which class each fine bin belongs to, rather
 * than by rotating a finished twelve-bin profile: rotating can only move energy in
 * whole semitones, which is exactly the resolution this correction exists to work
 * below.
 */
export function foldFineChroma(
  fine: readonly number[],
  binsPerSemitone = BINS_PER_SEMITONE,
  tuningOffsetSemitones = 0
): number[] {
  const chroma = new Array<number>(12).fill(0)

  if (binsPerSemitone <= 0) {
    return chroma
  }

  for (let index = 0; index < fine.length; index += 1) {
    const magnitude = fine[index]

    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      continue
    }

    const semitone = index / binsPerSemitone - tuningOffsetSemitones
    const pitchClass = ((Math.round(semitone) % 12) + 12) % 12

    chroma[pitchClass] += magnitude
  }

  return chroma
}

/** Per-bin sum of several fine profiles, for aggregating across frames. */
export function sumFineChroma(frames: readonly (readonly number[])[]): number[] {
  if (frames.length === 0) {
    return new Array<number>(FINE_BINS).fill(0)
  }

  const total = new Array<number>(frames[0].length).fill(0)

  for (const frame of frames) {
    for (let index = 0; index < total.length && index < frame.length; index += 1) {
      const value = frame[index]
      if (Number.isFinite(value) && value > 0) {
        total[index] += value
      }
    }
  }

  return total
}
