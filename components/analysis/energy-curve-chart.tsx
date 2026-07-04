"use client"

import { useMemo, useState } from "react"

import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
} from "@/lib/charts/curve-geometry"
import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"
import type { EnergySource } from "@/types/analysis"

const WIDTH = 780
const HEIGHT = 360
const PADDING = 36

export interface ChartTrackPoint {
  position: number
  artist: string
  name: string
  bpm: number | null
  score: number
  source: EnergySource
  hasIssue: boolean
}

interface EnergyCurveChartProps {
  tracks: ChartTrackPoint[]
}

const SOURCE_LABELS: Record<EnergySource, string> = {
  manual: "manual",
  bpm: "from BPM",
  estimated: "estimated",
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function EnergyCurveChart({ tracks }: EnergyCurveChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const points = useMemo(
    () =>
      mapValuesToCurvePoints(
        tracks.map((track) => track.score),
        WIDTH,
        HEIGHT,
        PADDING,
        { min: ENERGY_SCORE_RANGE.min, max: ENERGY_SCORE_RANGE.max }
      ),
    [tracks]
  )

  const activeIndex = hoveredIndex ?? selectedIndex
  const activeTrack = tracks[activeIndex]
  const activePoint = points[activeIndex]

  const linePath = useMemo(() => buildSmoothCurvePath(points), [points])
  const areaPath = useMemo(
    () => buildCurveAreaPath(points, WIDTH, HEIGHT, PADDING),
    [points]
  )

  const tooltipStyle = activePoint
    ? {
        left: `${clamp((activePoint.x / WIDTH) * 100 - 13, 4, 76)}%`,
        top: `${clamp((activePoint.y / HEIGHT) * 100 - 24, 6, 64)}%`,
      }
    : undefined

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0D0D12] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(123,63,228,0.22),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(255,45,117,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.14),transparent_38%)]" />

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[340px] w-full"
          role="img"
          aria-label="Energy curve of this playlist"
        >
          <defs>
            <linearGradient
              id="analysis-curve-stroke"
              x1="0"
              y1="0"
              x2={WIDTH}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7B3FE4" />
              <stop offset="0.55" stopColor="#00D1FF" />
              <stop offset="1" stopColor="#FF2D75" />
            </linearGradient>
            <linearGradient
              id="analysis-curve-fill"
              x1="0"
              y1="0"
              x2="0"
              y2={HEIGHT}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0B0B0F" stopOpacity="0.01" />
            </linearGradient>
            <filter
              id="analysis-curve-glow"
              x="-40%"
              y="-70%"
              width="180%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
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
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 10"
              />
            )
          })}

          {areaPath ? (
            <path d={areaPath} fill="url(#analysis-curve-fill)" />
          ) : null}

          <path
            d={linePath}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={linePath}
            fill="none"
            stroke="url(#analysis-curve-stroke)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#analysis-curve-glow)"
          />

          {points.map((point, index) => {
            const track = tracks[index]
            const isActive = index === activeIndex

            return (
              <g key={track.position}>
                {track.hasIssue ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="17"
                    fill="none"
                    stroke="rgba(255,45,117,0.55)"
                    strokeWidth="2"
                    strokeDasharray="3 4"
                  />
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? "14" : "10"}
                  fill={
                    isActive
                      ? "rgba(255,45,117,0.18)"
                      : track.hasIssue
                        ? "rgba(255,45,117,0.12)"
                        : "rgba(0,209,255,0.12)"
                  }
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? "6" : "4.5"}
                  fill={
                    isActive
                      ? "#FF2D75"
                      : track.hasIssue
                        ? "#FF7AA8"
                        : "#F8F7FF"
                  }
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setSelectedIndex(index)}
                />
              </g>
            )
          })}
        </svg>

        {activeTrack && activePoint ? (
          <div
            className="pointer-events-none absolute w-44 rounded-2xl border border-white/12 bg-[#13131A]/96 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur"
            style={tooltipStyle}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Track {activeTrack.position}
            </p>
            <p className="mt-2 font-heading text-sm font-semibold text-white">
              {activeTrack.name}
            </p>
            <p className="mt-1 text-xs text-white/52">{activeTrack.artist}</p>
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/40">
              <span>
                {activeTrack.bpm !== null ? `${activeTrack.bpm} BPM` : "no BPM"}
              </span>
              <span>{activeTrack.score}</span>
            </div>
            <p className="mt-2 text-xs text-white/46">
              Energy {SOURCE_LABELS[activeTrack.source]}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
