import { ArrowRight } from "lucide-react"

import type { ReorderSuggestion } from "@/lib/engine/recommendations"
import type { Track } from "@/types/domain"

interface OrderComparisonProps {
  tracks: Track[]
  originalScore: number
  reorder: ReorderSuggestion
}

function TrackColumn({
  title,
  score,
  entries,
  highlight,
}: {
  title: string
  score: number
  entries: Track[]
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
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">
          {title}
        </p>
        <span className="font-mono text-lg font-bold text-white">
          {score}/10
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

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-white/58">{reorder.rationale}</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <TrackColumn
          title="Current order"
          score={originalScore}
          entries={tracks}
        />
        <ArrowRight className="mx-auto hidden size-5 text-white/32 lg:block" />
        <TrackColumn
          title="Suggested order"
          score={reorder.suggestedAnalysis.setScore}
          entries={suggestedTracks}
          highlight
        />
      </div>
    </div>
  )
}
