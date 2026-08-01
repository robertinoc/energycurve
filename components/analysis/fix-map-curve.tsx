"use client"

import { useMemo } from "react"

import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
} from "@/lib/charts/curve-geometry"
import { ENERGY_COLORS } from "@/lib/charts/energy-colors"
import {
  ANALYSIS_UI,
  MARKER_LABELS,
  formatTemplate,
} from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { SetFix } from "@/lib/engine/fixes"
import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"

const WIDTH = 780
const HEIGHT = 360
const PADDING = 36

const PHASE_KEYS = [
  "phaseOpening",
  "phaseBuildup",
  "phasePeak",
  "phaseClosing",
] as const

export interface FixMarkerDatum {
  fix: SetFix
  /** 0-based index of the anchor track in the CURRENT derived order. */
  index: number
  /** Whether this fix is currently applied (marker renders resolved). */
  applied: boolean
}

interface FixMapCurveProps {
  /** Energy scores in the CURRENT derived order. */
  scores: number[]
  /** Ideal curve (index-aligned to the set length). */
  target: number[] | null
  markers: FixMarkerDatum[]
  selectedFixId: string | null
  onSelect: (fixId: string) => void
  /** ← / → move the selection through the navigable fixes. */
  onNavigate: (direction: 1 | -1) => void
  locale: SiteLocale
}

function markerColor(fix: SetFix): string {
  if (fix.severity === "positive") {
    return ENERGY_COLORS.cyan
  }

  if (fix.issueType === "early_peak" || fix.issueType === "context_high_peak") {
    return ENERGY_COLORS.magenta
  }

  return ENERGY_COLORS.amber
}

function markerRadius(fix: SetFix): number {
  if (fix.severity === "positive") {
    return 6
  }

  if (fix.issueType === "early_peak" || fix.issueType === "context_high_peak") {
    return 7.5
  }

  return 7
}

function markerLabel(fix: SetFix, locale: SiteLocale): string {
  const template = MARKER_LABELS[fix.issueType]

  if (!template) {
    return ""
  }

  return formatTemplate(template[locale], {
    n: fix.markerPosition,
    delta: fix.delta ?? "",
  })
}

/**
 * Zone 2: the energy curve as a MAP. Every fix is a clickable marker anchored
 * on the track that causes it; a sliding white ring highlights the selected
 * one. Brand curve spec: smooth 3.5px gradient stroke with glow, area fill,
 * gridlines, phase axis. Markers are real <button type="button"> elements
 * inside <foreignObject>-free SVG via role/button semantics on <g>.
 */
export function FixMapCurve({
  scores,
  target,
  markers,
  selectedFixId,
  onSelect,
  onNavigate,
  locale,
}: FixMapCurveProps) {
  const points = useMemo(
    () =>
      mapValuesToCurvePoints(scores, WIDTH, HEIGHT, PADDING, {
        min: ENERGY_SCORE_RANGE.min,
        max: ENERGY_SCORE_RANGE.max,
      }),
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
      mapValuesToCurvePoints(target, WIDTH, HEIGHT, PADDING, {
        min: ENERGY_SCORE_RANGE.min,
        max: ENERGY_SCORE_RANGE.max,
      })
    )
  }, [target, scores.length])

  const selected = markers.find((marker) => marker.fix.id === selectedFixId)
  const selectedPoint = selected ? points[selected.index] : null

  return (
    <div
      className="relative rounded-2xl border border-ec-border bg-ec-sunken p-4"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault()
          onNavigate(1)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          onNavigate(-1)
        }
      }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[340px] w-full">
        <defs>
          <linearGradient
            id="fixmap-stroke"
            x1="0"
            y1="0"
            x2={WIDTH}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4C6EF5" />
            <stop offset="0.5" stopColor="#A24DE0" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient
            id="fixmap-fill"
            x1="0"
            y1="0"
            x2="0"
            y2={HEIGHT}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#A24DE0" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#A24DE0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: 5 }).map((_, index) => {
          const y = PADDING + index * ((HEIGHT - PADDING * 2) / 4)

          return (
            <line
              key={y}
              x1={PADDING - 4}
              y1={y}
              x2={WIDTH - PADDING}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
            />
          )
        })}

        {areaPath ? <path d={areaPath} fill="url(#fixmap-fill)" /> : null}

        {targetPath ? (
          <path
            d={targetPath}
            fill="none"
            stroke="rgba(245,242,252,0.30)"
            strokeWidth="2"
            strokeDasharray="6 7"
            strokeLinecap="round"
          />
        ) : null}

        <path
          d={linePath}
          fill="none"
          stroke="url(#fixmap-stroke)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ec-curve-glow"
        />

        {/* Sliding selection ring (motion-safe). */}
        {selectedPoint ? (
          <circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r={15}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.55"
            strokeWidth="2"
            className="pointer-events-none motion-safe:transition-all motion-safe:duration-300"
          />
        ) : null}

        {markers.map((marker) => {
          const point = points[marker.index]

          if (!point) {
            return null
          }

          const color = markerColor(marker.fix)
          const isSelected = marker.fix.id === selectedFixId
          const label = markerLabel(marker.fix, locale)

          return (
            <g
              key={marker.fix.id}
              role="button"
              tabIndex={0}
              aria-label={label || marker.fix.issueType}
              aria-pressed={isSelected}
              onClick={() => onSelect(marker.fix.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelect(marker.fix.id)
                }
              }}
              className="cursor-pointer focus:outline-none"
            >
              {/* Invisible hit area ≥44px. */}
              <circle cx={point.x} cy={point.y} r={16} fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={markerRadius(marker.fix)}
                fill={marker.applied ? ENERGY_COLORS.cyan : color}
                opacity={marker.applied ? 0.55 : 1}
                style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
              />
              {label ? (
                <text
                  x={point.x}
                  y={point.y - 16}
                  textAnchor="middle"
                  className="select-none font-mono"
                  fontSize="11"
                  fontWeight="700"
                  fill={marker.applied ? "rgba(245,242,252,0.45)" : color}
                  style={{ letterSpacing: "0.06em" }}
                >
                  {label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between px-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ec-text-dim">
        {PHASE_KEYS.map((key) => (
          <span key={key}>{ANALYSIS_UI[key][locale]}</span>
        ))}
      </div>
    </div>
  )
}
