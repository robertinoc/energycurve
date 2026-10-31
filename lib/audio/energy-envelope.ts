/**
 * A whole-track energy envelope: what CUE-point suggestions (phase A, a
 * measurement) are derived from.
 *
 * The feature pass deliberately looks at three 30-second windows and keeps only
 * aggregates (lib/audio/sample-windows.ts), so no time axis survives it. Placing a
 * CUE needs the opposite: every second of the track, and nothing else. So this
 * runs over the whole track, but in the time domain — a squared-sum per block and
 * a low-pass biquad — rather than through the FFT. The FFT is what the spike
 * measured as the cost of analysis; this pass needs none of it, so its cost is a
 * few multiply-adds per sample instead of a 2048-point transform per frame.
 *
 * Two bands, because they answer different questions on dance music:
 *
 * - **low** (below ~150 Hz) is the kick and the bass. Whether it is present is
 *   what separates a beatless intro or a breakdown from the groove, which is what
 *   the entry and the drop are about.
 * - **full** is everything, and is what the outro shows up in: elements leave
 *   while the kick usually stays.
 *
 * Kept pure and separate from the worker so it is unit-testable without one.
 */

/** One envelope point every half second: a six-minute track is ~720 numbers. */
export const ENVELOPE_SECONDS = 0.5

/**
 * The fine resolution. Half a second is a whole beat at 120 BPM, which places a
 * section to within a beat but cannot say which beat; 10 ms can, and is only ever
 * read around a candidate, never drawn.
 */
export const FINE_ENVELOPE_SECONDS = 0.01

/** Where the low band ends. Kick fundamentals and sub-bass sit under it. */
export const LOW_BAND_HZ = 150

export interface EnergyEnvelope {
  /** Seconds between consecutive points of `full` and `low`. */
  secondsPerPoint: number
  /** RMS of the whole signal per point. */
  full: number[]
  /** RMS of the signal below LOW_BAND_HZ per point. */
  low: number[]
  /** Seconds between consecutive points of `lowFine`. */
  fineSecondsPerPoint: number
  /** RMS of the low band at FINE_ENVELOPE_SECONDS resolution. */
  lowFine: number[]
  /** RMS of the whole signal at FINE_ENVELOPE_SECONDS resolution. */
  fullFine: number[]
}

export interface EnvelopeOptions {
  seconds?: number
  fineSeconds?: number
  lowBandHz?: number
}

interface Biquad {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

/** RBJ cookbook low-pass, Butterworth Q. */
export function lowPassCoefficients(cutoffHz: number, sampleRate: number): Biquad {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2)
  const a0 = 1 + alpha

  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  }
}

const empty = (secondsPerPoint: number, fineSecondsPerPoint: number) => ({
  secondsPerPoint,
  full: [],
  low: [],
  fineSecondsPerPoint,
  lowFine: [],
  fullFine: [],
})

/**
 * Computes the envelope in a single pass over `samples` (mono).
 *
 * The coarse hop is an exact multiple of the fine one, so coarse point `i` and
 * fine points `i·k … i·k+k−1` describe the same audio — a candidate found on the
 * coarse envelope can be refined on the fine one without an off-by-a-fraction.
 * A partial block at the end is kept, measured over the samples it has.
 */
export function computeEnergyEnvelope(
  samples: Float32Array,
  sampleRate: number,
  options: EnvelopeOptions = {}
): EnergyEnvelope {
  const {
    seconds = ENVELOPE_SECONDS,
    fineSeconds = FINE_ENVELOPE_SECONDS,
    lowBandHz = LOW_BAND_HZ,
  } = options

  if (!(sampleRate > 0) || !(seconds > 0) || !(fineSeconds > 0)) {
    return empty(seconds, fineSeconds)
  }

  const fineHop = Math.max(1, Math.round(fineSeconds * sampleRate))
  const ratio = Math.max(1, Math.round(seconds / (fineHop / sampleRate)))
  const coarseHop = fineHop * ratio

  const result: EnergyEnvelope = empty(
    coarseHop / sampleRate,
    fineHop / sampleRate
  )

  if (samples.length === 0) {
    return result
  }

  // Two cascaded sections: 24 dB/octave keeps a 1 kHz synth out of the "kick"
  // band, which a single 12 dB/octave section does not.
  const { b0, b1, b2, a1, a2 } = lowPassCoefficients(
    Math.min(lowBandHz, sampleRate * 0.45),
    sampleRate
  )
  // Direct form I state: inputs and outputs of each section, one and two samples
  // back.
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  let w1 = 0
  let w2 = 0

  let fullSum = 0
  let lowSum = 0
  let fineSum = 0
  let fineFullSum = 0
  let inFine = 0
  let inCoarse = 0

  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i]
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    // Second section, fed by the first: its inputs are the first one's outputs.
    const w = b0 * y + b1 * y1 + b2 * y2 - a1 * w1 - a2 * w2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    w2 = w1
    w1 = w

    fullSum += x * x
    lowSum += w * w
    fineSum += w * w
    fineFullSum += x * x
    inFine += 1
    inCoarse += 1

    if (inFine === fineHop) {
      result.lowFine.push(Math.sqrt(fineSum / inFine))
      result.fullFine.push(Math.sqrt(fineFullSum / inFine))
      fineSum = 0
      fineFullSum = 0
      inFine = 0
    }
    if (inCoarse === coarseHop) {
      result.full.push(Math.sqrt(fullSum / inCoarse))
      result.low.push(Math.sqrt(lowSum / inCoarse))
      fullSum = 0
      lowSum = 0
      inCoarse = 0
    }
  }

  if (inFine > 0) {
    result.lowFine.push(Math.sqrt(fineSum / inFine))
    result.fullFine.push(Math.sqrt(fineFullSum / inFine))
  }
  if (inCoarse > 0) {
    result.full.push(Math.sqrt(fullSum / inCoarse))
    result.low.push(Math.sqrt(lowSum / inCoarse))
  }

  return result
}
