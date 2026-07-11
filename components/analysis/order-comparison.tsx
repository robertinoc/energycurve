import { ArrowRight, Music2 } from "lucide-react"

import type { HarmonyAssessment } from "@/lib/engine/harmony"
import type { ReorderSuggestion } from "@/lib/engine/recommendations"
import type { Track } from "@/types/domain"

interface OrderComparisonProps {
  tracks: Track[]
  originalScore: number
  reorder: ReorderSuggestion
}

/** "Harmonic 29/34" — perfect+smooth+boost transitions over known ones (B20). */
function HarmonyBadge({
  harmony,
  improved,
}: {
  harmony: HarmonyAssessment
  improved: boolean
}) {
  const compatible = harmony.harmonicCount + harmony.boostCount

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${
        improved
          ? "border-[#4ADE80]/40 bg-[#4ADE80]/[0.09] text-[#86efac]"
          : "border-white/14 bg-white/[0.04] text-white/62"
      }`}
    >
      <Music2 className="size-3" />
      {compatible}/{harmony.knownTransitions}
    </span>
  )
}

function TrackColumn({
  title,
  score,
  entries,
  harmony,
  harmonyImproved,
  highlight,
}: {
  title: string
  score: number
  entries: Track[]
  harmony: HarmonyAssessment | null
  harmonyImproved?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        highlight
          ? "border-[#22D3EE]/30 bg-[#22D3EE]/[0.05]"
          : "border-white/10 bg-black/18"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">
          {title}
        </p>
        <span className="flex items-center gap-2">
          {harmony ? (
            <HarmonyBadge
              harmony={harmony}
              improved={Boolean(harmonyImproved)}
            />
          ) : null}
          <span className="font-mono text-lg font-bold text-white">
            {score}/10
          </span>
        </span>
      </div>
      <ol className="space-y-1.5">
        {entries.map((track, index) => (
          <li
            key={track.id}
            className="flex items-baseline gap-3 text-sm"
          >
            <span className="w-5 shrink-0 font-mono text-xs text-white/38">
              {index + 1}
            </span>
            <span className="min-w-0 truncate text-white/82">
              {track.artist}
              <span className="text-white/38"> — </span>
              {track.name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function OrderComparison({
  tracks,
  originalScore,
  reorder,
}: OrderComparisonProps) {
  const byPosition = new Map(tracks.map((track) => [track.position, track]))
  const suggestedTracks = reorder.suggestedOrder
    .map((position) => byPosition.get(position))
    .filter((track): track is Track => Boolean(track))

  const harmonyImproved =
    reorder.harmony !== null &&
    reorder.harmony.after.ratio > reorder.harmony.before.ratio

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-white/58">{reorder.rationale}</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <TrackColumn
          title="Current order"
          score={originalScore}
          entries={tracks}
          harmony={reorder.harmony?.before ?? null}
        />
        <ArrowRight className="mx-auto hidden size-5 text-white/32 lg:block" />
        <TrackColumn
          title="Suggested order"
          score={reorder.suggestedAnalysis.setScore}
          entries={suggestedTracks}
          harmony={reorder.harmony?.after ?? null}
          harmonyImproved={harmonyImproved}
          highlight
        />
      </div>
    </div>
  )
}
