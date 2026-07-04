export interface CurvePoint {
  x: number
  y: number
}

export interface CurveDomain {
  min: number
  max: number
}

/**
 * Maps an ordered list of values onto SVG coordinates, distributing points
 * evenly across the width and scaling the value onto the given domain
 * (1-10 for real energy scores, 0-100 for the legacy landing demo).
 */
export function mapValuesToCurvePoints(
  values: number[],
  width: number,
  height: number,
  padding = 24,
  domain: CurveDomain = { min: 0, max: 100 }
): CurvePoint[] {
  if (values.length === 0) {
    return []
  }

  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2
  const stepX = values.length === 1 ? 0 : innerWidth / (values.length - 1)
  const span = domain.max - domain.min || 1

  return values.map((value, index) => {
    const x = padding + stepX * index
    const normalized = (value - domain.min) / span
    const y = padding + (1 - normalized) * innerHeight

    return { x, y }
  })
}

export function buildSmoothCurvePath(points: CurvePoint[]) {
  if (points.length === 0) {
    return ""
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  const firstMidX = (points[0].x + points[1].x) / 2
  const firstMidY = (points[0].y + points[1].y) / 2

  let path = `M ${points[0].x} ${points[0].y} Q ${points[0].x} ${points[0].y} ${firstMidX} ${firstMidY}`

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const nextPoint = points[index + 1]
    const midX = (point.x + nextPoint.x) / 2
    const midY = (point.y + nextPoint.y) / 2

    path += ` Q ${point.x} ${point.y} ${midX} ${midY}`
  }

  const lastPoint = points.at(-1)
  const previousPoint = points.at(-2)

  if (lastPoint && previousPoint) {
    path += ` Q ${previousPoint.x} ${previousPoint.y} ${lastPoint.x} ${lastPoint.y}`
  }

  return path
}

export function buildCurveAreaPath(
  points: CurvePoint[],
  width: number,
  height: number,
  padding = 24
) {
  if (points.length === 0) {
    return ""
  }

  const linePath = buildSmoothCurvePath(points)
  const lastPoint = points.at(-1)
  const firstPoint = points[0]
  const baselineY = height - padding

  if (!lastPoint) {
    return ""
  }

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`
}
