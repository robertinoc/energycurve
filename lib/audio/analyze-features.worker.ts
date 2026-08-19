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

import { chromaFromSpectrum, medianChroma } from "./chroma"
import {
  DEFAULT_CHROMA_METHOD,
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
  const { id, channels, sampleRate, chromaMethod } = event.data
  const chromaFrom = chromaMethod ?? DEFAULT_CHROMA_METHOD

  /**
   * A median across frames suppresses percussion — a kick is a spike in a few
   * frames, a played note sustains across most of them — so it pairs with the
   * band limiting rather than being a separate idea. Meyda's path keeps the mean
   * it was measured with, so the A/B compares two whole methods and not a mix.
   */
  const aggregateChroma = (frames: number[][]) =>
    chromaFrom === "banded" ? medianChroma(frames) : averageChroma(frames)
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

          // "banded" builds the profile from the spectrum we already asked for,
          // keeping only the frequencies where a semitone is wider than one FFT
          // bin; "meyda" uses the extractor's own whole-spectrum chroma. See
          // lib/audio/chroma.ts for why the band exists.
          const frameChroma =
            chromaFrom === "banded"
              ? spectrum
                ? chromaFromSpectrum(spectrum, sampleRate, {
                    frameSize: FRAME_SIZE,
                  })
                : null
              : extracted.chroma
                ? Array.from(extracted.chroma)
                : null

          if (frameChroma) {
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
        chromaSegments.push(aggregateChroma(segmentChroma))
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
        chroma: aggregateChroma(allChromaFrames),
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
