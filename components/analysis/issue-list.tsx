import { CircleCheck, Lightbulb } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Recommendation } from "@/lib/engine/recommendations"

interface IssueListProps {
  recommendations: Recommendation[]
}

export function IssueList({ recommendations }: IssueListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[26px] border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
        <CircleCheck className="size-8 text-emerald-400" />
        <p className="text-sm text-white/58">
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
          className="rounded-[22px] border border-white/10 bg-[#17171F] p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-sm font-semibold text-white">
              {recommendation.title}
            </p>
            {recommendation.issue.severity === "penalty" ? (
              <Badge className="border-[#FF2D75]/30 bg-[#FF2D75]/12 text-[#FF9DBE]">
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
            <Lightbulb className="mt-1 size-3.5 shrink-0 text-[#FFD166]" />
            {recommendation.action}
          </p>
        </div>
      ))}
    </div>
  )
}
