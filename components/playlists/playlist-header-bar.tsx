import type { ReactNode } from "react"

/**
 * The action bar at the top of a playlist, in its two forms
 * (lib/playlists/analyze-prompt.ts decides which).
 *
 * `peer` is the row as it always was: every action in one line, the analysis
 * last. It is right for a set that has an analysis — exporting, sharing the
 * curve and comparing are what you do next, and the analysis is one click
 * among them.
 *
 * `lead` is for a set nobody analysed yet. The same row treated all of those
 * as equals when most of them only mean something *after* an analysis, and
 * "Analyze set" read as a sibling of "Export". Here the analysis comes first
 * with a line saying what it gives, and the rest step back into a labelled
 * group underneath: still one tap away, no longer competing.
 *
 * Both forms wrap. The single row never did, and at phone width seven
 * controls in a non-wrapping flex pushed the page sideways. The row of actions
 * is `relative` in both so the export menu can open across it on a phone
 * (`menuSpansRow` in playlist-export-button.tsx).
 */
export function PlaylistHeaderBar({
  emphasis,
  back,
  analyze,
  secondary,
  hint,
  moreLabel,
}: {
  emphasis: "lead" | "peer"
  back: ReactNode
  analyze: ReactNode
  secondary: ReactNode
  /** What the analysis gives. Only shown when it leads. */
  hint: string
  /** Accessible name of the group the other actions step back into. */
  moreLabel: string
}) {
  if (emphasis === "peer") {
    return (
      <div
        data-emphasis="peer"
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
      >
        {back}
        <div className="relative flex flex-wrap items-center gap-2">
          {secondary}
          {analyze}
        </div>
      </div>
    )
  }

  return (
    <div data-emphasis="lead" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {back}
        <div className="flex flex-col gap-1.5 sm:flex-row-reverse sm:items-center sm:gap-3">
          {analyze}
          <p className="text-xs text-ec-text-muted sm:text-right">{hint}</p>
        </div>
      </div>
      <div
        role="group"
        aria-label={moreLabel}
        className="relative flex flex-wrap items-center gap-x-1 gap-y-1 sm:justify-end"
      >
        {secondary}
      </div>
    </div>
  )
}
