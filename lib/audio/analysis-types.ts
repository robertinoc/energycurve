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
  /** Averaged 12-bin pitch-class profile, index 0 = C. */
  chroma: number[]
  /** Frames actually analysed. */
  frameCount: number
  /**
   * Seconds of audio the analysed frames covered — which is less than the track's
   * duration whenever it was sampled in windows (see lib/audio/sample-windows.ts).
   * Present so nobody reads these aggregates as a whole-track measurement when
   * they aren't one.
   */
  analyzedSeconds: number
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
}

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
  features: AudioFeatures | null
  /** From the file's own tags, for an accuracy comparison. */
  taggedBpm: number | null
  taggedKey: string | null
  error: string | null
}
