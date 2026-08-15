/**
 * Aggregation helpers for the per-frame numbers Meyda produces, plus the one
 * feature Meyda doesn't ship (spectral entropy).
 *
 * These are the inputs Energy Model v3 is specified against: tempo, RMS
 * loudness, spectral flux, spectral entropy, and onset rate. Keeping them pure
 * means they're unit-testable without decoding any audio.
 */

/** Shannon entropy of a power spectrum, normalised to 0…1.
 *
 * Interpreted as "how evenly is energy spread across the spectrum": a pure tone
 * approaches 0, broadband noise approaches 1. Paired with spectral flux this is
 * the strongest published predictor of perceived arousal. */
export function spectralEntropy(
  powerSpectrum: readonly number[] | Float32Array
): number {
  const bins = powerSpectrum.length
  if (bins < 2) {
    return 0
  }

  let total = 0
  for (let i = 0; i < bins; i += 1) {
    const value = powerSpectrum[i]
    if (Number.isFinite(value) && value > 0) {
      total += value
    }
  }

  if (total <= 0) {
    return 0
  }

  let entropy = 0
  for (let i = 0; i < bins; i += 1) {
    const value = powerSpectrum[i]
    if (Number.isFinite(value) && value > 0) {
      const p = value / total
      entropy -= p * Math.log2(p)
    }
  }

  // log2(bins) is the entropy of a perfectly flat spectrum — the maximum.
  return entropy / Math.log2(bins)
}

/**
 * Spectral flux between two consecutive magnitude spectra: the half-wave
 * rectified sum of bin-to-bin increases, normalised by bin count so the value
 * is comparable across frame sizes.
 *
 * Implemented here because Meyda 5.6.3's own `spectralFlux` extractor is broken
 * two ways: it assigns to an undeclared `x` (a ReferenceError under ES modules,
 * which are always strict mode), and its loop starts at a negative index, so
 * half its reads are `undefined` and the result is NaN. Meyda's source carries a
 * "major issues with it" note above the function. Flux is the single most
 * important input to Energy Model v3, so it can't be left to a broken upstream.
 */
export function spectralFlux(
  spectrum: readonly number[] | Float32Array,
  previousSpectrum: readonly number[] | Float32Array
): number {
  const bins = Math.min(spectrum.length, previousSpectrum.length)
  if (bins === 0) {
    return 0
  }

  let flux = 0
  for (let i = 0; i < bins; i += 1) {
    const current = spectrum[i]
    const previous = previousSpectrum[i]
    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
      continue
    }

    const rise = current - previous
    if (rise > 0) {
      flux += rise
    }
  }

  return flux / bins
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }

  let sum = 0
  for (const value of values) {
    sum += value
  }
  return sum / values.length
}

/** Percentile via nearest-rank on a copy (input order is preserved). */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((p / 100) * (sorted.length - 1)))
  )
  return sorted[rank]
}

/**
 * Onset rate in onsets per second, from a spectral-flux envelope.
 *
 * Counts local peaks that clear an adaptive threshold (mean + k·stddev of the
 * envelope), which is the standard cheap onset detector. `k` trades recall for
 * precision; 1.5 is a middling default that behaves on dance music, where
 * onsets are strong and regular.
 */
export function onsetRate(
  flux: readonly number[],
  frameRateHz: number,
  sensitivity = 1.5
): number {
  if (flux.length < 3 || frameRateHz <= 0) {
    return 0
  }

  const average = mean(flux)
  const variance = mean(flux.map((value) => (value - average) ** 2))
  const threshold = average + sensitivity * Math.sqrt(variance)

  let onsets = 0
  for (let i = 1; i < flux.length - 1; i += 1) {
    const value = flux[i]
    if (value > threshold && value >= flux[i - 1] && value > flux[i + 1]) {
      onsets += 1
    }
  }

  const seconds = flux.length / frameRateHz
  return seconds > 0 ? onsets / seconds : 0
}

/**
 * Averages per-frame chroma vectors into one 12-bin pitch-class profile.
 *
 * Frames whose chroma is all-zero (silence, lead-in, gaps) are skipped rather
 * than averaged in — including them drags every bin toward zero equally, which
 * flattens the profile the key detector depends on.
 */
export function averageChroma(frames: readonly (readonly number[])[]): number[] {
  const totals = new Array<number>(12).fill(0)
  let counted = 0

  for (const frame of frames) {
    if (frame.length !== 12) {
      continue
    }

    let frameTotal = 0
    for (const value of frame) {
      if (Number.isFinite(value)) {
        frameTotal += value
      }
    }

    if (frameTotal <= 0) {
      continue
    }

    for (let bin = 0; bin < 12; bin += 1) {
      const value = frame[bin]
      totals[bin] += Number.isFinite(value) ? value : 0
    }
    counted += 1
  }

  if (counted === 0) {
    return totals
  }

  return totals.map((total) => total / counted)
}

/**
 * Averages channels into one mono buffer, **mutating the first array in place**.
 *
 * In place because the caller is the audio worker and the arrays arrived by
 * transfer: nobody else can observe them, and allocating a second 50 MB buffer
 * to avoid a mutation nobody can see would be the more expensive mistake.
 * Calling this with arrays you still hold a reference to will corrupt them.
 *
 * Mono costs nothing in accuracy for the features here and halves the frame
 * loop. This is also the work that used to run on the main thread and froze the
 * interface for half a second — see docs/spike-browser-audio-analysis.md.
 */
export function downmixToMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) {
    return new Float32Array(0)
  }

  const mono = channels[0]

  if (channels.length === 1) {
    return mono
  }

  for (let channel = 1; channel < channels.length; channel += 1) {
    const data = channels[channel]
    // Shorter channels would read undefined past their end; the spec says every
    // channel of an AudioBuffer has the same length, but a caller isn't the spec.
    const shared = Math.min(mono.length, data.length)

    for (let i = 0; i < shared; i += 1) {
      mono[i] += data[i]
    }
  }

  for (let i = 0; i < mono.length; i += 1) {
    mono[i] /= channels.length
  }

  return mono
}
