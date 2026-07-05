"use client"

import { useMemo, useState } from "react"

import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
} from "@/lib/charts/curve-geometry"
import { ENERGY_COLORS } from "@/lib/charts/energy-colors"
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

const PHASE_LABELS = ["Opening", "Build-up", "Peak time", "Closing"]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type MarkerKind = "peak" | "issue" | "opening" | "close" | "default"

function markerKind(
  index: number,
  tracks: ChartTrackPoint[],
  peakIndex: number
): MarkerKind {
  if (tracks[index].hasIssue) return "issue"
  if (index === peakIndex) return "peak"
  if (index === 0) return "opening"
  if (index === tracks.length - 1) return "close"
  return "default"
}

const MARKER_STYLES: Record<
  MarkerKind,
  { fill: string; r: number; glow: string | null }
> = {
  peak: { fill: ENERGY_COLORS.magenta, r: 7, glow: "rgba(240,52,138,0.65)" },
  issue: { fill: ENERGY_COLORS.amber, r: 6, glow: "rgba(245,165,36,0.6)" },
  opening: { fill: ENERGY_COLORS.indigo, r: 5.5, glow: "rgba(76,110,245,0.55)" },
  close: { fill: ENERGY_COLORS.cyan, r: 5.5, glow: "rgba(34,211,238,0.55)" },
  default: { fill: "rgba(245,242,252,0.55)", r: 3.5, glow: null },
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

  const peakIndex = useMemo(() => {
    let index = 0
    tracks.forEach((track, i) => {
      if (track.score > tracks[index].score) index = i
    })
    return index
  }, [tracks])

  const activeIndex = hoveredIndex ?? selectedIndex
  const activeTrack = tracks[activeIndex]
  const activePoint = points[activeIndex]
  const peakPoint = points[peakIndex]
  const peakTrack = tracks[peakIndex]

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

  const peakPillStyle = peakPoint
    ? {
        left: `${clamp((peakPoint.x / WIDTH) * 100 - 6, 2, 84)}%`,
        top: `${clamp((peakPoint.y / HEIGHT) * 100 - 13, 1, 80)}%`,
      }
    : undefined

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ec-border bg-ec-sunken p-4">
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
              <stop stopColor="#4C6EF5" />
              <stop offset="0.5" stopColor="#A24DE0" />
              <stop offset="1" stopColor="#22D3EE" />
            </linearGradient>
            <linearGradient
              id="analysis-curve-fill"
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

          {areaPath ? (
            <path d={areaPath} fill="url(#analysis-curve-fill)" />
          ) : null}

          <path
            d={linePath}
            fill="none"
            stroke="url(#analysis-curve-stroke)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="ec-curve-glow ec-curve-draw"
          />

          {points.map((point, index) => {
            const track = tracks[index]
            const kind = markerKind(index, tracks, peakIndex)
            const style = MARKER_STYLES[kind]
            const isActive = index === activeIndex

            return (
              <g key={track.position}>
                {isActive ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={style.r + 7}
                    fill="none"
                    stroke={
                      kind === "default"
                        ? "rgba(245,242,252,0.35)"
                        : style.fill
                    }
                    strokeOpacity="0.45"
                    strokeWidth="2"
                  />
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? style.r + 1.5 : style.r}
                  fill={style.fill}
                  style={
                    style.glow
                      ? { filter: `drop-shadow(0 0 6px ${style.glow})` }
                      : undefined
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

        {peakPoint && peakTrack && !peakTrack.hasIssue ? (
          <div
            className="pointer-events-none absolute rounded-full border border-[#F0348A]/40 bg-[#F0348A]/[0.13] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#FF87BE]"
            style={peakPillStyle}
          >
            ▲ Peak {peakTrack.score}
          </div>
        ) : null}

        {activeTrack && activePoint ? (
          <div
            className="pointer-events-none absolute w-44 rounded-xl border border-ec-border-strong bg-ec-surface/96 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur"
            style={tooltipStyle}
          >
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ec-cyan">
              Track {activeTrack.position}
            </p>
            <p className="mt-2 font-heading text-sm font-semibold text-ec-text">
              {activeTrack.name}
            </p>
            <p className="mt-1 text-xs text-ec-text-muted">
              {activeTrack.artist}
            </p>
            <div className="mt-3 flex items-center justify-between font-mono text-[11.5px] text-ec-text-dim">
              <span>
                {activeTrack.bpm !== null ? `${activeTrack.bpm} BPM` : "no BPM"}
              </span>
              <span style={{ color: MARKER_STYLES[markerKind(activeIndex, tracks, peakIndex)].fill }}>
                {activeTrack.score}
              </span>
            </div>
            <p className="mt-2 text-xs text-ec-text-dim">
              Energy {SOURCE_LABELS[activeTrack.source]}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between px-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ec-text-dim">
        {PHASE_LABELS.map((phase) => (
          <span key={phase}>{phase}</span>
        ))}
      </div>
    </div>
  )
}
