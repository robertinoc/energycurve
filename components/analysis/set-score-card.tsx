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

const GAUGE_SIZE = 168
const GAUGE_STROKE = 12
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS

/** Circular score gauge per brand kit §4 — gradient ring + gradient mono number. */
function ScoreGauge({ score }: { score: number }) {
  const progress = Math.min(Math.max(score / 10, 0), 1)

  return (
    <div className="relative mx-auto h-[168px] w-[168px]">
      <svg
        viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Set score ${score} out of 10`}
      >
        <defs>
          <linearGradient id="score-gauge-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4C6EF5" />
            <stop offset="0.55" stopColor="#A24DE0" />
            <stop offset="1" stopColor="#F0348A" />
          </linearGradient>
        </defs>
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="#1C1730"
          strokeWidth={GAUGE_STROKE}
        />
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="url(#score-gauge-stroke)"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={GAUGE_CIRCUMFERENCE * (1 - progress)}
          style={{ filter: "drop-shadow(0 0 8px rgba(162,77,224,0.45))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="ec-gradient-text font-mono text-5xl font-bold leading-none">
          {score}
        </span>
        <span className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ec-text-dim">
          Out of 10
        </span>
      </div>
    </div>
  )
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
    <div className="rounded-2xl border border-ec-border bg-ec-surface p-6">
      <p className="ec-eyebrow">Set score</p>

      <div className="mt-5">
        <ScoreGauge score={analysis.setScore} />
      </div>

      <div className="mt-6 space-y-2 rounded-xl border border-ec-border bg-ec-sunken p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ec-text-muted">Starting score</span>
          <span className="font-mono text-ec-text">
            {breakdown.startingScore}
          </span>
        </div>
        {penaltyRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-ec-text-muted">{row.label}</span>
            <span className="font-mono text-ec-amber">−{row.value}</span>
          </div>
        ))}
        {penaltyRows.length === 0 ? (
          <p className="text-sm text-ec-cyan">
            No penalties — this flow holds up.
          </p>
        ) : null}
        {breakdown.rawScore < breakdown.finalScore ? (
          <div className="flex items-center justify-between border-t border-ec-border pt-2 text-sm">
            <span className="text-ec-text-muted">Clamped to minimum</span>
            <span className="font-mono text-ec-text">1</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <p className="flex items-center gap-2 text-ec-text-muted">
          <Clock3 className="size-3.5 shrink-0" />
          Estimated duration: ~{durationMinutes} min
        </p>
        <p className="flex items-start gap-2 text-ec-text-muted">
          <Compass className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {bestFitIsCurrent ? (
              <>
                Best fit:{" "}
                <span className="text-ec-text">
                  {CONTEXT_LABELS[analysis.bestFitContext]}
                </span>{" "}
                — matches this playlist&apos;s context.
              </>
            ) : (
              <>
                This curve scores higher as{" "}
                <span className="text-ec-text">
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
