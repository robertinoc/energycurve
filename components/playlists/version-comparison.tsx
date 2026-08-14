"use client"

import { formatTemplate } from "@/lib/content/analysis-copy"
import { curveDomain } from "@/lib/playlists/version-diff"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { VersionComparison } from "@/services/version-service"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.versions

/**
 * What changed between a stored order and the one the set is in now.
 *
 * Ordered by what a DJ reads first: the score, then the tracks that never got
 * played, then what moved. "Never played" comes before "moved" on purpose — a
 * skipped track is a decision, a shuffled one is often just the night.
 */
export function VersionComparisonView({
  comparison,
  locale,
}: {
  comparison: VersionComparison
  locale: SiteLocale
}) {
  const { diff, scoreBefore, scoreAfter, delta } = comparison

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
      <ScoreLine
        before={scoreBefore}
        after={scoreAfter}
        delta={delta}
        locale={locale}
      />

      {diff.curves ? (
        <CurveOverlay curves={diff.curves} locale={locale} />
      ) : (
        <p className="mt-2 text-xs leading-5 text-white/35">
          {COPY.diffCurveMissing[locale]}
        </p>
      )}

      {diff.identical ? (
        <p className="mt-3 text-sm text-white/58">{COPY.diffIdentical[locale]}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {diff.removed.length > 0 ? (
            <Group title={COPY.diffSkipped[locale]} tone="warn">
              {diff.removed.map((track) => (
                <Row key={track.trackId}>
                  {track.artist} — {track.name}
                </Row>
              ))}
            </Group>
          ) : null}

          {diff.added.length > 0 ? (
            <Group title={COPY.diffAdded[locale]} tone="accent">
              {diff.added.map((track) => (
                <Row key={track.trackId}>
                  {track.artist} — {track.name}
                </Row>
              ))}
            </Group>
          ) : null}

          {diff.moved.length > 0 ? (
            <Group title={COPY.diffMoved[locale]}>
              {diff.moved.map((track) => (
                <Row key={track.trackId}>
                  <span className="tabular-nums text-white/40">
                    {formatTemplate(COPY.diffMovedBy[locale], {
                      from: String(track.from),
                      to: String(track.to),
                    })}
                  </span>{" "}
                  {track.artist} — {track.name}
                </Row>
              ))}
            </Group>
          ) : null}

          {diff.unchangedCount > 0 ? (
            <p className="text-xs text-white/35">
              {formatTemplate(COPY.diffUnchanged[locale], {
                count: String(diff.unchangedCount),
              })}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ScoreLine({
  before,
  after,
  delta,
  locale,
}: {
  before: number | null
  after: number | null
  delta: number | null
  locale: SiteLocale
}) {
  if (before === null || after === null || delta === null) {
    return (
      <p className="text-xs leading-5 text-white/40">
        {COPY.diffScoreUnknown[locale]}
      </p>
    )
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-white/48">{COPY.diffScore[locale]}</span>
      <span className="tabular-nums text-white/70">{before.toFixed(1)}</span>
      <span className="text-white/30">→</span>
      <span className="font-semibold tabular-nums text-white">
        {after.toFixed(1)}
      </span>
      <span
        className={cn(
          "tabular-nums text-xs font-semibold",
          // Zero is deliberately neutral: "no change" is not a win or a loss, and
          // colouring it green would congratulate the DJ for nothing.
          delta > 0
            ? "text-ec-cyan"
            : delta < 0
              ? "text-ec-error"
              : "text-white/35"
        )}
      >
        {delta > 0 ? "+" : ""}
        {delta.toFixed(1)}
      </span>
    </p>
  )
}

/**
 * Both curves on one set of axes.
 *
 * The horizontal span is shared even when the two orders have different lengths:
 * the x axis reads as progress through the set, not as a track number, because
 * comparing track 8 of nine against track 8 of eight would say nothing.
 */
function CurveOverlay({
  curves,
  locale,
}: {
  curves: { before: number[]; after: number[] }
  locale: SiteLocale
}) {
  const width = 560
  const height = 72
  const pad = 4
  const { min, max } = curveDomain([...curves.before, ...curves.after])

  const y = (energy: number) =>
    pad + (1 - (energy - min) / (max - min)) * (height - pad * 2)

  const points = (values: number[]) =>
    values
      .map((energy, index) => {
        const axis = 24
        const x =
          values.length === 1
            ? (axis + width) / 2
            : axis + (index / (values.length - 1)) * (width - axis)

        return `${x.toFixed(1)},${y(energy).toFixed(1)}`
      })
      .join(" ")

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-hidden="true">
        {/* Labelled bounds, so a cropped axis can still be read as numbers. */}
        <text x={0} y={y(max) + 3} fontSize={9} fill="currentColor" className="text-white/30">
          {max.toFixed(1)}
        </text>
        <text x={0} y={y(min) + 3} fontSize={9} fill="currentColor" className="text-white/30">
          {min.toFixed(1)}
        </text>
        <polyline
          points={points(curves.before)}
          fill="none"
          stroke="currentColor"
          className="text-white/30"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <polyline
          points={points(curves.after)}
          fill="none"
          stroke="currentColor"
          className="text-ec-cyan"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[10px] uppercase tracking-wide text-white/35">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-4 border-t border-dashed border-white/40" />
          {COPY.curveBefore[locale]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-ec-cyan" />
          {COPY.curveAfter[locale]}
        </span>
      </div>
    </div>
  )
}

function Group({
  title,
  tone,
  children,
}: {
  title: string
  tone?: "warn" | "accent"
  children: React.ReactNode
}) {
  return (
    <div>
      <h3
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          tone === "warn"
            ? "text-ec-error/80"
            : tone === "accent"
              ? "text-ec-cyan/80"
              : "text-white/40"
        )}
      >
        {title}
      </h3>
      <ul className="mt-1 space-y-0.5">{children}</ul>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <li className="text-xs leading-5 text-white/62">{children}</li>
}
