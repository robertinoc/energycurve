import { SetCurve } from "@/components/playlists/set-curve"
import {
  BLOG_FIGURE_COPY,
  EXAMPLE_GENRE,
  SET_ORDER_EXAMPLE,
  flaggedTransitions,
  formatStep,
  toleranceRows,
  type BlogFigureId,
} from "@/lib/blog/figures"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  GENRE_LABELS,
  GENRE_TRANSITION_TOLERANCE_V2,
} from "@/lib/product/strategy"

/**
 * The figures an article embeds with a ```figure fence (lote 22).
 *
 * Server-rendered, so the SVG and its label are in the HTML a crawler reads.
 * Each one is a `role="img"` whose label says what it shows — the numbers, not
 * «chart» — and prints the same numbers as text underneath, because an SVG
 * path is invisible to a screen reader and to an answer engine.
 */
export function BlogFigure({
  id,
  locale,
}: {
  id: BlogFigureId
  locale: SiteLocale
}) {
  switch (id) {
    case "set-order-example":
      return <SetOrderFigure locale={locale} />
    case "transition-tolerance":
      return <ToleranceFigure locale={locale} />
  }
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))

function SetOrderFigure({ locale }: { locale: SiteLocale }) {
  const copy = BLOG_FIGURE_COPY.setOrder
  const tolerance = GENRE_TRANSITION_TOLERANCE_V2[EXAMPLE_GENRE]

  const panels = [
    { label: copy.before[locale], scores: SET_ORDER_EXAMPLE.before },
    { label: copy.after[locale], scores: SET_ORDER_EXAMPLE.after },
  ].map((panel) => {
    const flagged = flaggedTransitions(panel.scores)
    const visible = flagged.length
      ? flagged
          .map((t) => `${formatStep(t.delta, locale)} (${fill(copy.between[locale], t)})`)
          .join(", ")
      : copy.none[locale]
    const spoken = flagged.length
      ? flagged
          .map((t) => `${formatStep(t.delta, locale)} ${fill(copy.betweenSpoken[locale], t)}`)
          .join(", ")
      : copy.none[locale]

    return {
      ...panel,
      visible,
      ariaLabel: `${panel.label}: ${copy.energy[locale]} ${panel.scores.join(", ")}. ${copy.flagged[locale]}: ${spoken}.`,
    }
  })

  return (
    <figure className="not-prose my-6 flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
      <figcaption className="font-heading text-base font-semibold text-white">
        {copy.title[locale]}
      </figcaption>

      {panels.map((panel) => (
        <div key={panel.label} className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {panel.label}
          </span>
          <div className="w-full overflow-hidden">
            <SetCurve
              scores={panel.scores}
              target={null}
              hoveredIndex={null}
              ariaLabel={panel.ariaLabel}
            />
          </div>
          <p className="text-xs text-white/60">
            {panel.scores.join(" · ")}
            <span className="text-white/40"> — </span>
            {copy.flagged[locale]}: {panel.visible}
          </p>
        </div>
      ))}

      <p className="text-sm leading-6 text-white/64">
        {fill(copy.caption[locale], {
          rise: formatStep(tolerance.rise, locale).slice(1),
          drop: formatStep(tolerance.drop, locale).slice(1),
          genre: GENRE_LABELS[EXAMPLE_GENRE],
        })}
      </p>
    </figure>
  )
}

/* Sized for a phone: the viewBox is close to a 390px screen's content width,
   so the labels render at about their font size there and scale up on a
   desktop, instead of shrinking to unreadable on the screen most DJs use. */
const W = 360
const LABEL_X = 0
const AXIS_X = 235
const ROW_H = 24
const TOP = 26
const BAR_H = 12

function ToleranceFigure({ locale }: { locale: SiteLocale }) {
  const copy = BLOG_FIGURE_COPY.tolerance
  const rows = toleranceRows()
  const max = Math.max(...rows.flatMap((r) => [r.rise, r.drop]))
  const unit = 96 / max
  const height = TOP + rows.length * ROW_H + 4

  const ariaLabel = `${copy.title[locale]}. ${rows
    .map(
      (r) =>
        `${r.label}: ${copy.rise[locale].toLowerCase()} ${formatStep(r.rise, locale)}, ${copy.drop[locale].toLowerCase()} ${formatStep(-r.drop, locale)}`
    )
    .join("; ")}.`

  return (
    <figure className="not-prose my-6 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
      <figcaption className="font-heading text-base font-semibold text-white">
        {copy.title[locale]}
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full max-w-[560px]"
        role="img"
        aria-label={ariaLabel}
      >
        <text x={AXIS_X - 6} y={14} textAnchor="end" fontSize={11} fill="#9DB0FF">
          ← {copy.drop[locale]}
        </text>
        <text x={AXIS_X + 6} y={14} fontSize={11} fill="#FF8AC0">
          {copy.rise[locale]} →
        </text>
        <line
          x1={AXIS_X}
          y1={TOP - 6}
          x2={AXIS_X}
          y2={height - 2}
          stroke="rgba(255,255,255,0.25)"
        />

        {rows.map((r, i) => {
          const y = TOP + i * ROW_H
          const mid = y + ROW_H / 2
          const dropW = r.drop * unit
          const riseW = r.rise * unit

          return (
            <g key={r.genre}>
              <text x={LABEL_X} y={mid + 4} fontSize={12} fill="rgba(255,255,255,0.78)">
                {r.label}
              </text>
              <rect
                x={AXIS_X - dropW}
                y={mid - BAR_H / 2}
                width={dropW}
                height={BAR_H}
                rx={3}
                fill="#4C6EF5"
                fillOpacity={0.75}
              />
              <rect
                x={AXIS_X}
                y={mid - BAR_H / 2}
                width={riseW}
                height={BAR_H}
                rx={3}
                fill="#F0348A"
                fillOpacity={0.75}
              />
              <text
                x={AXIS_X - dropW - 4}
                y={mid + 4}
                textAnchor="end"
                fontSize={11}
                fill="rgba(255,255,255,0.7)"
              >
                {formatStep(-r.drop, locale)}
              </text>
              <text x={AXIS_X + riseW + 4} y={mid + 4} fontSize={11} fill="rgba(255,255,255,0.7)">
                {formatStep(r.rise, locale)}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="text-sm leading-6 text-white/64">{copy.caption[locale]}</p>
    </figure>
  )
}
