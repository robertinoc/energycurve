/**
 * Synthetic dance tracks with a known answer: where every beat is, where the
 * groove enters, where the drop lands and where the outro starts.
 *
 * Exists because a CUE suggestion has to be judged in milliseconds — a CUE that is
 * 30 ms off flams against the other deck — and nobody's real library comes with
 * ground truth at that resolution. These are not music and say nothing about how
 * the method does on music; they say whether the arithmetic is right and how far
 * off the beat phase is when everything else is ideal. Anything measured on them
 * is labelled synthetic.
 *
 * Pure, deterministic (seeded noise), and free of Web Audio so the same tracks
 * feed the unit tests and the WAV files the browser harness measures.
 */

export type SectionRole = "intro" | "body" | "breakdown" | "drop" | "outro"

export interface SyntheticSection {
  role: SectionRole
  bars: number
  kick: boolean
  /** Off-beat bass: the classic trap for a peak-picking beat tracker. */
  bass: boolean
  hats: boolean
  pad: boolean
}

export interface SyntheticSpec {
  bpm: number
  /** Where beat 0 sits. Audio before it is silence. */
  firstBeatSeconds: number
  sampleRate: number
  sections: SyntheticSection[]
  seed?: number
}

export interface SyntheticTruth {
  bpm: number
  firstBeatSeconds: number
  durationSeconds: number
  /** First beat of the first section with a kick. */
  entrySeconds: number | null
  /** First beat of the section marked `drop`. */
  dropSeconds: number | null
  /** First beat of the section marked `outro`. */
  exitSeconds: number | null
}

export const BEATS_PER_BAR = 4

export function beatSeconds(bpm: number) {
  return 60 / bpm
}

/** Section start times, in seconds, from the spec alone. */
export function syntheticTruth(spec: SyntheticSpec): SyntheticTruth {
  const beat = beatSeconds(spec.bpm)
  let bars = 0
  let entry: number | null = null
  let drop: number | null = null
  let exit: number | null = null

  for (const section of spec.sections) {
    const start = spec.firstBeatSeconds + bars * BEATS_PER_BAR * beat
    if (section.kick && entry === null) entry = start
    if (section.role === "drop" && drop === null) drop = start
    if (section.role === "outro" && exit === null) exit = start
    bars += section.bars
  }

  return {
    bpm: spec.bpm,
    firstBeatSeconds: spec.firstBeatSeconds,
    // One bar of tail so the last kick decays rather than being cut.
    durationSeconds:
      spec.firstBeatSeconds + (bars + 1) * BEATS_PER_BAR * beat,
    entrySeconds: entry,
    dropSeconds: drop,
    exitSeconds: exit,
  }
}

/** Renders the track to mono samples in [-1, 1]. */
export function renderSyntheticTrack(spec: SyntheticSpec): Float32Array {
  const { sampleRate, bpm, firstBeatSeconds } = spec
  const truth = syntheticTruth(spec)
  const out = new Float32Array(Math.ceil(truth.durationSeconds * sampleRate))
  const beat = beatSeconds(bpm)
  let seed = spec.seed ?? 1

  const noise = () => {
    seed = (seed * 16_807) % 2_147_483_647
    return seed / 2_147_483_647 - 0.5
  }

  const add = (startSeconds: number, length: number, fn: (t: number) => number) => {
    const first = Math.round(startSeconds * sampleRate)
    const count = Math.round(length * sampleRate)
    for (let i = 0; i < count; i += 1) {
      const index = first + i
      if (index >= 0 && index < out.length) {
        out[index] += fn(i / sampleRate)
      }
    }
  }

  // Phase-continuous pitch sweep 120 → 45 Hz, the usual synthesised kick.
  const kick = (t: number) => {
    const phase = 2 * Math.PI * (45 * t + (75 / 30) * (1 - Math.exp(-30 * t)))
    return 0.8 * Math.sin(phase) * Math.exp(-t * 9)
  }
  const bass = (t: number) =>
    0.35 *
    (Math.sin(2 * Math.PI * 55 * t) +
      0.5 * Math.sin(2 * Math.PI * 110 * t) +
      0.33 * Math.sin(2 * Math.PI * 165 * t)) *
    Math.exp(-t * 14)

  let bar = 0
  for (const section of spec.sections) {
    const sectionStart = firstBeatSeconds + bar * BEATS_PER_BAR * beat
    const beats = section.bars * BEATS_PER_BAR

    for (let b = 0; b < beats; b += 1) {
      const at = sectionStart + b * beat
      if (section.kick) add(at, 0.3, kick)
      if (section.bass) add(at + beat / 2, 0.18, bass)
      if (section.hats) {
        // A first-difference of white noise is a crude high-pass: hats.
        let previous = 0
        add(at + beat / 2, 0.05, (t) => {
          const value = noise()
          const hp = value - previous
          previous = value
          return 0.25 * hp * Math.exp(-t * 60)
        })
      }
    }

    if (section.pad) {
      const length = beats * beat
      add(sectionStart, length, (t) => {
        const swell = 0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 8)
        const fade = Math.min(1, t / 0.05, (length - t) / 0.05)
        return (
          0.07 *
          swell *
          fade *
          (Math.sin(2 * Math.PI * 220 * t) +
            Math.sin(2 * Math.PI * 261.63 * t) +
            Math.sin(2 * Math.PI * 329.63 * t) +
            0.5 * Math.sin(2 * Math.PI * 440 * t))
        )
      })
    }

    bar += section.bars
  }

  // Leave headroom rather than clip: a clipped kick changes where its peak is.
  let peak = 0
  for (let i = 0; i < out.length; i += 1) peak = Math.max(peak, Math.abs(out[i]))
  if (peak > 0.95) {
    const gain = 0.95 / peak
    for (let i = 0; i < out.length; i += 1) out[i] *= gain
  }

  return out
}

const S = (
  role: SectionRole,
  bars: number,
  parts: Partial<Omit<SyntheticSection, "role" | "bars">>
): SyntheticSection => ({
  role,
  bars,
  kick: false,
  bass: false,
  hats: false,
  pad: false,
  ...parts,
})

/** Beatless intro → groove → breakdown → drop → kick-and-hats outro. */
export function ambientIntroLayout(): SyntheticSection[] {
  return [
    S("intro", 16, { hats: true, pad: true }),
    S("body", 32, { kick: true, bass: true, hats: true, pad: true }),
    S("breakdown", 16, { pad: true }),
    S("drop", 32, { kick: true, bass: true, hats: true, pad: true }),
    S("outro", 16, { kick: true, hats: true }),
  ]
}

/** DJ-tool layout: kick from the first beat, so the entry is beat 0. */
export function kickIntroLayout(): SyntheticSection[] {
  return [
    S("intro", 16, { kick: true, hats: true }),
    S("body", 32, { kick: true, bass: true, hats: true, pad: true }),
    S("breakdown", 16, { pad: true, hats: true }),
    S("drop", 32, { kick: true, bass: true, hats: true, pad: true }),
    S("outro", 16, { kick: true, hats: true }),
  ]
}

/**
 * The set the harness was measured on. Tempos span 122–150 with two
 * non-integer ones, because `guess()` rounds the BPM before extrapolating its grid
 * and a non-integer tempo is exactly where that would show; first-beat offsets are
 * spread across the beat so no single phase is favoured.
 */
export function syntheticCorpus(sampleRate = 44_100) {
  const rows: Array<[number, number, "ambient" | "kick"]> = [
    [122, 0.0, "ambient"],
    [124, 0.137, "kick"],
    [125, 0.311, "ambient"],
    [126, 0.052, "kick"],
    [128, 0.233, "ambient"],
    [128, 0.402, "kick"],
    [130, 0.09, "ambient"],
    [132, 0.27, "kick"],
    [138, 0.19, "ambient"],
    [140, 0.333, "kick"],
    [145, 0.021, "ambient"],
    [150, 0.17, "kick"],
    [124.5, 0.21, "ambient"],
    [127.3, 0.08, "kick"],
  ]

  return rows.map(([bpm, firstBeatSeconds, layout], index) => {
    const spec: SyntheticSpec = {
      bpm,
      firstBeatSeconds,
      sampleRate,
      seed: 1 + index,
      sections: layout === "ambient" ? ambientIntroLayout() : kickIntroLayout(),
    }
    const name = `synthetic-${String(index + 1).padStart(2, "0")}-${bpm}bpm-${layout}`
    return { name, spec, truth: syntheticTruth(spec) }
  })
}
