import { CircleCheck, Lightbulb } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ANALYSIS_UI, SEVERITY_LABELS } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { Recommendation } from "@/lib/engine/recommendations"
import type { IssueSeverity, IssueType } from "@/types/analysis"
import type { Track } from "@/types/domain"
import { cn } from "@/lib/utils"

interface IssueListProps {
  recommendations: Recommendation[]
  locale: SiteLocale
  /** Playlist tracks, to resolve "Track 5" into "5 · Artist — Title" chips. */
  tracks: Track[]
}

// Group cards render penalties first (actionable), then heads-ups, then the
// positive reinforcements.
const SEVERITY_ORDER: IssueSeverity[] = ["penalty", "info", "positive"]

interface IssueGroup {
  type: IssueType
  severity: IssueSeverity
  title: string
  items: Recommendation[]
}

/** Groups recommendations by issue type, keeping first-seen order per severity. */
function groupRecommendations(recommendations: Recommendation[]): IssueGroup[] {
  const byType = new Map<IssueType, IssueGroup>()

  for (const recommendation of recommendations) {
    const existing = byType.get(recommendation.issue.type)

    if (existing) {
      existing.items.push(recommendation)
    } else {
      byType.set(recommendation.issue.type, {
        type: recommendation.issue.type,
        severity: recommendation.issue.severity,
        title: recommendation.title,
        items: [recommendation],
      })
    }
  }

  return Array.from(byType.values()).sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )
}

export function IssueList({ recommendations, locale, tracks }: IssueListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ec-border bg-white/[0.02] px-6 py-12 text-center">
        <CircleCheck className="size-8 text-ec-cyan" />
        <p className="text-sm text-ec-text-muted">
          {ANALYSIS_UI.noIssues[locale]}
        </p>
      </div>
    )
  }

  const byPosition = new Map(tracks.map((track) => [track.position, track]))
  const groups = groupRecommendations(recommendations)

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.type}
          className={cn(
            "rounded-2xl border bg-ec-sunken p-4",
            group.severity === "positive"
              ? "border-[#4ADE80]/30"
              : "border-ec-amber/25"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-sm font-semibold text-white">
              {group.title}
            </p>
            {group.severity === "positive" ? (
              <Badge variant="positive">{SEVERITY_LABELS.positive[locale]}</Badge>
            ) : group.severity === "info" ? (
              <Badge>{SEVERITY_LABELS.info[locale]}</Badge>
            ) : null}
          </div>

          <div
            className={cn(
              "mt-3 space-y-4",
              group.items.length > 1 && "divide-y divide-white/[0.05]"
            )}
          >
            {group.items.map((recommendation, index) => (
              <div
                key={`${group.type}-${index}`}
                className={cn(index > 0 && "pt-4", "space-y-2.5")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {recommendation.issue.severity === "penalty" ? (
                    <Badge variant="warning">
                      −{recommendation.issue.penaltyApplied}{" "}
                      {ANALYSIS_UI.points[locale]}
                    </Badge>
                  ) : null}
                  {recommendation.issue.trackPositions.map((position) => {
                    const track = byPosition.get(position)

                    return (
                      <span
                        key={position}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] px-2 py-0.5 text-xs text-white/72"
                      >
                        <span className="font-mono font-bold text-ec-cyan">
                          {position}
                        </span>
                        {track ? (
                          <span className="truncate">
                            {track.artist}
                            <span className="text-white/38"> — </span>
                            {track.name}
                          </span>
                        ) : null}
                      </span>
                    )
                  })}
                </div>

                <p className="text-sm leading-6 text-white/62">
                  {recommendation.body}
                </p>

                <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/18 p-3 text-sm leading-6 text-white/72">
                  <Lightbulb className="mt-1 size-3.5 shrink-0 text-ec-amber" />
                  {recommendation.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
