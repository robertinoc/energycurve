import { analyzePlaylist } from "@/lib/engine/analysis"
import type {
  DetectedIssue,
  IssueSeverity,
  IssueType,
  ResolvedTrackEnergy,
} from "@/types/analysis"
import type {
  PlaylistContext,
  SupportedGenre,
} from "@/lib/product/strategy"

/**
 * Actionable fixes for the analysis screen redesign ("one problem = one
 * action = one button"). Each engine issue is translated into a SetFix with
 * CONCRETE, deterministic reorder operations. The view never mutates a
 * tracklist: it derives the current order from the original order + the
 * operations of every applied fix (in fix order), so apply/undo is exact.
 *
 * Everything here is pure — no React, no engine mutation — so the score
 * arithmetic ("+X.X recoverable", "you can reach Y") comes from the SAME
 * scoring engine that produced the base score, never from front-end math.
 */

/** One concrete list move: take `trackId` and re-insert it at `toIndex`
 * (0-based, evaluated against the list state at application time). */
export interface FixOperation {
  trackId: string
  toIndex: number
}

export interface FixTrackRef {
  id: string
  /** 1-based position in the ORIGINAL order (chip labels). */
  position: number
}

export interface SetFix {
  /** Stable id: issue type + involved positions. */
  id: string
  issueType: IssueType
  severity: IssueSeverity
  /** 1-based position of the curve marker (the track that anchors the issue). */
  markerPosition: number
  /** Tracks involved, for chips in the panel. */
  tracks: FixTrackRef[]
  /** Energy delta carried by drop/spike/breather issues (label detail). */
  delta: number | null
  /**
   * Score gain when ONLY this fix is applied to the original order, measured
   * by re-scoring with the engine (never front-side addition). 0 for
   * advice-only fixes (no operations) and positives.
   */
  points: number
  /** Empty for positives and advice-only issues (the panel hides Apply). */
  operations: FixOperation[]
}

export interface FixDerivationInput {
  /** Track ids in the ORIGINAL saved order. */
  trackIds: string[]
  /** Energies resolved for the original order (index-aligned to trackIds). */
  energies: ResolvedTrackEnergy[]
  issues: DetectedIssue[]
  /** Ideal curve the set was scored against (index-aligned). */
  targetCurve: number[]
  genre: SupportedGenre
  context: PlaylistContext
  /** Base score the engine already computed for the original order. */
  baseScore: number
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

/** Applies one move against a working array (immutable input, new array out). */
function applyOperation(order: string[], operation: FixOperation): string[] {
  const from = order.indexOf(operation.trackId)

  if (from === -1) {
    return order
  }

  const next = [...order]
  next.splice(from, 1)
  next.splice(Math.max(0, Math.min(operation.toIndex, next.length)), 0, operation.trackId)
  return next
}

/**
 * Derives the current track order from the original order plus the applied
 * fixes. Fixes apply in the order they appear in `fixes` (stable), each
 * operation sequentially — deterministic and exactly reversible by removing
 * the fix from the applied set.
 */
export function deriveOrder(
  originalIds: string[],
  fixes: SetFix[],
  appliedIds: ReadonlySet<string>
): string[] {
  let order = originalIds

  for (const fix of fixes) {
    if (!appliedIds.has(fix.id)) {
      continue
    }

    for (const operation of fix.operations) {
      order = applyOperation(order, operation)
    }
  }

  return order
}

/**
 * Re-scores an arbitrary order with the real engine (same pattern the
 * reorder suggestion uses): reorder the resolved energies and analyze.
 */
export function scoreOrder(
  orderIds: string[],
  originalIds: string[],
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext
): number {
  const byId = new Map(originalIds.map((id, index) => [id, energies[index]]))
  const ordered = orderIds
    .map((id) => byId.get(id))
    .filter((entry): entry is ResolvedTrackEnergy => Boolean(entry))

  const analysis = analyzePlaylist({
    curve: ordered.map((entry) => entry.score),
    genre,
    context,
    trackMeta: ordered.map((entry) => ({
      source: entry.source,
      bpm: entry.bpm,
    })),
  })

  return analysis.setScore
}

/** `potencial = base + Σ pts de los arreglos no descartados`, capped at 10. */
export function potentialScore(
  baseScore: number,
  fixes: SetFix[],
  discardedIds: ReadonlySet<string>
): number {
  const gain = fixes
    .filter((fix) => !discardedIds.has(fix.id) && fix.operations.length > 0)
    .reduce((sum, fix) => sum + fix.points, 0)

  return roundToOneDecimal(Math.min(10, baseScore + gain))
}

// ---------------------------------------------------------------------------
// Operation generation per issue type
// ---------------------------------------------------------------------------

interface OpContext {
  ids: string[]
  scores: number[]
  target: number[]
}

/** 0-based index of a 1-based playlist position. */
function indexOf(position: number) {
  return position - 1
}

/**
 * Bridge a hard transition (drop or spike) between two adjacent tracks: move
 * the track whose energy sits closest to the midpoint of the boundary
 * energies in between them. Deterministic tiebreak: earliest position.
 */
function bridgeOperations(
  from: number,
  to: number,
  { ids, scores }: OpContext
): FixOperation[] {
  const a = scores[indexOf(from)]
  const b = scores[indexOf(to)]
  const mid = (a + b) / 2

  let best: { index: number; distance: number } | null = null

  for (let index = 0; index < ids.length; index += 1) {
    const position = index + 1

    if (position === from || position === to) {
      continue
    }

    const distance = Math.abs(scores[index] - mid)

    if (!best || distance < best.distance) {
      best = { index, distance }
    }
  }

  if (!best) {
    return []
  }

  // Insert before the `to` track. If the bridge comes from an earlier index,
  // removing it shifts the target left by one — account for it.
  const toIndex =
    best.index < indexOf(to) ? indexOf(to) - 1 : indexOf(to)

  return [{ trackId: ids[best.index], toIndex }]
}

/** Move the strongest non-final track to the end (weak ending). */
function closeStrongerOperations({ ids, scores }: OpContext): FixOperation[] {
  let best = -1

  for (let index = 0; index < ids.length - 1; index += 1) {
    if (best === -1 || scores[index] > scores[best]) {
      best = index
    }
  }

  if (best === -1 || scores[best] <= scores[ids.length - 1]) {
    return []
  }

  return [{ trackId: ids[best], toIndex: ids.length - 1 }]
}

/** Relocate an early peak to ~72% of the set. */
function relocatePeakOperations(
  peakPosition: number,
  { ids }: OpContext
): FixOperation[] {
  const toIndex = Math.min(
    ids.length - 1,
    Math.round((ids.length - 1) * 0.72)
  )

  if (toIndex === indexOf(peakPosition)) {
    return []
  }

  return [{ trackId: ids[indexOf(peakPosition)], toIndex }]
}

/**
 * Break a flat zone: bring in the track (from outside the zone) whose energy
 * contrasts with the zone by 1–2.5 points, closest to +1.5 — enough movement
 * to re-introduce dynamics without manufacturing a spike.
 */
function varyFlatZoneOperations(
  zonePositions: number[],
  { ids, scores }: OpContext
): FixOperation[] {
  const zone = new Set(zonePositions)
  const zoneEnergy =
    zonePositions.reduce((sum, position) => sum + scores[indexOf(position)], 0) /
    zonePositions.length

  let best: { index: number; badness: number } | null = null

  for (let index = 0; index < ids.length; index += 1) {
    if (zone.has(index + 1)) {
      continue
    }

    const diff = Math.abs(scores[index] - zoneEnergy)

    if (diff < 1 || diff > 2.5) {
      continue
    }

    const badness = Math.abs(diff - 1.5)

    if (!best || badness < best.badness) {
      best = { index, badness }
    }
  }

  if (!best) {
    return []
  }

  const middle = zonePositions[Math.floor(zonePositions.length / 2)]
  const toIndex =
    best.index < indexOf(middle) ? indexOf(middle) - 1 : indexOf(middle)

  return [{ trackId: ids[best.index], toIndex }]
}

/**
 * Move each out-of-range track to the slot whose target energy is closest to
 * the track's energy (greedy, earliest-first, no slot reuse). One fix covers
 * every offending track — the panel shows them as chips.
 */
function fitContextOperations(
  positions: number[],
  { ids, scores, target }: OpContext
): FixOperation[] {
  const taken = new Set<number>()
  const operations: FixOperation[] = []

  for (const position of positions) {
    const energy = scores[indexOf(position)]
    let best: { index: number; distance: number } | null = null

    for (let index = 0; index < target.length; index += 1) {
      if (taken.has(index) || index === indexOf(position)) {
        continue
      }

      const distance = Math.abs(target[index] - energy)

      if (!best || distance < best.distance) {
        best = { index, distance }
      }
    }

    if (best && Math.abs(target[indexOf(position)] - energy) - best.distance > 0.5) {
      taken.add(best.index)
      operations.push({ trackId: ids[indexOf(position)], toIndex: best.index })
    }
  }

  return operations
}

/** Move the two strongest first-third tracks into the final third. */
function progressionOperations({ ids, scores }: OpContext): FixOperation[] {
  const third = Math.max(1, Math.floor(ids.length / 3))
  const firstThird = ids
    .slice(0, third)
    .map((id, index) => ({ id, index, score: scores[index] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  return firstThird.map((entry, offset) => ({
    trackId: entry.id,
    toIndex: ids.length - 1 - offset,
  }))
}

function operationsForIssue(
  issue: DetectedIssue,
  context: OpContext
): FixOperation[] {
  switch (issue.type) {
    case "abrupt_drop":
    case "abrupt_spike":
      return issue.trackPositions.length >= 2
        ? bridgeOperations(
            issue.trackPositions[0],
            issue.trackPositions[1],
            context
          )
        : []
    case "too_many_rests":
      // Bridge the FIRST flagged rest — one deliberate breather is fine, so
      // the fix smooths the extra ones starting with the earliest.
      return issue.trackPositions.length > 0
        ? bridgeOperations(
            issue.trackPositions[0],
            Math.min(issue.trackPositions[0] + 1, context.ids.length),
            context
          )
        : []
    case "weak_ending":
      return closeStrongerOperations(context)
    case "early_peak":
    case "context_high_peak":
      return issue.trackPositions.length > 0
        ? relocatePeakOperations(issue.trackPositions[0], context)
        : []
    case "flat_zone":
      return issue.trackPositions.length > 0
        ? varyFlatZoneOperations(issue.trackPositions, context)
        : []
    case "context_range":
      return fitContextOperations(issue.trackPositions, context)
    case "no_progression":
      return progressionOperations(context)
    // Advice-only: reordering can't fix these (add/remove tracks, tag data).
    case "no_climax":
    case "set_too_short":
    case "set_too_long":
    case "low_energy_confidence":
    case "good_breather":
      return []
  }
}

/**
 * Translates the engine's detected issues into actionable fixes. Positives
 * become cyan markers with no operations; advice-only issues keep an empty
 * operation list (the panel hides Apply). `points` is measured by re-scoring
 * the original order with just that fix applied.
 */
export function deriveFixes(input: FixDerivationInput): SetFix[] {
  const opContext: OpContext = {
    ids: input.trackIds,
    scores: input.energies.map((entry) => entry.score),
    target: input.targetCurve,
  }

  return input.issues.map((issue) => {
    const operations = operationsForIssue(issue, opContext)
    const id = `${issue.type}-${issue.trackPositions.join(".") || "set"}`

    let points = 0

    if (operations.length > 0) {
      const fixed = operations.reduce(
        (order, operation) => applyOperation(order, operation),
        input.trackIds
      )
      points = roundToOneDecimal(
        Math.max(
          0,
          scoreOrder(
            fixed,
            input.trackIds,
            input.energies,
            input.genre,
            input.context
          ) - input.baseScore
        )
      )
    }

    return {
      id,
      issueType: issue.type,
      severity: issue.severity,
      markerPosition: issue.trackPositions[0] ?? 1,
      tracks: issue.trackPositions.map((position) => ({
        id: input.trackIds[indexOf(position)] ?? "",
        position,
      })),
      delta: issue.delta ?? null,
      points,
      operations: points > 0 ? operations : [],
    }
  })
}
