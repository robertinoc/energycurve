import { ArrowRight } from "lucide-react"

import type { ResolvedSiteCopy } from "@/lib/content/site-copy"

/**
 * Where EnergyCurve sits: between what the DJ picks and what the floor hears.
 *
 * This is the product's whole position in one picture, and until now it existed
 * only as a sentence buried in a FAQ answer. Two variants of the same idea —
 * `strip` runs across the top of the hero, `full` is the differentiation
 * section's main graphic.
 *
 * Drawn with layout and CSS rather than a hand-authored SVG so the labels stay
 * real text: translatable, selectable, and readable by a crawler.
 */

function Plate({
  heading,
  caption,
  children,
  accent = false,
}: {
  heading: string
  caption?: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={
        accent
          ? "relative flex-1 overflow-hidden rounded-[18px] border border-transparent bg-[linear-gradient(#0C0917,#0C0917)_padding-box,var(--ec-gradient)_border-box] p-5 shadow-[0_0_44px_rgba(162,77,224,0.14)]"
          : "flex-1 rounded-[18px] border border-white/10 bg-ec-surface p-5"
      }
      style={accent ? { borderWidth: 1.5 } : undefined}
    >
      <p className={accent ? "ec-eyebrow" : "ec-eyebrow text-white/50"}>{heading}</p>
      <div className="mt-3">{children}</div>
      {caption ? (
        <p className="mt-3 border-t border-white/8 pt-2.5 text-[0.78rem] leading-5 text-white/50">
          {caption}
        </p>
      ) : null}
    </div>
  )
}

/** The curve, drawn small — the layer's own signature inside the middle plate. */
function MiniCurve() {
  return (
    <svg
      viewBox="0 0 240 44"
      className="mt-3 h-11 w-full"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="layer-curve" x1="0" y1="0" x2="240" y2="0">
          <stop offset="0" stopColor="#A24DE0" />
          <stop offset="0.5" stopColor="#5468E8" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path
        d="M4 38 C 34 36, 52 20, 80 14 C 110 8, 132 24, 158 18 C 186 11, 206 26, 236 8"
        fill="none"
        stroke="url(#layer-curve)"
        strokeWidth="3"
        strokeLinecap="round"
        className="ec-curve-glow"
      />
      <circle cx="80" cy="14" r="4" fill="#F0348A" />
      <circle cx="236" cy="8" r="4" fill="#22D3EE" />
    </svg>
  )
}

function Flow() {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center py-2 lg:py-0"
    >
      <ArrowRight className="size-5 rotate-90 text-white/30 lg:rotate-0" />
    </div>
  )
}

export function LayerDiagram({
  copy,
  variant = "full",
}: {
  copy: ResolvedSiteCopy
  variant?: "full" | "strip"
}) {
  const { layer } = copy
  const full = variant === "full"

  return (
    <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch lg:gap-3">
      <Plate heading={layer.toolsHeading} caption={full ? layer.toolsCaption : undefined}>
        <ul className="grid gap-2">
          {layer.toolsItems.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-white/8 bg-black/25 px-3 py-2 text-[0.82rem] leading-5 text-white/72"
            >
              {item}
            </li>
          ))}
        </ul>
      </Plate>

      <Flow />

      <Plate
        heading={layer.engineHeading}
        caption={full ? layer.engineCaption : undefined}
        accent
      >
        <p className="text-[0.88rem] leading-6 text-white/78">{layer.engineBody}</p>
        <MiniCurve />
      </Plate>

      <Flow />

      <Plate heading={layer.stageHeading} caption={full ? layer.stageCaption : undefined}>
        <p className="text-[0.88rem] leading-6 text-white/78">{layer.stageBody}</p>
      </Plate>
    </div>
  )
}
