"use client"

import { useMemo, useState, useTransition } from "react"

import { reorderTracksAction } from "@/app/dashboard/playlists/actions"
import { GenreNote } from "@/components/playlists/genre-note"
import { SetCurve } from "@/components/playlists/set-curve"
import { TrackTable, type TrackEnergyView } from "@/components/playlists/track-table"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import {
  STANDARD_TRACK_DURATION_MINUTES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { Track } from "@/types/domain"

interface PlaylistWorkspaceProps {
  playlistId: string
  genre: SupportedGenre | null
  context: PlaylistContext | null
  tracks: Track[]
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
}

function sameOrder(a: Track[], b: Track[]): boolean {
  return a.length === b.length && a.every((t, i) => t.id === b[i].id)
}

export function PlaylistWorkspace({
  playlistId,
  genre,
  context,
  tracks,
}: PlaylistWorkspaceProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  // Working order (drives the curve). `baseline` is the last saved order; the
  // parent re-mounts this component (via a key on the server track signature)
  // whenever the persisted order changes, so both re-seed from fresh props.
  const [order, setOrder] = useState<Track[]>(tracks)
  const [baseline, setBaseline] = useState<Track[]>(tracks)
  const [undoStack, setUndoStack] = useState<Track[][]>([])
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  })
  const [isSaving, startSaving] = useTransition()

  const dirty = !sameOrder(order, baseline)

  const energies: TrackEnergyView[] = useMemo(
    () =>
      resolveTrackEnergies(order, context, genre).map((e) => ({
        score: e.score,
        source: e.source,
      })),
    [order, context, genre]
  )

  const scores = useMemo(() => energies.map((e) => e.score), [energies])

  const target = useMemo(
    () => (genre && context ? buildTargetCurve(order.length, context, genre) : null),
    [genre, context, order.length]
  )

  const stats = useMemo(() => {
    const n = order.length
    const bpms = order.map((t) => t.bpm).filter((b): b is number => b !== null)
    const avgBpm =
      bpms.length > 0 ? Math.round(bpms.reduce((s, b) => s + b, 0) / bpms.length) : null
    const everyHasDuration = n > 0 && order.every((t) => t.duration_seconds !== null)
    const totalMinutes = everyHasDuration
      ? Math.round(order.reduce((s, t) => s + (t.duration_seconds ?? 0), 0) / 60)
      : n * STANDARD_TRACK_DURATION_MINUTES
    const eMin = scores.length ? Math.min(...scores) : null
    const eMax = scores.length ? Math.max(...scores) : null
    return { n, avgBpm, totalMinutes, everyHasDuration, eMin, eMax }
  }, [order, scores])

  function handleReorder(next: Track[]) {
    setUndoStack((stack) => [...stack, order])
    setOrder(next)
  }

  function handleUndo() {
    setUndoStack((stack) => {
      if (stack.length === 0) {
        return stack
      }
      const prev = stack[stack.length - 1]
      setOrder(prev)
      return stack.slice(0, -1)
    })
  }

  function handleDiscard() {
    setOrder(baseline)
    setUndoStack([])
  }

  function handleSave() {
    startSaving(async () => {
      const result = await reorderTracksAction(
        playlistId,
        order.map((t) => t.id)
      )
      if (result.ok) {
        setBaseline(order)
        setUndoStack([])
        setToast({ show: true, message: "Set order saved" })
        window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 1900)
      } else {
        setToast({ show: true, message: result.message ?? "Could not save order" })
        window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {order.length > 0 ? (
        <div className="rounded-[16px] border border-ec-border bg-[#14101F] p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                Set energy curve
              </p>
              <h2 className="mt-0.5 font-heading text-[15px] font-semibold text-white">
                The shape of the night
              </h2>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/42">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-4 rounded-full"
                  style={{ background: "linear-gradient(90deg,#4C6EF5,#A24DE0,#F0348A)" }}
                />
                your set
              </span>
              {target ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-white/55" />
                  target
                </span>
              ) : null}
            </div>
          </div>
          <SetCurve scores={scores} target={target} hoveredIndex={hoveredIndex} />
        </div>
      ) : null}

      <GenreNote genre={genre} context={context} tracks={order} />

      {dirty ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#A24DE0]/40 bg-[#A24DE0]/[0.08] px-4 py-2.5">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#e6d3fb]">
            <span className="size-2 rounded-full bg-[#A24DE0]" />
            Preview — unsaved order
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={undoStack.length === 0 || isSaving}
              onClick={handleUndo}
              className="text-white/62 hover:text-white"
            >
              Undo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={handleDiscard}
              className="text-white/62 hover:text-white"
            >
              Discard
            </Button>
            <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
              {isSaving ? "Saving…" : "Save order"}
            </Button>
          </div>
        </div>
      ) : null}

      <TrackTable
        playlistId={playlistId}
        tracks={order}
        energies={energies}
        onHover={setHoveredIndex}
        onReorder={handleReorder}
      />

      {order.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[12.5px] text-white/45">
          <span>
            <b className="font-mono font-bold text-white">{stats.n}</b> tracks
          </span>
          <span className="text-white/20">·</span>
          <span>
            {stats.everyHasDuration ? "" : "~"}
            <b className="font-mono font-bold text-white">
              {formatMinutes(stats.totalMinutes)}
            </b>
          </span>
          {stats.avgBpm !== null ? (
            <>
              <span className="text-white/20">·</span>
              <span>
                avg <b className="font-mono font-bold text-white">{stats.avgBpm}</b> BPM
              </span>
            </>
          ) : null}
          {stats.eMin !== null ? (
            <>
              <span className="text-white/20">·</span>
              <span>
                energy{" "}
                <b className="font-mono font-bold text-white">
                  {stats.eMin}–{stats.eMax}
                </b>
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      <Toast show={toast.show} message={toast.message} />
    </div>
  )
}
