import { Clock3, Compass } from "lucide-react"

import type { PlaylistAnalysis } from "@/types/analysis"

const CONTEXT_LABELS: Record<string, string> = {
  opening: "Opening",
  main: "Main time",
  closing: "Closing",
}

interface SetScoreCardProps {
  analysis: PlaylistAnalysis
  durationMinutes: number
}

interface PenaltyRow {
  label: string
  value: number
}

export function SetScoreCard({ analysis, durationMinutes }: SetScoreCardProps) {
  const { breakdown } = analysis

  const penaltyRows: PenaltyRow[] = [
    { label: "Abrupt drops", value: breakdown.dropPenalty },
    { label: "Flat zones", value: breakdown.flatZonePenalty },
    { label: "Context errors", value: breakdown.contextPenalty },
    { label: "Genre errors", value: breakdown.genrePenalty },
  ].filter((row) => row.value > 0)

  const bestFitIsCurrent = analysis.bestFitContext === analysis.context

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,34,0.96),rgba(20,20,27,0.96))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <p className="text-xs uppercase tracking-[0.22em] text-white/42">
        Set score
      </p>

      <div className="mt-3 flex items-end gap-3">
        <span className="font-heading text-6xl font-semibold text-white">
          {analysis.setScore}
        </span>
        <span className="pb-2 text-lg text-white/42">/ 10</span>
      </div>

      <div className="mt-5 space-y-2 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/58">Starting score</span>
          <span className="font-mono text-white">
            {breakdown.startingScore}
          </span>
        </div>
        {penaltyRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-white/58">{row.label}</span>
            <span className="font-mono text-[#FF7AA8]">−{row.value}</span>
          </div>
        ))}
        {penaltyRows.length === 0 ? (
          <p className="text-sm text-emerald-400">
            No penalties — this flow holds up.
          </p>
        ) : null}
        {breakdown.rawScore < breakdown.finalScore ? (
          <div className="flex items-center justify-between border-t border-white/8 pt-2 text-sm">
            <span className="text-white/58">Clamped to minimum</span>
            <span className="font-mono text-white">1</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <p className="flex items-center gap-2 text-white/58">
          <Clock3 className="size-3.5 shrink-0" />
          Estimated duration: ~{durationMinutes} min
        </p>
        <p className="flex items-start gap-2 text-white/58">
          <Compass className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {bestFitIsCurrent ? (
              <>
                Best fit:{" "}
                <span className="text-white">
                  {CONTEXT_LABELS[analysis.bestFitContext]}
                </span>{" "}
                — matches this playlist&apos;s context.
              </>
            ) : (
              <>
                This curve scores higher as{" "}
                <span className="text-white">
                  {CONTEXT_LABELS[analysis.bestFitContext]}
                </span>{" "}
                ({analysis.contextScores[analysis.bestFitContext]}/10 vs{" "}
                {analysis.setScore}/10 as{" "}
                {CONTEXT_LABELS[analysis.context]?.toLowerCase()}).
              </>
            )}
          </span>
        </p>
      </div>
    </div>
  )
}
