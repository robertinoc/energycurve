/** Shared types for the browser audio-analysis spike. */

/** Frame size Meyda runs on. Must be a power of two. */
export const FRAME_SIZE = 2048

/**
 * Hop between frames. Equal to the frame size (no overlap): 50% overlap doubles
 * the frame count for a marginal accuracy gain on dance music.
 *
 * Cost is exactly linear in frame count — measured, see
 * docs/spike-browser-audio-analysis.md. Doubling this to 4096 halves analysis
 * time and barely moves flux/entropy/key, but it does shift the onset rate
 * (which is measured per frame), so raising it means recalibrating that first.
 */
export const HOP_SIZE = 2048

export interface AudioFeatures {
  /** Mean RMS across frames, 0…1. Proxy for loudness. */
  rmsMean: number
  /** 95th-percentile RMS — how loud the loud parts actually get. */
  rmsPeak: number
  /** Mean spectral flux: how fast the spectrum changes frame to frame. */
  fluxMean: number
  /** Mean normalised spectral entropy, 0…1. */
  entropyMean: number
  /** Detected onsets per second. */
  onsetRate: number
  /** Averaged 12-bin pitch-class profile over every analysed frame, index 0 = C. */
  chroma: number[]
  /**
   * One averaged chroma per analysed window, so the key detector can let the
   * windows vote rather than trusting a single average of the whole track. A short
   * track analysed whole yields exactly one entry.
   */
  chromaSegments: number[][]
  /** Frames actually analysed. */
  frameCount: number
  /**
   * Seconds of audio the analysed frames covered — which is less than the track's
   * duration whenever it was sampled in windows (see lib/audio/sample-windows.ts).
   * Present so nobody reads these aggregates as a whole-track measurement when
   * they aren't one.
   */
  analyzedSeconds: number
  /**
   * Estimated distance from A = 440, in semitones, on the `banded-tuned` path;
   * 0 on the others because they don't estimate it.
   *
   * Reported so a run can be told apart from a broken estimator: if this is 0.00
   * for every track in a library, the correction isn't measuring anything and any
   * change in accuracy came from somewhere else.
   */
  tuningOffsetSemitones: number
}

export interface WorkerRequest {
  id: string
  /**
   * One Float32Array per channel, transferred.
   *
   * The downmix to mono used to happen on the main thread, and that — not
   * `decodeAudioData` — was the interface freeze the spike measured at 561 ms: a
   * five-minute stereo track is ~26 million accumulate iterations plus 13
   * million divides, in JavaScript, between two paints. Copying each channel is
   * a memcpy the engine does at native speed; the arithmetic belongs here.
   */
  channels: Float32Array[]
  sampleRate: number
  /**
   * How to turn each frame's spectrum into a pitch-class profile. Belongs in the
   * request rather than applied afterwards — unlike the key profiles, which are
   * correlated against an already-computed chroma, this changes how the chroma
   * itself is built, so it has to happen inside the frame loop.
   */
  chromaMethod?: ChromaMethod
}

/**
 * - **meyda** — Meyda's own chroma extractor, over the whole spectrum. What the
 *   21% baseline was measured with.
 * - **banded** — ours: band-limited to where a 2048-point FFT can resolve a
 *   semitone, aggregated with a temporal median. See lib/audio/chroma.ts for the
 *   arithmetic behind the band.
 * - **banded-tuned** — the same band, plus a tuning correction estimated over the
 *   whole track before folding to twelve classes. See lib/audio/tuning.ts. Held
 *   separate from `banded` so a run can tell whether the band helped, whether the
 *   tuning helped, or whether only the two together do.
 */
export const CHROMA_METHODS = ["meyda", "banded", "banded-tuned"] as const

/** Derived from the list so the harness picker and the type can't drift apart. */
export type ChromaMethod = (typeof CHROMA_METHODS)[number]

/**
 * Unchanged on purpose, so the next harness run stays comparable with the 21%
 * baseline. The last change that sounded obviously right — Temperley's profiles —
 * made the numbers worse, so this one waits for a measurement too.
 */
export const DEFAULT_CHROMA_METHOD: ChromaMethod = "meyda"

export type WorkerResponse =
  | { id: string; ok: true; features: AudioFeatures; analyzeMs: number }
  | { id: string; ok: false; error: string }

/** Everything the harness measures for one file. */
export interface TrackAnalysis {
  fileName: string
  fileSizeBytes: number
  durationSeconds: number
  /** Wall-clock for decodeAudioData. */
  decodeMs: number
  /** Wall-clock for BPM detection. */
  bpmMs: number
  /** Wall-clock for the framewise feature pass (inside the worker). */
  featuresMs: number
  /** Total wall-clock for the file, including transfer overhead. */
  totalMs: number
  /** Analysed seconds of audio per second of wall clock. Higher is better. */
  realtimeFactor: number
  bpm: number | null
  detectedKey: string | null
  keyConfidence: number | null
  keyMargin: number | null
  /**
   * Share of analysed windows that voted for the detected key, 0…1.
   *
   * The number to trust over `keyConfidence`: correlation against an averaged
   * chroma reported 0.4–0.85 while getting the mode wrong, whereas three windows
   * that disagree can only report 0.33.
   */
  keyAgreement: number | null
  /** Windows that produced a usable vote. */
  keySegments: number | null
  features: AudioFeatures | null
  /** From the file's own tags, for an accuracy comparison. */
  taggedBpm: number | null
  taggedKey: string | null
  error: string | null
}
