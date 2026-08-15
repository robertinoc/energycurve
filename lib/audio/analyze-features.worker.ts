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
import {
  averageChroma,
  downmixToMono,
  mean,
  onsetRate,
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
    const flux: number[] = []
    const entropy: number[] = []
    const chromaFrames: number[][] = []

    let previousFrame: Float32Array | null = null
    let previousSpectrum: Float32Array | null = null

    for (let offset = 0; offset + FRAME_SIZE <= samples.length; offset += HOP_SIZE) {
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

          // Flux needs a predecessor, so the first frame contributes nothing.
          if (previousSpectrum) {
            flux.push(spectralFlux(spectrum, previousSpectrum))
          }
          previousSpectrum = spectrum
        }

        if (extracted.chroma) {
          chromaFrames.push(Array.from(extracted.chroma))
        }
      }

      previousFrame = frame
    }

    const frameRateHz = sampleRate / HOP_SIZE
    const response: WorkerResponse = {
      id,
      ok: true,
      analyzeMs: performance.now() - startedAt,
      features: {
        rmsMean: mean(rms),
        rmsPeak: percentile(rms, 95),
        fluxMean: mean(flux),
        entropyMean: mean(entropy),
        onsetRate: onsetRate(flux, frameRateHz),
        chroma: averageChroma(chromaFrames),
        frameCount: rms.length,
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
