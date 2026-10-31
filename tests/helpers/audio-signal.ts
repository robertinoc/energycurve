/**
 * A reproducible test signal: a few sustained tones, a 120 BPM kick and seeded
 * noise. Not music — just enough spectral and temporal structure that every
 * feature the worker computes is non-trivial, and the same on every machine.
 */
export function deterministicSignal(seconds: number, sampleRate: number) {
  const length = Math.round(seconds * sampleRate)
  const samples = new Float32Array(length)
  const beat = sampleRate / 2
  // Park-Miller: seeded, so the noise is the same bytes on every run.
  let seed = 12_345

  for (let i = 0; i < length; i += 1) {
    seed = (seed * 16_807) % 2_147_483_647
    const noise = (seed / 2_147_483_647 - 0.5) * 0.05
    const t = i / sampleRate
    const sinceBeat = (i % beat) / sampleRate
    const kick =
      Math.sin(2 * Math.PI * 55 * sinceBeat) * Math.exp(-sinceBeat * 18) * 0.6
    const tones =
      0.1 * Math.sin(2 * Math.PI * 220 * t) +
      0.07 * Math.sin(2 * Math.PI * 277.18 * t) +
      0.05 * Math.sin(2 * Math.PI * 329.63 * t)

    samples[i] = kick + tones + noise
  }

  return samples
}
