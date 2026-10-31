"use client"

/**
 * Orchestrates one track's analysis in the browser: decode → BPM → framewise
 * features → key. Audio never leaves the machine; only the resulting numbers do.
 *
 * Dependency licensing is a hard constraint here, not a detail. Every
 * batteries-included MIR library we looked at is copyleft (Essentia AGPL-3.0,
 * aubio GPL-3.0) and can't ship in a closed-source commercial product, so this
 * is assembled from MIT parts: `web-audio-beat-detector` for tempo, `meyda` for
 * spectral features, and our own Krumhansl-Schmuckler key detection on top of
 * Meyda's chroma. See docs/spike-browser-audio-analysis.md.
 */

import {
  detectKeyByVote,
  DEFAULT_KEY_PROFILES,
  KEY_PROFILES,
  type KeyProfileSet,
} from "./key-detection"
import { CHROMA_METHODS, DEFAULT_CHROMA_METHOD } from "./analysis-types"
import type {
  AudioFeatures,
  BeatGuess,
  ChromaMethod,
  ChromaVariant,
  TrackAnalysis,
  WorkerRequest,
  WorkerResponse,
} from "./analysis-types"
import type { EnergyEnvelope } from "./energy-envelope"

/**
 * Copies each channel out of the AudioBuffer so it can be transferred.
 *
 * `getChannelData` hands back a view the AudioBuffer still owns, so it can't be
 * transferred as-is. `slice()` is a memcpy the engine runs at native speed —
 * milliseconds for a five-minute track — as opposed to the tens of millions of
 * JavaScript iterations the downmix used to cost right here, on the thread that
 * paints.
 */
function copyChannels(buffer: AudioBuffer): Float32Array[] {
  return Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel).slice()
  )
}

interface ExtractedFeatures {
  features: AudioFeatures
  variants: Record<ChromaMethod, ChromaVariant>
  analyzeMs: number
  envelope?: EnergyEnvelope
  envelopeMs?: number
}

/**
 * One worker, reused across files. Spinning one up per track costs ~10-40ms
 * each and re-parses Meyda every time.
 */
let worker: Worker | null = null
const pending = new Map<
  string,
  {
    resolve: (value: ExtractedFeatures) => void
    reject: (error: Error) => void
  }
>()

function getWorker(): Worker {
  if (worker) {
    return worker
  }

  worker = new Worker(new URL("./analyze-features.worker.ts", import.meta.url), {
    type: "module",
  })

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data
    const entry = pending.get(message.id)
    if (!entry) {
      return
    }

    pending.delete(message.id)
    if (message.ok) {
      entry.resolve({
        features: message.features,
        variants: message.variants,
        analyzeMs: message.analyzeMs,
        envelope: message.envelope,
        envelopeMs: message.envelopeMs,
      })
    } else {
      entry.reject(new Error(message.error))
    }
  }

  worker.onerror = (event) => {
    const error = new Error(event.message || "audio worker crashed")
    for (const entry of pending.values()) {
      entry.reject(error)
    }
    pending.clear()
  }

  return worker
}

/** Releases the shared worker. Call when leaving the screen. */
export function disposeAudioWorker(): void {
  worker?.terminate()
  worker = null
  pending.clear()
}

function extractFeatures(
  channels: Float32Array[],
  sampleRate: number,
  chromaMethod: ChromaMethod,
  envelope: boolean
): Promise<ExtractedFeatures> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const active = getWorker()

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    // The flag is added only when set, so the import's request is byte-for-byte
    // the one it always sent.
    const request: WorkerRequest = envelope
      ? { id, channels, sampleRate, chromaMethod, envelope: true }
      : { id, channels, sampleRate, chromaMethod }
    // Transferred rather than cloned: a 5-minute stereo track is ~100 MB of
    // Float32, and cloning it would cost more than the analysis.
    active.postMessage(
      request,
      channels.map((channel) => channel.buffer)
    )
  })
}

export interface AnalyzeOptions {
  /** Tags already parsed for this file, used only for the accuracy comparison. */
  taggedBpm?: number | null
  taggedKey?: string | null
  /**
   * Which reference key profiles to correlate against. Exposed so the harness can
   * run the same files through both and let the measurement decide, rather than
   * having this choice settled by an assertion in a comment.
   */
  keyProfiles?: KeyProfileSet
  /**
   * How the pitch-class profile is built. Same reasoning as `keyProfiles`: the
   * band-limited method has a mechanism behind it, but so did Temperley's
   * profiles, and those made the numbers worse — so the harness runs both and the
   * measurement decides.
   */
  chromaMethod?: ChromaMethod
  /**
   * CUE points, phase A: also compute the whole-track envelope and run `guess()`
   * for a beat phase. Measurement only — the backstage CUE harness sets it, the
   * import never does, so the import's cost and output don't move.
   */
  cueMeasurement?: boolean
}

/**
 * Analyses one audio file end to end. Never throws — failures land in the
 * returned row's `error` so a bad file can't abort a batch.
 */
export async function analyzeAudioFile(
  file: File,
  options: AnalyzeOptions = {}
): Promise<TrackAnalysis> {
  const base: TrackAnalysis = {
    fileName: file.name,
    fileSizeBytes: file.size,
    durationSeconds: 0,
    decodeMs: 0,
    bpmMs: 0,
    featuresMs: 0,
    totalMs: 0,
    realtimeFactor: 0,
    bpm: null,
    detectedKey: null,
    keyConfidence: null,
    keyMargin: null,
    keyAgreement: null,
    keySegments: null,
    keyByVariant: {},
    features: null,
    taggedBpm: options.taggedBpm ?? null,
    taggedKey: options.taggedKey ?? null,
    error: null,
  }

  const startedAt = performance.now()
  // Opened per call and closed at the end — browsers cap concurrent contexts.
  // Safari only exposes the prefixed constructor.
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioContextCtor) {
    base.error = "Web Audio is unavailable in this browser"
    return base
  }

  const context = new AudioContextCtor()

  try {
    const bytes = await file.arrayBuffer()

    const decodeStart = performance.now()
    const buffer = await context.decodeAudioData(bytes)
    base.decodeMs = performance.now() - decodeStart
    base.durationSeconds = buffer.duration

    // BPM first: it needs the AudioBuffer, which the mono downmix consumes.
    const bpmStart = performance.now()
    try {
      const { analyze } = await import("web-audio-beat-detector")
      base.bpm = await analyze(buffer)
    } catch {
      // Beat detection legitimately fails on ambient/beatless material.
      base.bpm = null
    }
    base.bpmMs = performance.now() - bpmStart

    // `guess()` is the same tempo analysis as `analyze()` plus a beat offset, run
    // as a second, separate call rather than replacing the first: the question is
    // whether its phase is usable, and swapping the BPM source in the same breath
    // would make any BPM regression impossible to attribute.
    let guess: BeatGuess | null = null
    let guessError: string | null = null
    let guessMs = 0
    if (options.cueMeasurement) {
      const guessStart = performance.now()
      try {
        const detector = await import("web-audio-beat-detector")
        const result: { bpm: number; offset: number; tempo?: unknown } =
          await detector.guess(buffer)
        guess = {
          bpm: result.bpm,
          offset: result.offset,
          tempo: typeof result.tempo === "number" ? result.tempo : null,
        }
      } catch (error) {
        guessError = error instanceof Error ? error.message : String(error)
      }
      guessMs = performance.now() - guessStart
    }

    const channels = copyChannels(buffer)
    const { features, variants, analyzeMs, envelope, envelopeMs } =
      await extractFeatures(
        channels,
        buffer.sampleRate,
        options.chromaMethod ?? DEFAULT_CHROMA_METHOD,
        options.cueMeasurement === true
      )
    base.featuresMs = analyzeMs
    base.features = features

    if (options.cueMeasurement && envelope) {
      base.cue = {
        envelope,
        envelopeMs: envelopeMs ?? 0,
        guess,
        guessMs,
        guessError,
      }
    }

    // Each analysed window votes, rather than one average over the whole track
    // deciding alone — the spike's second recommended fix for the 21% accuracy,
    // whose failures were consistently a plausible tonic with the wrong mode.
    // Every combination, from the one frame pass. Six votes over already-computed
    // chroma cost microseconds next to the FFT that produced them, and having them
    // all is what lets a single run answer "which variant is best" — instead of one
    // run per variant, with a human transcribing the results in between.
    for (const method of CHROMA_METHODS) {
      const variant = variants[method]
      const segments =
        variant.chromaSegments.length > 0
          ? variant.chromaSegments
          : [variant.chroma]

      for (const profiles of Object.keys(KEY_PROFILES) as KeyProfileSet[]) {
        base.keyByVariant[`${method}|${profiles}`] =
          detectKeyByVote(segments, profiles)?.key ?? null
      }
    }

    const key = detectKeyByVote(
      features.chromaSegments.length > 0
        ? features.chromaSegments
        : [features.chroma],
      options.keyProfiles ?? DEFAULT_KEY_PROFILES
    )
    if (key) {
      base.detectedKey = key.key
      base.keyConfidence = key.confidence
      base.keyMargin = key.margin
      base.keyAgreement = key.agreement
      base.keySegments = key.segmentsCounted
    }
  } catch (error) {
    base.error = error instanceof Error ? error.message : String(error)
  } finally {
    void context.close()
  }

  base.totalMs = performance.now() - startedAt
  base.realtimeFactor =
    base.totalMs > 0 ? base.durationSeconds / (base.totalMs / 1000) : 0

  return base
}
