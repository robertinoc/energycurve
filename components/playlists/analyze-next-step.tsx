import { AudioWaveform } from "lucide-react"

import { AnalyzeLink } from "@/components/playlists/analyze-link"
import { buttonVariants } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.analyzeNext

/**
 * Said once, on arrival, to someone whose set was never analysed: what the
 * analysis gives, and the way in (lib/playlists/analyze-prompt.ts decides
 * when).
 *
 * In the page, not over it. No modal, no tour, nothing to close: it scrolls
 * away with the rest, and it is gone by itself once the set has an analysis or
 * is no longer new. `embedded` is the same note as the last thing the import
 * summary says — the summary used to end in a link to a documentation page,
 * which was the only thing to click at the one moment the person was reading.
 */
export function AnalyzeNextStep({
  playlistId,
  locale,
  embedded = false,
}: {
  playlistId: string
  locale: SiteLocale
  embedded?: boolean
}) {
  return (
    <div
      data-testid="analyze-next-step"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        embedded
          ? "mt-3 border-t border-ec-border pt-3"
          : "rounded-xl border border-ec-border bg-ec-surface p-4"
      )}
    >
      <div className="min-w-0">
        <p className="ec-eyebrow">{COPY.eyebrow[locale]}</p>
        <p className="mt-1 font-heading text-base font-bold text-ec-text">
          {COPY.title[locale]}
        </p>
        <p className="mt-1 max-w-prose text-[13px] leading-5 text-ec-text-muted">
          {COPY.body[locale]}
        </p>
      </div>

      <AnalyzeLink
        playlistId={playlistId}
        placement={embedded ? "import_summary" : "next_step"}
        firstAnalysis
        locale={locale}
        className={cn(
          buttonVariants({ variant: embedded ? "secondary" : "default", size: "lg" }),
          "w-full sm:w-auto"
        )}
      >
        <AudioWaveform className="size-4" />
        {DASHBOARD_COPY.playlistDetail.analyzeSet[locale]}
      </AnalyzeLink>
    </div>
  )
}
