import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  energyCurvePreviewTracks,
  mapTracksToCurvePoints,
} from "@/lib/energy-curve-preview"

const WIDTH = 680
const HEIGHT = 260
const PADDING = 26

const points = mapTracksToCurvePoints(
  energyCurvePreviewTracks,
  WIDTH,
  HEIGHT,
  PADDING
)
const curvePath = buildSmoothCurvePath(points)
const areaPath = buildCurveAreaPath(points, WIDTH, HEIGHT, PADDING)

/**
 * The states the engine actually reports, in the brand kit's semantic colours:
 * peak = magenta, sharp drop = amber, flat zone = indigo, strong close = cyan.
 * These used to be invented marketing words ("Teaser", "Set arc %") set in
 * white at 45% — unreadable, and describing nothing the product returns.
 */
export type CurveMarkerTone = "peak" | "drop" | "flat" | "close"

const MARKER_TONE: Record<CurveMarkerTone, string> = {
  peak: "border-[#F0348A]/45 bg-[#F0348A]/15 text-[#FF89B9]",
  drop: "border-[#F5A524]/45 bg-[#F5A524]/15 text-[#FFCA7A]",
  flat: "border-[#4C6EF5]/50 bg-[#4C6EF5]/18 text-[#A6B6FF]",
  close: "border-[#22D3EE]/45 bg-[#22D3EE]/13 text-[#7DE6F7]",
}

interface EnergyCurveHeroVisualProps {
  labels?: {
    energyScore: string
    peakIntensity: string
    setDuration: string
    markers: { label: string; tone: CurveMarkerTone }[]
    phases: string[]
  }
}

export function EnergyCurveHeroVisual({
  labels = {
    energyScore: "Energy score",
    peakIntensity: "Peak intensity",
    setDuration: "Set duration",
    markers: [
      { label: "▲ Peak at 7 · 9.7", tone: "peak" },
      { label: "Flat zone", tone: "flat" },
      { label: "▼ Drop −3", tone: "drop" },
      { label: "Strong close", tone: "close" },
    ],
    phases: ["Opening", "Build-up", "Peak time", "Closing"],
  },
}: EnergyCurveHeroVisualProps) {
  return (
    <div className="rounded-2xl border border-ec-border bg-ec-surface p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_132px]">
        <div className="overflow-hidden rounded-xl border border-ec-border bg-[radial-gradient(circle_at_center,rgba(162,77,224,0.2),transparent_38%),radial-gradient(circle_at_70%_20%,rgba(34,211,238,0.12),transparent_30%),#0C0917] p-3">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-[230px] w-full overflow-visible"
            role="img"
            aria-label="Energy curve product preview"
          >
            <defs>
              <linearGradient
                id="hero-curve-stroke"
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
                id="hero-curve-fill"
                x1="0"
                y1="0"
                x2="0"
                y2={HEIGHT}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#A24DE0" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#A24DE0" stopOpacity="0" />
              </linearGradient>
              <filter
                id="hero-curve-glow"
                x="-40%"
                y="-60%"
                width="180%"
                height="220%"
              >
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {Array.from({ length: 9 }).map((_, index) => {
              const x = PADDING + index * 78

              return (
                <line
                  key={x}
                  x1={x}
                  y1={PADDING}
                  x2={x}
                  y2={HEIGHT - PADDING}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 9"
                />
              )
            })}

            {Array.from({ length: 5 }).map((_, index) => {
              const y = PADDING + index * 44

              return (
                <line
                  key={y}
                  x1={PADDING}
                  y1={y}
                  x2={WIDTH - PADDING}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 10"
                />
              )
            })}

            {areaPath ? <path d={areaPath} fill="url(#hero-curve-fill)" /> : null}

            <path
              d={curvePath}
              stroke="url(#hero-curve-stroke)"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#hero-curve-glow)"
              className="energy-curve-float"
            />

            {points.map((point, index) => (
              <g key={`${point.x}-${point.y}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={index === 3 || index === 5 ? "10" : "7"}
                  fill={
                    index === 3 || index === 5
                      ? "rgba(240,52,138,0.22)"
                      : "rgba(34,211,238,0.16)"
                  }
                  className="energy-orb-pulse"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={index === 3 || index === 5 ? "4.5" : "3.5"}
                  fill={index === 3 || index === 5 ? "#F0348A" : "#F5F2FC"}
                />
              </g>
            ))}

            {energyCurvePreviewTracks.map((track, index) => {
              const x = points[index]?.x ?? 0
              const barHeight = (track.energy / 100) * 38
              const y = HEIGHT - PADDING - barHeight

              return (
                <rect
                  key={track.id}
                  x={x - 8}
                  y={y}
                  width="16"
                  height={barHeight}
                  rx="5"
                  fill={
                    index % 3 === 0
                      ? "#A24DE0"
                      : index % 3 === 1
                        ? "#4C6EF5"
                        : "#22D3EE"
                  }
                  opacity="0.55"
                />
              )
            })}
          </svg>
        </div>

        <div className="space-y-3">
          <Metric title={labels.energyScore} value="8.5" />
          <Metric title={labels.peakIntensity} value="9.7" />
          <Metric title={labels.setDuration} value="115:32" />
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-white/8 bg-black/25 p-3">
        <div className="flex flex-wrap gap-2">
          {labels.markers.map((marker) => (
            <span
              key={marker.label}
              className={`whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.04em] ${MARKER_TONE[marker.tone]}`}
            >
              {marker.label}
            </span>
          ))}
        </div>
        {/* Phase axis, per the brand kit's curve spec. */}
        <div className="mt-3 flex justify-between border-t border-white/8 px-1 pt-2.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-white/60">
          {labels.phases.map((phase) => (
            <span key={phase}>{phase}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-ec-border bg-ec-sunken px-3 py-4">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ec-text-muted">
        {title}
      </p>
      <p className="ec-gradient-text mt-2 font-mono text-3xl font-bold">
        {value}
      </p>
    </div>
  )
}
