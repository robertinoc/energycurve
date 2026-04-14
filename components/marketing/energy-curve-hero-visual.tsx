import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  energyCurvePreviewTracks,
  mapTracksToCurvePoints,
} from "@/lib/energy-curve-preview"

const WIDTH = 520
const HEIGHT = 320
const PADDING = 28

const points = mapTracksToCurvePoints(
  energyCurvePreviewTracks,
  WIDTH,
  HEIGHT,
  PADDING
)
const curvePath = buildSmoothCurvePath(points)
const areaPath = buildCurveAreaPath(points, WIDTH, HEIGHT, PADDING)

export function EnergyCurveHeroVisual() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,209,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(123,63,228,0.28),transparent_42%)]" />

      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Live set shape
            </p>
            <p className="mt-2 text-lg font-heading font-semibold text-white">
              Energy curve preview
            </p>
          </div>
          <div className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs text-white/65">
            Animated concept
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#111118] p-4">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-[260px] w-full overflow-visible"
            role="img"
            aria-label="Animated preview of the EnergyCurve set arc"
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
                <stop stopColor="#7B3FE4" />
                <stop offset="0.55" stopColor="#00D1FF" />
                <stop offset="1" stopColor="#FF2D75" />
              </linearGradient>
              <linearGradient
                id="hero-curve-fill"
                x1="0"
                y1="0"
                x2="0"
                y2={HEIGHT}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#7B3FE4" stopOpacity="0.02" />
              </linearGradient>
              <filter id="hero-curve-glow" x="-40%" y="-60%" width="180%" height="220%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {Array.from({ length: 6 }).map((_, index) => {
              const x = PADDING + index * 92

              return (
                <line
                  key={x}
                  x1={x}
                  y1={PADDING - 6}
                  x2={x}
                  y2={HEIGHT - PADDING}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 10"
                />
              )
            })}

            {areaPath ? (
              <path d={areaPath} fill="url(#hero-curve-fill)" opacity="0.9" />
            ) : null}

            <path
              d={curvePath}
              stroke="url(#hero-curve-stroke)"
              strokeWidth="4"
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
                  r="10"
                  fill="rgba(0,209,255,0.12)"
                  className="energy-orb-pulse"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={index === 3 || index === 5 ? "5" : "4"}
                  fill={index === 3 || index === 5 ? "#FF2D75" : "#F7F7FB"}
                />
              </g>
            ))}
          </svg>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Avg energy
            </p>
            <p className="mt-2 text-2xl font-heading font-semibold text-white">
              62
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Peak moment
            </p>
            <p className="mt-2 text-2xl font-heading font-semibold text-white">
              89
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Set length
            </p>
            <p className="mt-2 text-2xl font-heading font-semibold text-white">
              30m
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
