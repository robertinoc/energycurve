/// <reference lib="webworker" />

/**
 * Framewise feature extraction, off the main thread.
 *
 * Decoding has to happen on the main thread (`decodeAudioData` isn't available
 * to workers), but the framewise DSP loop is the part that would otherwise
 * freeze the UI for seconds at a time — so the decoded samples are transferred
 * here and the loop runs in isolation.
 */

import Meyda, { type MeydaAudioFeature, type MeydaFeaturesObject } from "meyda"

import {
  FRAME_SIZE,
  HOP_SIZE,
  type WorkerRequest,
  type WorkerResponse,
} from "./analysis-types"
import { planSampleWindows } from "./sample-windows"
import {
  averageChroma,
  downmixToMono,
  mean,
  onsetRateFromSegments,
  percentile,
  spectralEntropy,
  spectralFlux,
} from "./spectral-features"

// Meyda is configured through mutable fields on its default export rather than
// per-call options (their API predates esmodules).
Meyda.bufferSize = FRAME_SIZE

/**
 * Note the absence of "spectralFlux": Meyda 5.6.3 ships that extractor broken
 * (undeclared variable + negative loop start — see spectral-features.ts), so we
 * request the amplitude spectrum and compute flux ourselves.
 */
const FEATURES: MeydaAudioFeature[] = ["rms", "amplitudeSpectrum", "chroma"]

type ExtractedFeatures = Partial<MeydaFeaturesObject>

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, channels, sampleRate } = event.data
  const startedAt = performance.now()

  try {
    const samples = downmixToMono(channels)

    Meyda.sampleRate = sampleRate

    const rms: number[] = []
    const entropy: number[] = []
    /**
     * One averaged chroma per window, so the key detector can let the windows vote
     * instead of reading a single average of the whole track — see
     * detectKeyByVote. The whole-track average is still reported alongside it.
     */
    const chromaSegments: number[][] = []
    const allChromaFrames: number[][] = []
    /**
     * One flux envelope per window, never one concatenated array: flux is defined
     * between consecutive frames, and a seam between two windows would compare
     * audio a minute apart. See onsetRateFromSegments.
     */
    const fluxSegments: number[][] = []

    // Only part of the track is examined — see lib/audio/sample-windows.ts for
    // why three centred windows, and why short tracks still run whole.
    const windows = planSampleWindows(samples.length, sampleRate)

    for (const { start, end } of windows) {
      const segmentFlux: number[] = []
      const segmentChroma: number[][] = []
      // Reset per window: the first frame after a jump has no valid predecessor.
      let previousFrame: Float32Array | null = null
      let previousSpectrum: Float32Array | null = null

      for (let offset = start; offset + FRAME_SIZE <= end; offset += HOP_SIZE) {
        const frame = samples.subarray(offset, offset + FRAME_SIZE)

        const extracted = Meyda.extract(
          FEATURES,
          frame,
          previousFrame ?? frame
        ) as ExtractedFeatures | null

        if (extracted) {
          if (typeof extracted.rms === "number") {
            rms.push(extracted.rms)
          }

          const spectrum = extracted.amplitudeSpectrum
          if (spectrum) {
            // Power = amplitude², which is what entropy is defined over.
            entropy.push(spectralEntropy(spectrum.map((value) => value * value)))

            // Flux needs a predecessor, so each window's first frame contributes
            // nothing.
            if (previousSpectrum) {
              segmentFlux.push(spectralFlux(spectrum, previousSpectrum))
            }
            previousSpectrum = spectrum
          }

          if (extracted.chroma) {
            const frameChroma = Array.from(extracted.chroma)
            // Kept twice on purpose: per window for the vote, and pooled for the
            // whole-track average the Energy Model features still read.
            segmentChroma.push(frameChroma)
            allChromaFrames.push(frameChroma)
          }
        }

        previousFrame = frame
      }

      if (segmentFlux.length > 0) {
        fluxSegments.push(segmentFlux)
      }
      if (segmentChroma.length > 0) {
        chromaSegments.push(averageChroma(segmentChroma))
      }
    }

    const frameRateHz = sampleRate / HOP_SIZE
    const response: WorkerResponse = {
      id,
      ok: true,
      analyzeMs: performance.now() - startedAt,
      features: {
        rmsMean: mean(rms),
        rmsPeak: percentile(rms, 95),
        fluxMean: mean(fluxSegments.flat()),
        entropyMean: mean(entropy),
        onsetRate: onsetRateFromSegments(fluxSegments, frameRateHz),
        chroma: averageChroma(allChromaFrames),
        chromaSegments,
        frameCount: rms.length,
        // What the frames actually covered, so a reader of these numbers knows
        // they describe a sample of the track rather than all of it.
        analyzedSeconds: sampleRate > 0 ? (rms.length * HOP_SIZE) / sampleRate : 0,
      },
    }

    self.postMessage(response)
  } catch (error) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}
