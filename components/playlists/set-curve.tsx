"use client"

import { useMemo } from "react"

import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
} from "@/lib/charts/curve-geometry"
import { energyColor } from "@/lib/charts/energy-colors"
import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"

const WIDTH = 1000
const HEIGHT = 200
const PADDING = 18

interface SetCurveProps {
  /** Resolved energy score per track, in current playing order (1–10). */
  scores: number[]
  /** Ideal energy arc for the genre + context, same length as scores; or null. */
  target: number[] | null
  /** Index of the track to highlight (hovered in the table), or null. */
  hoveredIndex: number | null
  /**
   * Points whose value was interpolated from the track's position rather than
   * measured. Drawn hollow, so filled means "this came from the music".
   */
  estimatedIndices?: readonly number[]
}

const DOMAIN = { min: ENERGY_SCORE_RANGE.min, max: ENERGY_SCORE_RANGE.max }

export function SetCurve({
  scores,
  target,
  hoveredIndex,
  estimatedIndices = [],
}: SetCurveProps) {
  const estimated = useMemo(() => new Set(estimatedIndices), [estimatedIndices])
  const points = useMemo(
    () => mapValuesToCurvePoints(scores, WIDTH, HEIGHT, PADDING, DOMAIN),
    [scores]
  )
  const linePath = useMemo(() => buildSmoothCurvePath(points), [points])
  const areaPath = useMemo(
    () => buildCurveAreaPath(points, WIDTH, HEIGHT, PADDING),
    [points]
  )
  const targetPath = useMemo(() => {
    if (!target || target.length !== scores.length) {
      return null
    }
    return buildSmoothCurvePath(
      mapValuesToCurvePoints(target, WIDTH, HEIGHT, PADDING, DOMAIN)
    )
  }, [target, scores.length])

  const highlight =
    hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-[180px] w-full"
      role="img"
      aria-label="Set energy curve"
    >
      <defs>
        <linearGradient
          id="set-curve-stroke"
          x1="0"
          y1="0"
          x2={WIDTH}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4C6EF5" />
          <stop offset="0.5" stopColor="#A24DE0" />
          <stop offset="1" stopColor="#F0348A" />
        </linearGradient>
        <linearGradient
          id="set-curve-fill"
          x1="0"
          y1="0"
          x2="0"
          y2={HEIGHT}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#A24DE0" stopOpacity="0.26" />
          <stop offset="1" stopColor="#A24DE0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4].map((i) => {
        const y = PADDING + (i * (HEIGHT - 2 * PADDING)) / 4
        return (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={WIDTH}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="3 9"
          />
        )
      })}

      {targetPath ? (
        <path
          d={targetPath}
          fill="none"
          stroke="rgba(244,242,252,0.5)"
          strokeWidth={2}
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
      ) : null}

      {areaPath ? <path d={areaPath} fill="url(#set-curve-fill)" /> : null}
      {linePath ? (
        <path
          d={linePath}
          fill="none"
          stroke="url(#set-curve-stroke)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* Hollow where the number came from the position rather than the track.
          The shape of the curve is still the DJ's ordering — worth showing — but a
          smooth arc reads as a measurement whatever the caption says, so the
          points that aren't one say so. */}
      {points.map((point, i) =>
        estimated.has(i) ? (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={3.5}
            fill="#08050F"
            stroke={energyColor(scores[i])}
            strokeWidth={1.5}
          />
        ) : (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={energyColor(scores[i])}
          />
        )
      )}

      {highlight ? (
        <circle
          cx={highlight.x}
          cy={highlight.y}
          r={6.5}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
        />
      ) : null}
    </svg>
  )
}
