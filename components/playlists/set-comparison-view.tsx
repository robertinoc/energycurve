import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { curveDomain } from "@/lib/playlists/version-diff"
import type { SetComparison } from "@/lib/playlists/set-comparison"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.compare

export interface ComparedSet {
  name: string
  score: number | null
  /** Share of transitions that are harmonic, 0…1, or null when no keys. */
  harmonyRatio: number | null
  curve: number[]
}

/**
 * Two sets side by side.
 *
 * Reads top-down in the order the question gets asked: how did each one score,
 * what shape did each have, and — the residency question — what did I play in
 * both.
 */
export function SetComparisonView({
  a,
  b,
  comparison,
  locale,
}: {
  a: ComparedSet
  b: ComparedSet
  comparison: SetComparison
  locale: SiteLocale
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SetCard set={a} label={COPY.scoreA[locale]} locale={locale} accent />
        <SetCard set={b} label={COPY.scoreB[locale]} locale={locale} />
      </div>

      <CurveOverlay a={a} b={b} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">
          {COPY.overlapTitle[locale]}
        </h2>

        {comparison.shared.length === 0 ? (
          <p className="mt-1.5 text-sm leading-6 text-white/56">
            {COPY.overlapNone[locale]}
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-white/40">
              {formatTemplate(COPY.overlapRatio[locale], {
                percent: Math.round(comparison.overlapRatio * 100),
              })}
            </p>
            <ul className="mt-3 space-y-1">
              {comparison.shared.map((track) => (
                <li
                  key={`${track.artist}-${track.name}`}
                  className="flex flex-wrap items-baseline gap-x-2 text-sm text-white/72"
                >
                  <span className="font-medium text-white">{track.artist}</span>
                  <span className="text-white/45">— {track.name}</span>
                  <span className="text-xs tabular-nums text-white/35">
                    {formatTemplate(COPY.positions[locale], {
                      a: track.positionA,
                      b: track.positionB,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <OnlyList title={COPY.onlyA[locale]} tracks={comparison.onlyInA} />
        <OnlyList title={COPY.onlyB[locale]} tracks={comparison.onlyInB} />
      </div>
    </div>
  )
}

function SetCard({
  set,
  label,
  locale,
  accent,
}: {
  set: ComparedSet
  label: string
  locale: SiteLocale
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-white">
        {set.name}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            accent ? "text-ec-cyan" : "text-white/72"
          )}
        >
          {set.score === null ? "—" : set.score.toFixed(1)}
        </span>
        {set.harmonyRatio === null ? null : (
          <span className="text-xs text-white/40">
            {COPY.harmony[locale]} {Math.round(set.harmonyRatio * 100)}%
          </span>
        )}
      </p>
    </div>
  )
}

/**
 * Both curves on one axis.
 *
 * Same shared-and-cropped transform as the version comparison — including its
 * minimum span, so two sets that genuinely run at similar energy don't get
 * dramatised into looking different.
 */
function CurveOverlay({ a, b }: { a: ComparedSet; b: ComparedSet }) {
  if (a.curve.length < 2 || b.curve.length < 2) {
    return null
  }

  const width = 640
  const height = 110
  const pad = 8
  const axis = 26
  const { min, max } = curveDomain([...a.curve, ...b.curve])

  const y = (energy: number) =>
    pad + (1 - (energy - min) / (max - min)) * (height - pad * 2)

  const points = (values: number[]) =>
    values
      .map(
        (energy, index) =>
          `${(axis + (index / (values.length - 1)) * (width - axis)).toFixed(1)},${y(energy).toFixed(1)}`
      )
      .join(" ")

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-hidden="true">
        <text x={0} y={y(max) + 3} fontSize={9} fill="currentColor" className="text-white/30">
          {max.toFixed(1)}
        </text>
        <text x={0} y={y(min) + 3} fontSize={9} fill="currentColor" className="text-white/30">
          {min.toFixed(1)}
        </text>
        <polyline
          points={points(b.curve)}
          fill="none"
          stroke="currentColor"
          className="text-white/30"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <polyline
          points={points(a.curve)}
          fill="none"
          stroke="currentColor"
          className="text-ec-cyan"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
    </section>
  )
}

function OnlyList({
  title,
  tracks,
}: {
  title: string
  tracks: readonly { artist: string; name: string }[]
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
        {title}
      </h3>
      <ul className="mt-2 space-y-0.5">
        {tracks.map((track) => (
          <li
            key={`${track.artist}-${track.name}`}
            className="truncate text-xs leading-5 text-white/56"
          >
            {track.artist} — {track.name}
          </li>
        ))}
      </ul>
    </section>
  )
}
