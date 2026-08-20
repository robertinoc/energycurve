/**
 * Harmonic/percussive separation by median filtering (Fitzgerald, 2010).
 *
 * The half of this that already shipped is the cheap half: `chroma.ts` limits the
 * band and takes a median across *frames*, which suppresses percussion because a
 * kick is a brief broadband spike while a chord persists. That helped nothing —
 * the banded variant measured 14% against a 21% baseline — and it was never the
 * full method. This is the rest of it.
 *
 * The idea in one sentence: in a spectrogram, **harmonic content is a horizontal
 * line and percussive content is a vertical one**. A sustained note occupies the
 * same few bins for many frames; a snare occupies every bin for one frame. So a
 * median along time keeps the horizontal and erases the vertical, a median along
 * frequency does the opposite, and comparing the two says which each bin belongs
 * to.
 *
 * Built as a measurable variant, not as the new default. The last change that
 * sounded obviously right — band-limiting — made the numbers worse, and the one
 * before that (Temperley's profiles) did too. This one waits for a number.
 *
 * Pure and frame-agnostic: it takes magnitudes and returns magnitudes, so it can
 * be tested without an FFT, an AudioContext or a file.
 */

/**
 * Frames of context used by the time-axis median.
 *
 * Must be odd so there's a true centre frame. Seventeen frames at 2048 samples
 * and 44.1 kHz is roughly 0.4 seconds — long enough that a sustained chord
 * survives it and a kick doesn't, short enough that a chord *change* isn't
 * smeared across the boundary. The classic papers use ~0.2 s; the longer window
 * is chosen for electronic music, where a pad can hold under four bars of drums.
 */
export const TIME_MEDIAN_FRAMES = 17

/**
 * Bins of context used by the frequency-axis median.
 *
 * Odd, and deliberately much narrower than the time window: it has to be wide
 * enough to span a percussive smear but narrower than the gap between partials,
 * or it medians away the harmonics it is supposed to protect. At 2048/44.1 kHz a
 * bin is ~21 Hz, so 17 bins is ~360 Hz — comfortably inside the spacing of
 * partials in the band chroma actually reads.
 */
export const FREQ_MEDIAN_BINS = 17

/**
 * Exponent of the soft mask.
 *
 * 1 is a linear split, 2 is the Wiener-style version that pushes each bin harder
 * toward whichever estimate is larger. 2 is the usual choice and the one the
 * original paper settles on: a bin that is 60/40 harmonic comes out 78/22, which
 * is what makes the separation audible rather than a gentle tilt.
 */
export const MASK_POWER = 2

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

/**
 * Median along the frequency axis, within one frame.
 *
 * Edges clamp rather than wrap: bin 0 is DC and the top bin is Nyquist, and
 * wrapping would let the loudest bass in the track vote on the brightest
 * cymbal.
 */
export function frequencyMedian(
  magnitudes: readonly number[],
  bins: number = FREQ_MEDIAN_BINS
): number[] {
  const half = Math.floor(bins / 2)

  return magnitudes.map((_, index) => {
    const window: number[] = []

    for (let offset = -half; offset <= half; offset += 1) {
      const at = Math.min(magnitudes.length - 1, Math.max(0, index + offset))
      window.push(magnitudes[at])
    }

    return median(window)
  })
}

/**
 * Median along the time axis, per bin, across a window of frames.
 *
 * `frames` is the window; the result is the estimate for whichever frame sits at
 * its centre. Frames shorter than the window are handled by the caller passing
 * what it has — a median of five frames is worse than a median of seventeen but
 * still a median, and refusing to run at the start of a track would drop the
 * intro, which on a DJ track is where the key is often clearest.
 */
export function timeMedian(frames: readonly (readonly number[])[]): number[] {
  if (frames.length === 0) {
    return []
  }

  const bins = frames[0].length

  return Array.from({ length: bins }, (_, bin) =>
    median(frames.map((frame) => frame[bin] ?? 0))
  )
}

/**
 * The harmonic part of the centre frame of `frames`.
 *
 * Returns the centre frame's magnitudes scaled by a soft mask, so the output is
 * the same shape and scale as the input and can go straight into the existing
 * chroma path.
 *
 * A bin where both estimates are zero — silence, or above the content — returns
 * zero rather than dividing by zero. Nothing to separate is not an error.
 */
export function harmonicComponent(
  frames: readonly (readonly number[])[],
  options: { maskPower?: number; freqBins?: number } = {}
): number[] {
  if (frames.length === 0) {
    return []
  }

  const centre = frames[Math.floor(frames.length / 2)]
  const power = options.maskPower ?? MASK_POWER

  const harmonicEstimate = timeMedian(frames)
  const percussiveEstimate = frequencyMedian(centre, options.freqBins)

  return centre.map((magnitude, bin) => {
    const h = harmonicEstimate[bin] ** power
    const p = percussiveEstimate[bin] ** power
    const total = h + p

    return total === 0 ? 0 : magnitude * (h / total)
  })
}

/**
 * A rolling window over a stream of frames, so the worker doesn't buffer a whole
 * spectrogram.
 *
 * A three-minute track at 2048/44.1 kHz is ~7,700 frames of 1,024 floats — 31 MB
 * held to compute a median that only ever needs seventeen of them. This keeps the
 * window and forgets the rest, which is what makes the method affordable in a
 * browser worker on a DJ's laptop rather than only in a Python notebook.
 */
export class HarmonicWindow {
  private readonly frames: number[][] = []

  constructor(private readonly size: number = TIME_MEDIAN_FRAMES) {}

  /**
   * Adds a frame and returns the harmonic component of the window's centre, or
   * null while the window is still filling.
   *
   * Null rather than an early estimate: the first frames of a track would
   * otherwise be separated against a window that is mostly themselves, which
   * produces a mask of ~0.5 everywhere and passes the percussion straight
   * through — the one output that looks like it worked and didn't.
   */
  push(magnitudes: ArrayLike<number>): number[] | null {
    // Copied rather than referenced, and widened to ArrayLike because the worker
    // hands us Meyda's Float32Array — which it reuses between frames, so holding
    // the reference would make every frame in the window the same frame.
    this.frames.push(Array.from(magnitudes))

    if (this.frames.length > this.size) {
      this.frames.shift()
    }

    return this.frames.length === this.size
      ? harmonicComponent(this.frames)
      : null
  }
}
