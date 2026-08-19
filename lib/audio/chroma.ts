/**
 * Pitch-class profiles computed from the amplitude spectrum, band-limited to the
 * range where a 2048-point FFT can actually resolve a semitone.
 *
 * ## Why not just use Meyda's chroma
 *
 * Key detection sits at 21% (3/14) against the tags in the owner's library, and
 * swapping the reference profiles moved it *down* (Temperley: 2/14) with **zero
 * overlap** in which tracks each set got right. Two detectors that disagree on
 * every single correct answer are not two detectors of differing quality — they
 * are both reading a profile with very little signal in it. So the profiles were
 * never the problem, and the chroma feeding them is the suspect.
 *
 * There is a concrete mechanism, and it is arithmetic rather than a hunch.
 *
 * At a 2048-sample frame and 44.1 kHz, each FFT bin spans
 * `44100 / 2048 ≈ 21.5 Hz`. The spacing between adjacent semitones at frequency
 * `f` is `f · (2^(1/12) − 1) ≈ 0.0595 · f`. Those are equal at **≈ 362 Hz**:
 *
 * - **Above ~362 Hz** neighbouring semitones land in different bins, so a bin's
 *   magnitude can be attributed to one pitch class.
 * - **Below it** two, three, or more semitones share a single bin. Their energy
 *   cannot be separated, and whichever pitch class the bin's centre rounds to
 *   collects all of it.
 *
 * That lower region is exactly where dance music puts most of its energy: the
 * kick fundamental (~50 Hz), the sub-bass, and the bass line. A chroma computed
 * over the whole spectrum therefore takes the loudest, least pitch-resolvable
 * content in the track and dumps it into essentially arbitrary pitch classes —
 * loud enough to dominate the profile the key detector then correlates against.
 *
 * So this module keeps only `[MIN_HZ, MAX_HZ]`. The floor sits above the
 * resolution limit; the ceiling below the region where partials crowd together
 * and cymbals spread broadband noise across every class.
 *
 * ## Measured, not assumed
 *
 * Shipped alongside Meyda's chroma rather than replacing it, and **not** made the
 * default, for the same reason Temperley wasn't: the last thing that sounded
 * obviously right made the numbers worse. The harness picks the method, so the
 * next run over a real library decides this instead of this comment.
 */

/**
 * Lower edge, in Hz.
 *
 * 362 Hz is where bin width and semitone spacing cross over at the current frame
 * size (see above); 350 is just below the nearest semitone boundary (F4 ≈ 349.2
 * Hz), so the band starts on a note rather than mid-interval.
 */
export const MIN_HZ = 350

/**
 * Upper edge, in Hz. C7 ≈ 2093 Hz. Above this, a note's partials sit closer than
 * the ear's own pitch resolution and hi-hats/cymbals contribute broadband energy
 * that spreads evenly over all twelve classes — dilution, not signal.
 */
export const MAX_HZ = 2100

export interface ChromaOptions {
  /** FFT size the spectrum came from; sets the bin width. */
  frameSize: number
  minHz?: number
  maxHz?: number
}

/**
 * One frame's spectrum → a 12-bin pitch-class profile, index 0 = C.
 *
 * Bins outside the band contribute nothing. Magnitudes are accumulated linearly
 * (not squared) to keep this comparable with Meyda's chroma — the point of the
 * A/B is the band limiting, and a switch to power would be a second change
 * confounding the first.
 */
export function chromaFromSpectrum(
  spectrum: readonly number[] | Float32Array,
  sampleRate: number,
  options: ChromaOptions
): number[] {
  const chroma = new Array<number>(12).fill(0)

  const { frameSize, minHz = MIN_HZ, maxHz = MAX_HZ } = options

  if (
    spectrum.length === 0 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    frameSize <= 0
  ) {
    return chroma
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

    // MIDI note number; 69 is A4 = 440 Hz. Taking it mod 12 lands on the pitch
    // class because MIDI 60 (C4) is a multiple of 12, so C maps to index 0.
    const midi = 69 + 12 * Math.log2(frequency / 440)
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12

    chroma[pitchClass] += magnitude
  }

  return chroma
}

/**
 * Per-class median across frames, instead of a mean.
 *
 * The temporal-median step of Fitzgerald's harmonic/percussive separation, applied
 * at aggregation rather than to the spectrogram. A pitched note sustains, so it is
 * present in most frames and survives a median; a kick, a snare or a rimshot is a
 * brief broadband spike in a few frames, and a median discards it where a mean
 * would carry a share of it into every class.
 *
 * This is *not* full HPSS — there is no median filtering across frequency, and no
 * soft-mask reconstruction. It is the cheap half that needs no spectrogram buffer,
 * which matters when this runs per frame in a worker on a DJ's laptop.
 *
 * Frames whose chroma is entirely zero are skipped rather than counted: silence,
 * lead-in and gaps would otherwise pull every class toward zero equally, which is
 * the flattening `averageChroma` already guards against.
 */
export function medianChroma(frames: readonly (readonly number[])[]): number[] {
  const perClass: number[][] = Array.from({ length: 12 }, () => [])

  for (const frame of frames) {
    if (frame.length !== 12) {
      continue
    }

    let total = 0
    for (const value of frame) {
      if (Number.isFinite(value)) {
        total += value
      }
    }

    if (total <= 0) {
      continue
    }

    for (let bin = 0; bin < 12; bin += 1) {
      const value = frame[bin]
      perClass[bin].push(Number.isFinite(value) ? value : 0)
    }
  }

  return perClass.map((values) => {
    if (values.length === 0) {
      return 0
    }

    const sorted = [...values].sort((left, right) => left - right)
    const middle = Math.floor(sorted.length / 2)

    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle]
  })
}

/**
 * The frequency above which a semitone is wider than one FFT bin — i.e. the
 * lowest frequency at which a chroma bin means anything.
 *
 * Exported so the band floor can be checked against the frame size in a test
 * rather than trusted as a constant that silently goes stale if FRAME_SIZE
 * changes.
 */
export function semitoneResolutionLimitHz(
  sampleRate: number,
  frameSize: number
): number {
  if (sampleRate <= 0 || frameSize <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const binWidth = sampleRate / frameSize
  // f · (2^(1/12) − 1) = binWidth
  return binWidth / (Math.pow(2, 1 / 12) - 1)
}
