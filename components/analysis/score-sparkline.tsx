import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"

interface ScoreSparklineProps {
  /** Set scores in chronological order (oldest first), 1-10 domain. */
  scores: number[]
  width?: number
  height?: number
}

/**
 * Tiny dependency-free SVG sparkline for a playlist's set-score history
 * (pattern ported from StageLink's SlPrimitives). Server-renderable — no
 * client JS. Renders nothing without data.
 */
export function ScoreSparkline({
  scores,
  width = 96,
  height = 28,
}: ScoreSparklineProps) {
  if (scores.length === 0) {
    return null
  }

  // A single analysis still draws a readable flat line.
  const values = scores.length === 1 ? [scores[0], scores[0]] : scores
  const { min, max } = ENERGY_SCORE_RANGE
  const span = max - min || 1
  const pad = 3

  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2)
    const clamped = Math.min(max, Math.max(min, value))
    const y = pad + (1 - (clamped - min) / span) * (height - pad * 2)

    return { x, y }
  })

  const polyline = points
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ")
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Score trend: ${scores.join(", ")}`}
      className="shrink-0"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke="#22D3EE"
        strokeOpacity="0.75"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="2.4" fill="#A24DE0" />
    </svg>
  )
}
