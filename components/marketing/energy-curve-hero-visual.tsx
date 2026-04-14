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

export function EnergyCurveHeroVisual() {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111118] p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_132px]">
        <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(123,63,228,0.22),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(255,45,117,0.18),transparent_28%),#0C0C12] p-3">
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
                <stop stopColor="#7B3FE4" />
                <stop offset="0.45" stopColor="#FF2D75" />
                <stop offset="0.74" stopColor="#00D1FF" />
                <stop offset="1" stopColor="#7B3FE4" />
              </linearGradient>
              <linearGradient
                id="hero-curve-fill"
                x1="0"
                y1="0"
                x2="0"
                y2={HEIGHT}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#FF2D75" stopOpacity="0.28" />
                <stop offset="55%" stopColor="#7B3FE4" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0B0B0F" stopOpacity="0.02" />
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
                      ? "rgba(255,45,117,0.22)"
                      : "rgba(0,209,255,0.16)"
                  }
                  className="energy-orb-pulse"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={index === 3 || index === 5 ? "4.5" : "3.5"}
                  fill={index === 3 || index === 5 ? "#FF2D75" : "#F7F7FB"}
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
                      ? "#7B3FE4"
                      : index % 3 === 1
                        ? "#FF2D75"
                        : "#00D1FF"
                  }
                  opacity="0.55"
                />
              )
            })}
          </svg>
        </div>

        <div className="space-y-3">
          <Metric title="Energy score" value="8.5" />
          <Metric title="Peak intensity" value="9.7" />
          <Metric title="Set duration" value="115:32" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-[16px] border border-white/8 bg-black/25 p-3 sm:grid-cols-5">
        {[
          "Cold opening",
          "Track rise",
          "Set arc %",
          "Teaser",
          "Stand easy",
        ].map((label) => (
          <div key={label} className="rounded-xl bg-white/[0.03] px-3 py-2">
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/38">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-black/28 px-3 py-4">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/40">
        {title}
      </p>
      <p className="mt-2 font-heading text-3xl font-semibold text-white">
        {value}
      </p>
    </div>
  )
}
