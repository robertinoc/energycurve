"use client"

import { useMemo, useState } from "react"
import { AudioLines, Clock3, Sparkles, TrendingUp } from "lucide-react"

import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  energyCurvePreviewTracks,
  getAverageEnergy,
  getPeakEnergy,
  getTotalDuration,
  mapTracksToCurvePoints,
} from "@/lib/energy-curve-preview"
import { cn } from "@/lib/utils"

const WIDTH = 780
const HEIGHT = 360
const PADDING = 36

interface EnergyCurveDashboardProps {
  playlistCount: number
  trackCount: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function EnergyCurveDashboard({
  playlistCount,
  trackCount,
}: EnergyCurveDashboardProps) {
  const [selectedIndex, setSelectedIndex] = useState(3)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const points = useMemo(
    () =>
      mapTracksToCurvePoints(energyCurvePreviewTracks, WIDTH, HEIGHT, PADDING),
    []
  )
  const activeIndex = hoveredIndex ?? selectedIndex
  const activeTrack = energyCurvePreviewTracks[activeIndex]
  const activePoint = points[activeIndex]

  const linePath = useMemo(() => buildSmoothCurvePath(points), [points])
  const areaPath = useMemo(
    () => buildCurveAreaPath(points, WIDTH, HEIGHT, PADDING),
    [points]
  )

  const segmentPoints = useMemo(() => {
    const start = Math.max(activeIndex - 1, 0)
    const end = Math.min(activeIndex + 1, points.length - 1)

    return points.slice(start, end + 1)
  }, [activeIndex, points])

  const segmentPath = useMemo(
    () => buildSmoothCurvePath(segmentPoints),
    [segmentPoints]
  )

  const tooltipStyle = activePoint
    ? {
        left: `${clamp((activePoint.x / WIDTH) * 100 - 13, 4, 76)}%`,
        top: `${clamp((activePoint.y / HEIGHT) * 100 - 24, 6, 64)}%`,
      }
    : undefined

  return (
    <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
      <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,34,0.96),rgba(20,20,27,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              Tracklist
            </p>
            <p className="mt-2 font-heading text-xl font-semibold text-white">
              Set flow
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
            Demo map
          </div>
        </div>

        <div className="space-y-2">
          {energyCurvePreviewTracks.map((track, index) => {
            const isActive = index === activeIndex

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  isActive
                    ? "border-[#00D1FF]/40 bg-white/[0.06] shadow-[0_0_28px_rgba(0,209,255,0.15)]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{track.title}</p>
                    <p className="mt-1 text-sm text-white/48">{track.artist}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-white/55">
                    {index + 1}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/38">
                  <span>{track.bpm} BPM</span>
                  <span>{track.energy} Energy</span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,25,0.98),rgba(14,14,20,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
        <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              Energy curve
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
              Shape the room before the drop lands
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">
              Hover the curve to inspect each transition. Click a track to pin
              the segment and read the rise, release, and rebound of the set.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/42">
            <span className="h-2 w-2 rounded-full bg-[#7B3FE4]" />
            Build
            <span className="h-2 w-2 rounded-full bg-[#00D1FF]" />
            Lift
            <span className="h-2 w-2 rounded-full bg-[#FF2D75]" />
            Peak
          </div>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#0D0D12] p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(123,63,228,0.22),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(255,45,117,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.14),transparent_38%)]" />

          <div className="relative">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-[340px] w-full"
              role="img"
              aria-label="Interactive energy curve demo"
            >
              <defs>
                <linearGradient
                  id="dashboard-curve-stroke"
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
                  id="dashboard-curve-fill"
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
                  id="dashboard-curve-glow"
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
                const y = PADDING + index * 70

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
                <path d={areaPath} fill="url(#dashboard-curve-fill)" />
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
                stroke="url(#dashboard-curve-stroke)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#dashboard-curve-glow)"
              />

              {segmentPath ? (
                <path
                  d={segmentPath}
                  fill="none"
                  stroke="#FF2D75"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#dashboard-curve-glow)"
                />
              ) : null}

              {points.map((point, index) => {
                const track = energyCurvePreviewTracks[index]
                const isActive = index === activeIndex

                return (
                  <g key={track.id}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? "14" : "10"}
                      fill={isActive ? "rgba(255,45,117,0.18)" : "rgba(0,209,255,0.12)"}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? "6" : "4.5"}
                      fill={isActive ? "#FF2D75" : "#F8F7FF"}
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
                  Active cue
                </p>
                <p className="mt-2 font-heading text-sm font-semibold text-white">
                  {activeTrack.title}
                </p>
                <p className="mt-1 text-xs text-white/52">
                  {activeTrack.artist}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/40">
                  <span>{activeTrack.bpm} BPM</span>
                  <span>{activeTrack.energy}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/56">
                  {activeTrack.cue}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,34,0.96),rgba(20,20,27,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">
            Metrics
          </p>
          <p className="mt-2 font-heading text-xl font-semibold text-white">
            Set pulse
          </p>
        </div>

        <div className="space-y-3">
          <MetricCard
            icon={TrendingUp}
            label="Average energy"
            value={`${getAverageEnergy(energyCurvePreviewTracks)}`}
            hint="Ideal pressure across the whole set"
          />
          <MetricCard
            icon={Sparkles}
            label="Peak energy"
            value={`${getPeakEnergy(energyCurvePreviewTracks)}`}
            hint="Highest recorded moment in the arc"
          />
          <MetricCard
            icon={Clock3}
            label="Set duration"
            value={`${getTotalDuration(energyCurvePreviewTracks)}m`}
            hint="Illustrative runtime across cue blocks"
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Current foundation stats
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/40">
                Playlists
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-white">
                {playlistCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/40">
                Tracks
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-white">
                {trackCount}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-white/46">
            The curve and tracklist are illustrative UI scaffolding. Real
            playlist analysis still belongs to the next product phase.
          </p>
        </div>
      </aside>
    </section>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof AudioLines
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            {label}
          </p>
          <p className="mt-3 font-heading text-3xl font-semibold text-white">
            {value}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5">
          <Icon className="size-4 text-white/58" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/52">{hint}</p>
    </div>
  )
}
