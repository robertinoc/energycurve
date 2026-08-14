"use client"

import { useMemo, useState, useTransition } from "react"

import { reorderTracksAction } from "@/app/dashboard/playlists/actions"
import { GenreNote } from "@/components/playlists/genre-note"
import { SetCurve } from "@/components/playlists/set-curve"
import { TrackTable, type TrackEnergyView } from "@/components/playlists/track-table"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import {
  type PlaylistContext,
  type SupportedGenre,
  type CurveShape,
} from "@/lib/product/strategy"
import type { Track } from "@/types/domain"

interface PlaylistWorkspaceProps {
  playlistId: string
  genre: SupportedGenre | null
  context: PlaylistContext | null
  /**
   * Declared shape. The live curve overlay has to honour it, otherwise the
   * workspace draws a climbing target while the analysis scores the set against
   * a plateau — the same set shown two contradictory ideals.
   */
  targetShape: CurveShape | null
  tracks: Track[]
  locale: SiteLocale
}

function sameOrder(a: Track[], b: Track[]): boolean {
  return a.length === b.length && a.every((t, i) => t.id === b[i].id)
}

export function PlaylistWorkspace({
  playlistId,
  genre,
  context,
  targetShape,
  tracks,
  locale,
}: PlaylistWorkspaceProps) {
  const copy = DASHBOARD_COPY.workspace
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
    () =>
      genre && context
        ? buildTargetCurve(order.length, context, genre, targetShape)
        : null,
    [genre, context, targetShape, order.length]
  )

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
        setToast({ show: true, message: copy.orderSaved[locale] })
        window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 1900)
      } else {
        setToast({
          show: true,
          message: result.message ?? copy.orderSaveFailed[locale],
        })
        window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {order.length > 0 ? (
        <div className="rounded-[16px] border border-ec-border bg-[#14101F] p-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                {copy.curveEyebrow[locale]}
              </p>
              <h2 className="mt-0.5 font-heading text-[15px] font-semibold text-white">
                {copy.curveTitle[locale]}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/42">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-4 rounded-full"
                  style={{ background: "linear-gradient(90deg,#4C6EF5,#A24DE0,#F0348A)" }}
                />
                {copy.legendYourSet[locale]}
              </span>
              {target ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-white/55" />
                  {copy.legendTarget[locale]}
                </span>
              ) : null}
            </div>
          </div>
          <SetCurve scores={scores} target={target} hoveredIndex={hoveredIndex} />
        </div>
      ) : null}

      <GenreNote genre={genre} context={context} tracks={order} locale={locale} />

      {dirty ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#A24DE0]/40 bg-[#A24DE0]/[0.08] px-4 py-2.5">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#e6d3fb]">
            <span className="size-2 rounded-full bg-[#A24DE0]" />
            {copy.previewUnsaved[locale]}
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
              {copy.undo[locale]}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={handleDiscard}
              className="text-white/62 hover:text-white"
            >
              {copy.discard[locale]}
            </Button>
            <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
              {isSaving ? copy.saving[locale] : copy.saveOrder[locale]}
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
        locale={locale}
      />

      {/* Set stats moved to the page header, next to the genre/context badges
          (V3 feedback) — see PlaylistStatsPills in the detail page. */}
      <Toast show={toast.show} message={toast.message} />
    </div>
  )
}
