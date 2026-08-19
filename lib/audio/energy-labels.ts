/**
 * Energy ratings a listener gives a track by ear, paired with the track's measured
 * features. The training set Energy Model v3 needs and does not otherwise have.
 *
 * ## Why by ear, and why that isn't a compromise
 *
 * The v3 plan assumed calibrating against the 1–10 energy values Mixed In Key
 * writes into tags — "a labelled dataset we already own". We don't. The owner has
 * never used Mixed In Key, so that corpus does not exist and will not appear, and
 * the task was permanently blocked as written.
 *
 * A DJ rating their own tracks is not a lesser substitute. The quantity the model
 * is trying to predict is *arousal* — how activating the music feels — which is a
 * perceptual construct with no physical instrument to read it off. Mixed In Key's
 * numbers are themselves a heuristic somebody chose; they are a convenient
 * reference, not a ground truth. A working DJ rating tracks from the genre they
 * actually play is a defensible source of labels, and arguably a better-matched one
 * than a general-purpose tool calibrated on everything.
 *
 * ## Why localStorage
 *
 * Labelling is a private, iterative chore done in one sitting on one machine, and
 * the audio never leaves that machine by design. Persisting to the server would
 * mean a table, an endpoint and an auth story for data that only has to survive an
 * accidental reload. It exports as JSON when there's enough of it to fit.
 */

import {
  TRACK_FEATURES_VERSION,
  parseTrackAudioFeatures,
  type TrackAudioFeatures,
} from "./track-features"

const STORAGE_KEY = "energycurve:energy-labels"

/** Rating scale, matching the energy score the product already shows. */
export const ENERGY_LABEL_MIN = 1
export const ENERGY_LABEL_MAX = 10

/**
 * Stops the store growing without bound in a browser the user can't easily
 * inspect. Far above any realistic labelling session — a few hundred tracks is
 * already more than one sitting.
 */
export const MAX_LABELS = 2000

export interface EnergyLabel {
  /** Stable-ish identity for the audio file this rating belongs to. */
  clip: string
  /** File name at the time of rating, for reading the export back. */
  fileName: string
  /** The listener's rating, 1–10. */
  label: number
  /** What the analysis measured for this same file. */
  features: TrackAudioFeatures
  /** ISO timestamp, so a later re-rating can be told from the original. */
  at: string
}

/**
 * Identity for a picked file.
 *
 * Name plus byte size, the same pair the import path already dedupes on. A full
 * path would be better but browsers don't expose one, and a content hash would
 * mean reading every byte of every file — minutes of work to save a rating.
 *
 * The trade is explicit: two different files with the same name and the exact same
 * size collide, and re-encoding a track changes its size so its old rating is
 * orphaned. Both are acceptable for a labelling set that a human is curating.
 */
export function clipKey(fileName: string, fileSizeBytes: number): string {
  return `${fileName}::${fileSizeBytes}`
}

/** Narrows an unknown value — a stored entry, or a pasted export — to a label. */
export function parseEnergyLabel(input: unknown): EnergyLabel | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null
  }

  const raw = input as Record<string, unknown>

  if (typeof raw.clip !== "string" || raw.clip.length === 0) {
    return null
  }

  if (typeof raw.fileName !== "string") {
    return null
  }

  const label = typeof raw.label === "number" ? raw.label : Number.NaN

  if (
    !Number.isInteger(label) ||
    label < ENERGY_LABEL_MIN ||
    label > ENERGY_LABEL_MAX
  ) {
    return null
  }

  // All-or-nothing, for the same reason it is in track-features: a label paired
  // with half a feature vector would train a coefficient on evidence that isn't
  // there.
  const features = parseTrackAudioFeatures(raw.features)

  if (!features) {
    return null
  }

  return {
    clip: raw.clip,
    fileName: raw.fileName,
    label,
    features,
    at: typeof raw.at === "string" ? raw.at : "",
  }
}

/** Every stored label, keyed by clip. Unreadable entries are dropped, not thrown. */
export function readEnergyLabels(): Record<string, EnergyLabel> {
  if (typeof window === "undefined") {
    return {}
  }

  let parsed: unknown

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return {}
    }
    parsed = JSON.parse(stored)
  } catch {
    // Corrupt JSON or a private-browsing mode that throws on access. Starting
    // over beats crashing the panel the labels are entered from.
    return {}
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {}
  }

  const labels: Record<string, EnergyLabel> = {}

  for (const value of Object.values(parsed as Record<string, unknown>)) {
    const label = parseEnergyLabel(value)
    if (label) {
      labels[label.clip] = label
    }
  }

  return labels
}

function persist(labels: Record<string, EnergyLabel>): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(labels))
  } catch {
    // Quota or private mode. Losing a rating is survivable; throwing mid-session,
    // and taking the ratings already entered with it, is not.
  }
}

/**
 * Records a rating, replacing any previous one for the same clip.
 *
 * Re-rating on purpose: a listener who changes their mind on a second pass is
 * giving a better label, not a conflicting one. The features are re-stamped too,
 * so a clip rated before an extraction change carries the numbers it was actually
 * rated against.
 */
export function writeEnergyLabel(
  entry: Omit<EnergyLabel, "at">,
  now: string
): Record<string, EnergyLabel> {
  const labels = readEnergyLabels()

  const isNew = !(entry.clip in labels)

  if (isNew && Object.keys(labels).length >= MAX_LABELS) {
    return labels
  }

  labels[entry.clip] = { ...entry, at: now }
  persist(labels)

  return labels
}

export function removeEnergyLabel(clip: string): Record<string, EnergyLabel> {
  const labels = readEnergyLabels()
  delete labels[clip]
  persist(labels)
  return labels
}

export interface LabelSetSummary {
  total: number
  /** Labels whose features came from the current extraction version. */
  usable: number
  /** How many of the ten rating values have at least one example. */
  coveredRatings: number
  /** Ratings with no example yet, ascending — what to go and find next. */
  missingRatings: number[]
}

/**
 * What the label set looks like as training data.
 *
 * `coveredRatings` matters more than `total`: fifty tracks all rated 7 or 8 fit a
 * model that can only predict 7 or 8. Surfacing which ratings are missing turns
 * "label more tracks" into "go and find a 2 and a 10".
 */
export function summarizeEnergyLabels(
  labels: Record<string, EnergyLabel>
): LabelSetSummary {
  const values = Object.values(labels)
  const seen = new Set<number>()

  let usable = 0

  for (const entry of values) {
    if (entry.features.version === TRACK_FEATURES_VERSION) {
      usable += 1
      seen.add(entry.label)
    }
  }

  const missingRatings: number[] = []
  for (let rating = ENERGY_LABEL_MIN; rating <= ENERGY_LABEL_MAX; rating += 1) {
    if (!seen.has(rating)) {
      missingRatings.push(rating)
    }
  }

  return {
    total: values.length,
    usable,
    coveredRatings: seen.size,
    missingRatings,
  }
}

/**
 * The label set as a JSON document, ready to be handed to whatever fits the model.
 *
 * Includes the extraction version at the top level as well as per entry: a fit run
 * against a mix of versions would attribute a change in measurement method to a
 * change in the music, and this is the first thing such a run should check.
 */
export function exportEnergyLabels(
  labels: Record<string, EnergyLabel>
): string {
  const entries = Object.values(labels).sort((left, right) =>
    left.fileName.localeCompare(right.fileName)
  )

  return JSON.stringify(
    {
      kind: "energycurve.energy-labels",
      featuresVersion: TRACK_FEATURES_VERSION,
      count: entries.length,
      summary: summarizeEnergyLabels(labels),
      entries,
    },
    null,
    2
  )
}
