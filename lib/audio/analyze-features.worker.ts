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
  MAX_HZ,
  MIN_HZ,
  WIDE_FRAME_SIZE,
  WIDE_MIN_HZ,
  chromaFromSpectrum,
  medianChroma,
} from "./chroma"
import {
  BINS_PER_SEMITONE,
  estimateTuningOffset,
  fineChromaFromSpectrum,
  foldFineChroma,
  sumFineChroma,
} from "./tuning"
import {
  DEFAULT_CHROMA_METHOD,
  FRAME_SIZE,
  HOP_SIZE,
  type ChromaMethod,
  type ChromaVariant,
  type WorkerRequest,
  type WorkerResponse,
} from "./analysis-types"
import { HarmonicWindow } from "./hpss"
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

/** The wide pass needs the spectrum and nothing else. */
const WIDE_FEATURES: MeydaAudioFeature[] = ["amplitudeSpectrum"]

type ExtractedFeatures = Partial<MeydaFeaturesObject>

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, channels, sampleRate, chromaMethod } = event.data
  const chromaFrom = chromaMethod ?? DEFAULT_CHROMA_METHOD

  /**
   * Meyda's path keeps the mean it was measured with; the banded ones use a median
   * across frames, which suppresses percussion — a kick is a spike in a few frames,
   * a played note sustains across most of them. Pairing the median with the band
   * limiting is deliberate, so a comparison contrasts whole methods rather than a
   * mix of halves.
   */
  const aggregate = (method: ChromaMethod, frames: number[][]) =>
    method === "meyda" ? averageChroma(frames) : medianChroma(frames)

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
    /**
     * Per-variant accumulators. Every method is built in the same pass because the
     * FFT is already paid for — see the note on WorkerResponse.variants.
     */
    const meydaSegments: number[][] = []
    const meydaFrames: number[][] = []
    const bandedSegments: number[][] = []
    const segmentsHpss: number[][] = []
    const bandedFrames: number[][] = []
    const hpssFrames: number[][] = []
    /** Fine profiles per window, for the tuned variant. */
    const fineSegments: number[][][] = []
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
      const segmentMeyda: number[][] = []
      const segmentBanded: number[][] = []
      const segmentHpss: number[][] = []
      // One window per segment, not per track: the windows are sampled from
      // different points in the file, so carrying frames across a boundary would
      // separate a frame against neighbours that are minutes away from it.
      const harmonicWindow = new HarmonicWindow()
      const segmentFine: number[][] = []
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

          // All three variants from the one spectrum. Meyda's own chroma covers
          // the whole spectrum; ours keeps only the band where a semitone is wider
          // than an FFT bin (lib/audio/chroma.ts); the fine profile is what tuning
          // correction needs before folding (lib/audio/tuning.ts).
          if (extracted.chroma) {
            const frameChroma = Array.from(extracted.chroma)
            segmentMeyda.push(frameChroma)
            meydaFrames.push(frameChroma)
          }

          if (spectrum) {
            const banded = chromaFromSpectrum(spectrum, sampleRate, {
              frameSize: FRAME_SIZE,
            })
            segmentBanded.push(banded)
            bandedFrames.push(banded)

            // Full HPSS: the harmonic part of this frame, separated against a
            // rolling window of its neighbours. Null while the window fills, and
            // at the start of every sampled segment — those frames contribute
            // nothing rather than being separated against mostly themselves,
            // which yields a ~0.5 mask and passes the drums straight through.
            const harmonic = harmonicWindow.push(spectrum)

            if (harmonic) {
              const separated = chromaFromSpectrum(harmonic, sampleRate, {
                frameSize: FRAME_SIZE,
              })
              segmentHpss.push(separated)
              hpssFrames.push(separated)
            }

            segmentFine.push(
              fineChromaFromSpectrum(spectrum, sampleRate, {
                frameSize: FRAME_SIZE,
                minHz: MIN_HZ,
                maxHz: MAX_HZ,
                binsPerSemitone: BINS_PER_SEMITONE,
              })
            )
          }
        }

        previousFrame = frame
      }

      if (segmentFlux.length > 0) {
        fluxSegments.push(segmentFlux)
      }
      if (segmentMeyda.length > 0) {
        meydaSegments.push(aggregate("meyda", segmentMeyda))
      }
      if (segmentHpss.length > 0) {
        segmentsHpss.push(medianChroma(segmentHpss))
      }

      if (segmentBanded.length > 0) {
        bandedSegments.push(aggregate("banded", segmentBanded))
      }
      if (segmentFine.length > 0) {
        fineSegments.push(segmentFine)
      }
    }

    /**
     * Second pass, at a bigger frame, for chroma only.
     *
     * Sequential and self-contained: Meyda's buffer size is a mutable field on its
     * default export, so it's raised here and put back afterwards. That is safe
     * because nothing else runs between — this whole handler is one synchronous
     * body — and it would not be safe the moment any of it became concurrent.
     */
    const wideSegments: number[][] = []
    const wideFrames: number[][] = []

    Meyda.bufferSize = WIDE_FRAME_SIZE

    try {
      for (const { start, end } of windows) {
        const segment: number[][] = []
        let previous: Float32Array | null = null

        for (
          let offset = start;
          offset + WIDE_FRAME_SIZE <= end;
          offset += WIDE_FRAME_SIZE
        ) {
          const frame = samples.subarray(offset, offset + WIDE_FRAME_SIZE)
          const extracted = Meyda.extract(
            WIDE_FEATURES,
            frame,
            previous ?? frame
          ) as ExtractedFeatures | null

          const spectrum = extracted?.amplitudeSpectrum

          if (spectrum) {
            const chroma = chromaFromSpectrum(spectrum, sampleRate, {
              frameSize: WIDE_FRAME_SIZE,
              minHz: WIDE_MIN_HZ,
              maxHz: MAX_HZ,
            })
            segment.push(chroma)
            wideFrames.push(chroma)
          }

          previous = frame
        }

        if (segment.length > 0) {
          wideSegments.push(medianChroma(segment))
        }
      }
    } finally {
      // Restored even if a frame throws: leaving it raised would silently change
      // the energy features on the next track the reused worker analyses.
      Meyda.bufferSize = FRAME_SIZE
    }

    // The tuning offset is estimated from every frame of the track pooled together,
    // then each window is folded with it. Folding per window with a per-window
    // estimate would reintroduce exactly the noise that pooling avoids.
    const pooledFine = sumFineChroma(fineSegments.flat())
    const tuningOffset = estimateTuningOffset(pooledFine, BINS_PER_SEMITONE)
    const tunedSegments = fineSegments.map((segment) =>
      foldFineChroma(sumFineChroma(segment), BINS_PER_SEMITONE, tuningOffset)
    )

    const variants: Record<ChromaMethod, ChromaVariant> = {
      meyda: {
        chroma: aggregate("meyda", meydaFrames),
        chromaSegments: meydaSegments,
      },
      banded: {
        chroma: aggregate("banded", bandedFrames),
        chromaSegments: bandedSegments,
      },
      wide: {
        chroma: medianChroma(wideFrames),
        chromaSegments: wideSegments,
      },
      hpss: {
        // Median-filtered on both axes with a soft mask, then the same band and
        // temporal aggregation as `banded` — so a run comparing the two isolates
        // the separation itself rather than a bundle of changes.
        chroma: medianChroma(hpssFrames),
        chromaSegments: segmentsHpss,
      },
      "banded-tuned": {
        chroma: foldFineChroma(pooledFine, BINS_PER_SEMITONE, tuningOffset),
        chromaSegments: tunedSegments,
      },
    }

    const frameRateHz = sampleRate / HOP_SIZE
    const response: WorkerResponse = {
      id,
      ok: true,
      analyzeMs: performance.now() - startedAt,
      variants,
      features: {
        rmsMean: mean(rms),
        rmsPeak: percentile(rms, 95),
        fluxMean: mean(fluxSegments.flat()),
        entropyMean: mean(entropy),
        onsetRate: onsetRateFromSegments(fluxSegments, frameRateHz),
        // The features still report the selected method's profile, so the table's
        // Key column keeps meaning what the picker says it means.
        chroma: variants[chromaFrom].chroma,
        chromaSegments: variants[chromaFrom].chromaSegments,
        frameCount: rms.length,
        // What the frames actually covered, so a reader of these numbers knows
        // they describe a sample of the track rather than all of it.
        analyzedSeconds: sampleRate > 0 ? (rms.length * HOP_SIZE) / sampleRate : 0,
        tuningOffsetSemitones: tuningOffset,
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
