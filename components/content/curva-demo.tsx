import { SetCurve } from "@/components/playlists/set-curve"
import { COMPONENT_COPY, CURVE_DEMOS } from "@/lib/content/content-copy"
import type { CurveShape } from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * An example curve, embedded in a piece of content.
 *
 * Reuses `components/playlists/set-curve.tsx` — the same chart the product
 * draws a real set with — rather than a second chart that would drift from it.
 * It is a client component, but it renders on the server too, so the SVG is in
 * the HTML a crawler receives.
 *
 * The numbers underneath are not decoration. An SVG path is invisible to a
 * screen reader and to an answer engine, so the same ten values are also
 * printed as a list: what the chart shows, in text, for anyone who cannot see
 * the chart.
 */
export function CurvaDemo({
  shape,
  locale,
}: {
  shape: CurveShape
  locale: SiteLocale
}) {
  const demo = CURVE_DEMOS[shape]

  return (
    <figure className="my-6 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
      <figcaption className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
          {COMPONENT_COPY.curveAlt[locale]}
        </span>
        <span className="font-heading text-base font-semibold text-white">
          {demo.label[locale]}
        </span>
      </figcaption>

      {/* Full width inside its card and no minimum, so several of these on one
          page cannot push the layout sideways on a phone — the failure the
          Camelot wheel had in #232. */}
      <div className="w-full overflow-hidden">
        <SetCurve scores={demo.scores} target={null} hoveredIndex={null} />
      </div>

      <p className="text-sm leading-6 text-white/64">{demo.caption[locale]}</p>

      <p className="text-xs text-white/50">
        {demo.scores.join(" · ")}
      </p>
    </figure>
  )
}
