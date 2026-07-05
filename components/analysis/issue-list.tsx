import { CircleCheck, Lightbulb } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Recommendation } from "@/lib/engine/recommendations"

interface IssueListProps {
  recommendations: Recommendation[]
}

export function IssueList({ recommendations }: IssueListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ec-border bg-white/[0.02] px-6 py-12 text-center">
        <CircleCheck className="size-8 text-ec-cyan" />
        <p className="text-sm text-ec-text-muted">
          No issues detected — the flow, context, and genre expectations all
          line up.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <div
          key={`${recommendation.issue.type}-${index}`}
          className="rounded-2xl border border-ec-border bg-ec-sunken p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-sm font-semibold text-white">
              {recommendation.title}
            </p>
            {recommendation.issue.severity === "penalty" ? (
              <Badge variant="warning">
                −{recommendation.issue.penaltyApplied} pts
              </Badge>
            ) : (
              <Badge>Heads-up</Badge>
            )}
            {recommendation.issue.trackPositions.length > 0 ? (
              <span className="text-xs text-white/42">
                Track{recommendation.issue.trackPositions.length > 1 ? "s" : ""}{" "}
                {recommendation.issue.trackPositions.join(", ")}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm leading-6 text-white/62">
            {recommendation.body}
          </p>

          <p className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-black/18 p-3 text-sm leading-6 text-white/72">
            <Lightbulb className="mt-1 size-3.5 shrink-0 text-ec-amber" />
            {recommendation.action}
          </p>
        </div>
      ))}
    </div>
  )
}
