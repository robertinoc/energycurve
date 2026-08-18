/**
 * Which parts of a track the framewise pass actually looks at.
 *
 * The spike measured the per-frame FFT as ~88% of a track's analysis cost, and
 * measured that cost as exactly linear in frames analysed: doubling the hop
 * halved the time, with frame counts halving exactly (4 708 → 2 354). So the
 * lever for speed is "analyse less audio", and the arithmetic is predictable
 * rather than hopeful — 40 tracks took 1 m 32 s whole-track; three 30-second
 * windows is roughly a third of that.
 *
 * Sampling excerpts is not a shortcut peculiar to us: it's how excerpt-based MIR
 * evaluation is normally done. What matters is *where* the excerpts land. A DJ
 * track opens with an intro that is often beatless and quiet and closes with an
 * outro that is the same, and both misrepresent the track. Tiling the track into
 * equal parts and reading the centre of each part is the unbiased choice: it
 * never lands on either edge, and it spreads coverage instead of trusting one
 * spot to stand for the whole track.
 *
 * Kept pure and separate from the worker so the placement is unit-testable
 * without decoding a single byte of audio.
 */

import { FRAME_SIZE, HOP_SIZE } from "./analysis-types"

/** Half-open sample range, `[start, end)`. */
export interface SampleWindow {
  start: number
  end: number
}

export interface SampleWindowOptions {
  /** How many windows to spread across the track. */
  windowCount?: number
  /** Length of each window, in seconds. */
  windowSeconds?: number
  frameSize?: number
  hopSize?: number
}

/** Windows per track. Three keeps intro/body/outro-ish coverage at ~3× speed. */
export const SAMPLE_WINDOW_COUNT = 3

/**
 * Seconds per window. 30 s is ~1 300 frames at the current hop — far more than
 * the aggregates need to be stable, and long enough to span several bars at any
 * dance tempo, so a window can't land entirely inside one breakdown.
 */
export const SAMPLE_WINDOW_SECONDS = 30

/**
 * Places `windowCount` windows of `windowSeconds` each at the centre of equal
 * divisions of the track.
 *
 * Returns one full-span window when sampling wouldn't pay: if the windows would
 * cover the whole track anyway, splitting the loop just adds bookkeeping and
 * costs the same. That makes short tracks — anything under
 * `windowCount × windowSeconds`, so 90 s by default — analysed whole, which is
 * both faster to reason about and strictly more accurate.
 *
 * Returns `[]` when there isn't enough audio for a single frame.
 */
export function planSampleWindows(
  totalSamples: number,
  sampleRate: number,
  options: SampleWindowOptions = {}
): SampleWindow[] {
  const {
    windowCount = SAMPLE_WINDOW_COUNT,
    windowSeconds = SAMPLE_WINDOW_SECONDS,
    frameSize = FRAME_SIZE,
    hopSize = HOP_SIZE,
  } = options

  if (
    !Number.isFinite(totalSamples) ||
    !Number.isFinite(sampleRate) ||
    totalSamples < frameSize ||
    sampleRate <= 0 ||
    hopSize <= 0
  ) {
    return []
  }

  const fullSpan: SampleWindow[] = [{ start: 0, end: totalSamples }]

  if (windowCount < 1 || windowSeconds <= 0) {
    return fullSpan
  }

  const windowSamples = Math.round(windowSeconds * sampleRate)

  // Two frames minimum: spectral flux is defined between consecutive spectra, so
  // a one-frame window would contribute a spectrum and no flux at all.
  if (windowSamples < frameSize + hopSize) {
    return fullSpan
  }

  if (windowCount * windowSamples >= totalSamples) {
    return fullSpan
  }

  const division = totalSamples / windowCount

  return Array.from({ length: windowCount }, (_, index) => {
    const centre = division * (index + 0.5)

    // Aligning the start to a hop boundary makes the frame grid — and therefore
    // every aggregate — identical across runs, instead of depending on where
    // rounding happened to put the window.
    const rawStart = centre - windowSamples / 2
    const aligned = Math.floor(rawStart / hopSize) * hopSize

    // Clamping is defensive only. The guard above means
    // windowSamples < totalSamples / windowCount = division, and each centre sits
    // at least division/2 from both ends, so no window can reach past either.
    const start = Math.min(
      Math.max(0, aligned),
      Math.max(0, totalSamples - windowSamples)
    )

    return { start, end: Math.min(totalSamples, start + windowSamples) }
  })
}

/**
 * Frames the loop will run for a plan — i.e. what the analysis will cost.
 *
 * Exists so the speed claim is checkable in a test rather than only observable
 * with a stopwatch: cost is linear in this number, so asserting it fell by ~3×
 * is asserting the optimisation works.
 */
export function countPlannedFrames(
  windows: readonly SampleWindow[],
  frameSize = FRAME_SIZE,
  hopSize = HOP_SIZE
): number {
  if (hopSize <= 0) {
    return 0
  }

  let frames = 0
  for (const { start, end } of windows) {
    const span = end - start
    if (span >= frameSize) {
      frames += Math.floor((span - frameSize) / hopSize) + 1
    }
  }
  return frames
}
