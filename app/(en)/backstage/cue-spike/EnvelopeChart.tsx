/**
 * One track's energy envelope with its three CUE candidates on top.
 *
 * SVG rather than canvas, on purpose: this gets read on a phone in standalone
 * mode, rotated, on a 3× screen. Vector output is sharp at any devicePixelRatio
 * and re-lays itself out on rotation with no resize listener to get wrong — a
 * canvas would need both, and a blurry chart is useless for judging a CUE.
 *
 * The plot stretches to its box (`preserveAspectRatio="none"`) so an eight-minute
 * track fits the width by layout instead of scrolling; strokes use
 * `vector-effect: non-scaling-stroke` so stretching never fattens a line, and the
 * text sits in HTML over the plot so it is never stretched either.
 *
 * Colours are the brand kit's and nothing else: the curve is the §5 signature
 * curve (indigo → violet → cyan, violet area fill), the drop is magenta because
 * magenta means a peak, and entry/exit are the text white — indigo and cyan are
 * the kit's opening/close marker colours, but both are stops of the curve's own
 * gradient and would disappear into it.
 */

import {
  formatMinutesSeconds,
  normalise,
  type CueCandidates,
  type CueKind,
} from "@/lib/audio/cue-candidates"

const WIDTH = 1000
const HEIGHT = 100
const TOP = 6

export const CUE_STYLE: Record<
  CueKind,
  { label: string; color: string; dash?: string; glow?: string }
> = {
  entry: { label: "In", color: "var(--ec-text)" },
  drop: {
    label: "Drop",
    color: "var(--ec-magenta)",
    glow: "drop-shadow(0 0 4px rgba(240,52,138,0.8))",
  },
  exit: { label: "Out", color: "var(--ec-text)", dash: "5 4" },
}

/**
 * Monotone cubic (Fritsch–Butland) through evenly spaced points: smooth, as the
 * brand curve spec asks, without the overshoot a Catmull-Rom spline puts below
 * zero after every kick.
 */
export function monotonePath(values: number[], width = WIDTH, height = HEIGHT) {
  const n = values.length
  if (n === 0) return ""
  const span = height - TOP
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * width)
  const y = (v: number) => height - Math.min(1.1, Math.max(0, v)) * (span / 1.1)
  if (n === 1) return `M0,${y(values[0])}L${width},${y(values[0])}`

  const dx = width / (n - 1)
  const ys = values.map(y)
  const slopes = ys.slice(1).map((value, i) => (value - ys[i]) / dx)
  const tangents = ys.map((_, i) => {
    if (i === 0) return slopes[0]
    if (i === n - 1) return slopes[n - 2]
    const a = slopes[i - 1]
    const b = slopes[i]
    return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b)
  })

  let path = `M${x(0).toFixed(2)},${ys[0].toFixed(2)}`
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = x(i) + dx / 3
    const c1y = ys[i] + (tangents[i] * dx) / 3
    const c2x = x(i + 1) - dx / 3
    const c2y = ys[i + 1] - (tangents[i + 1] * dx) / 3
    path += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x(i + 1).toFixed(2)},${ys[i + 1].toFixed(2)}`
  }
  return path
}

/**
 * Two label rows: a label goes on the second row when it would collide with the
 * previous one on the first. Collisions are common — a kick intro puts the entry
 * at 0:00 and a short track crowds everything.
 */
function labelRows<T extends { at: number }>(marks: T[]) {
  const placed: Array<T & { row: 0 | 1 }> = []
  let lastOnFirstRow = -1
  for (const mark of marks) {
    const row = lastOnFirstRow >= 0 && mark.at - lastOnFirstRow < 0.2 ? 1 : 0
    if (row === 0) lastOnFirstRow = mark.at
    placed.push({ ...mark, row })
  }
  return placed
}

export function EnvelopeChart({
  id,
  full,
  low,
  durationSeconds,
  cues,
}: {
  /** Unique per chart: SVG gradient ids are document-global. */
  id: string
  full: number[]
  low: number[]
  durationSeconds: number
  cues: CueCandidates | null
}) {
  const fullPath = monotonePath(normalise(full))
  const lowPath = monotonePath(normalise(low).map((v) => v * 0.9))
  const area = fullPath ? `${fullPath}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z` : ""
  const xOf = (seconds: number) =>
    durationSeconds > 0 ? Math.min(1, Math.max(0, seconds / durationSeconds)) : 0

  const marks = (["entry", "drop", "exit"] as const)
    .map((kind) => cues?.[kind])
    .filter((cue): cue is NonNullable<typeof cue> => Boolean(cue))
    .map((cue) => ({ cue, at: xOf(cue.seconds) }))
    .sort((a, b) => a.at - b.at)

  const labelled = labelRows(marks)

  const minutes = Math.floor(durationSeconds / 60)
  const description = marks.length
    ? marks
        .map(({ cue }) => `${CUE_STYLE[cue.kind].label} ${formatMinutesSeconds(cue.seconds)}`)
        .join(", ")
    : "no CUE candidates"

  return (
    <figure className="m-0">
      <div className="relative h-32 w-full overflow-hidden rounded-xl border border-ec-border bg-ec-sunken sm:h-40">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Energy envelope, ${formatMinutesSeconds(durationSeconds)} long. ${description}.`}
        >
          <defs>
            <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--ec-indigo)" />
              <stop offset="50%" stopColor="var(--ec-violet)" />
              <stop offset="100%" stopColor="var(--ec-cyan)" />
            </linearGradient>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(162,77,224,0.34)" />
              <stop offset="100%" stopColor="rgba(162,77,224,0)" />
            </linearGradient>
          </defs>

          {Array.from({ length: minutes }, (_, i) => {
            const at = ((i + 1) * 60) / durationSeconds
            return at < 1 ? (
              <line
                key={i}
                x1={at * WIDTH}
                x2={at * WIDTH}
                y1={0}
                y2={HEIGHT}
                stroke="rgba(255,255,255,0.05)"
                vectorEffect="non-scaling-stroke"
              />
            ) : null
          })}

          {area ? <path d={area} fill={`url(#${id}-fill)`} /> : null}
          {lowPath ? (
            <path
              d={lowPath}
              fill="none"
              stroke="var(--ec-text-dim)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {fullPath ? (
            <path
              d={fullPath}
              fill="none"
              stroke={`url(#${id}-stroke)`}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: "drop-shadow(0 0 6px rgba(162,77,224,0.55))" }}
            />
          ) : null}

          {marks.map(({ cue, at }) => {
            const style = CUE_STYLE[cue.kind]
            return (
              <line
                key={cue.kind}
                x1={at * WIDTH}
                x2={at * WIDTH}
                y1={0}
                y2={HEIGHT}
                stroke={style.color}
                strokeWidth={2}
                strokeDasharray={style.dash}
                vectorEffect="non-scaling-stroke"
                style={style.glow ? { filter: style.glow } : undefined}
              />
            )
          })}
        </svg>

        {labelled.map(({ cue, at, row }) => {
          const style = CUE_STYLE[cue.kind]
          // Pinned inside the box at the edges instead of centred on the line, so
          // a CUE at 0:00 or at the very end never pushes a label off-screen.
          const shift = at < 0.1 ? "0%" : at > 0.9 ? "-100%" : "-50%"
          return (
            <span
              key={cue.kind}
              className="absolute rounded-full border bg-ec-bg/85 px-2 py-0.5 font-mono text-[11px] font-bold uppercase leading-4 tracking-[0.06em] whitespace-nowrap"
              style={{
                left: `${at * 100}%`,
                top: row === 0 ? 6 : 30,
                transform: `translateX(${shift})`,
                color: style.color,
                borderColor: style.color,
              }}
            >
              {style.label} {formatMinutesSeconds(cue.seconds)}
            </span>
          )
        })}
      </div>
      <figcaption className="mt-1 flex justify-between font-mono text-[11px] text-ec-text-dim">
        <span>0:00</span>
        <span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span aria-hidden className="inline-block h-0.5 w-3 bg-ec-text-dim" />
            low band
          </span>
          {formatMinutesSeconds(durationSeconds)}
        </span>
      </figcaption>
    </figure>
  )
}
