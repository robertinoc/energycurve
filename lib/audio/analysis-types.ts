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
}

export interface WorkerRequest {
  id: string
  samples: Float32Array
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
