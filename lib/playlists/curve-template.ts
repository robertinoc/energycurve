/**
 * Turning a set's actual curve into a reusable target shape.
 *
 * The five named shapes cover the ordinary nights. A resident who has found
 * *their* shape — the one that works in their room, on their floor — has no way
 * to aim at it again, and describing it in words ("build, dip, build") is
 * exactly the imprecision the named shapes already are.
 *
 * So a template is made by pointing at a set that went well, not by drawing.
 * The DJ already has the shape; asking them to redraw it from memory would
 * produce a worse copy of something we can read directly.
 */

/** A (progress, energy) pair, both already normalised. */
export type CurveAnchor = readonly [number, number]

/**
 * How many anchors a saved template keeps.
 *
 * Five, matching the richest of the built-in shapes. Enough to hold a build, a
 * dip and a second build; few enough that the template describes an intention
 * rather than reproducing one night's noise, which is the difference between a
 * shape you can aim at and a curve you can only match.
 */
export const TEMPLATE_ANCHOR_COUNT = 5

/**
 * Reduces a set's curve to a handful of anchors.
 *
 * Sampled at even intervals rather than at peaks: peak-picking would preserve
 * whichever wobble happened to be highest, and the target is the arc, not the
 * detail. The first and last points are always included, so the shape starts
 * and ends where the night did.
 */
export function anchorsFromCurve(
  curve: readonly number[],
  count = TEMPLATE_ANCHOR_COUNT
): CurveAnchor[] {
  if (curve.length === 0) {
    return []
  }

  if (curve.length === 1) {
    return [[0, curve[0]] as CurveAnchor, [1, curve[0]] as CurveAnchor]
  }

  const points = Math.min(count, curve.length)

  return Array.from({ length: points }, (_, index) => {
    const t = points === 1 ? 0 : index / (points - 1)
    const source = Math.round(t * (curve.length - 1))

    return [
      Math.round(t * 1000) / 1000,
      Math.round(curve[source] * 10) / 10,
    ] as CurveAnchor
  })
}

/**
 * Reads anchors back out of storage, or null when they can't be trusted.
 *
 * The column is jsonb, so anything could be in it. A template that half-parses
 * would silently score a DJ's set against a shape nobody designed, which is
 * worse than telling them the template is broken — so this is all-or-nothing.
 */
export function parseAnchors(value: unknown): CurveAnchor[] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null
  }

  const anchors: CurveAnchor[] = []

  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return null
    }

    const [t, energy] = entry

    if (
      typeof t !== "number" ||
      typeof energy !== "number" ||
      !Number.isFinite(t) ||
      !Number.isFinite(energy) ||
      t < 0 ||
      t > 1 ||
      energy < 0 ||
      energy > 10
    ) {
      return null
    }

    // Monotonic progress, because the sampler walks these in order and a
    // backwards step would make it read the wrong segment.
    if (anchors.length > 0 && t < anchors[anchors.length - 1][0]) {
      return null
    }

    anchors.push([t, energy])
  }

  return anchors
}

/** Trims and bounds a user-supplied template name, or null when unusable. */
export function normaliseTemplateName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ")

  return name.length === 0 || name.length > 60 ? null : name
}
