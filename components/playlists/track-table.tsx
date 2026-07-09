"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import {
  addTrackAction,
  moveTrackAction,
  removeTrackAction,
  updateTrackAction,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { energyBarGradient, energyColor } from "@/lib/charts/energy-colors"
import { toCamelot } from "@/lib/music/camelot"
import { initialPlaylistActionState } from "@/lib/playlists/action-state"
import {
  COLUMN_PREFS_STORAGE_KEY,
  OPTIONAL_COLUMNS,
  OPTIONAL_COLUMN_LABELS,
  parseColumnPrefs,
  type OptionalColumn,
} from "@/lib/tracklist/column-prefs"
import type { EnergySource } from "@/types/analysis"
import type { Track } from "@/types/domain"

export interface TrackEnergyView {
  score: number
  source: EnergySource
}

interface TrackTableProps {
  playlistId: string
  tracks: Track[]
  energies: TrackEnergyView[]
  onHover: (index: number | null) => void
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) {
    return "—"
  }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ---- Column chooser (Rekordbox-style) ----

function ColumnsMenu({
  active,
  onToggle,
}: {
  active: OptionalColumn[]
  onToggle: (col: OptionalColumn, on: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-white/62 hover:text-white"
      >
        <Columns3 className="size-3.5" />
        Columns
      </Button>
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-white/12 bg-[#17121f] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
              Optional columns
            </p>
            {OPTIONAL_COLUMNS.map((col) => (
              <label
                key={col}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-white/72 hover:bg-white/[0.06]"
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-[#A24DE0]"
                  checked={active.includes(col)}
                  onChange={(e) => onToggle(col, e.target.checked)}
                />
                {OPTIONAL_COLUMN_LABELS[col]}
              </label>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

// ---- Track edit fields (shared by add + edit) ----

function TrackFields({
  idPrefix,
  defaults,
  fieldErrors,
}: {
  idPrefix: string
  defaults?: Track
  fieldErrors: Record<string, string> | null
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1.4fr_0.6fr_0.6fr]">
      {[
        { name: "artist", label: "Artist", value: defaults?.artist ?? "", type: "text", placeholder: "Artist" },
        { name: "name", label: "Track", value: defaults?.name ?? "", type: "text", placeholder: "Track title" },
      ].map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${f.name}`} className="text-white/72">
            {f.label}
          </Label>
          <Input
            id={`${idPrefix}-${f.name}`}
            name={f.name}
            defaultValue={f.value}
            placeholder={f.placeholder}
            maxLength={200}
            required
            className="border-white/12 text-white placeholder:text-white/32"
          />
          {fieldErrors?.[f.name] ? (
            <p className="text-xs text-ec-error">{fieldErrors[f.name]}</p>
          ) : null}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-bpm`} className="text-white/72">
          BPM
        </Label>
        <Input
          id={`${idPrefix}-bpm`}
          name="bpm"
          type="number"
          step="0.01"
          min={60}
          max={220}
          defaultValue={defaults?.bpm ?? ""}
          placeholder="128"
          className="border-white/12 text-white placeholder:text-white/32"
        />
        {fieldErrors?.bpm ? (
          <p className="text-xs text-ec-error">{fieldErrors.bpm}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-energy`} className="text-white/72">
          Energy (1–10)
        </Label>
        <Input
          id={`${idPrefix}-energy`}
          name="energyScore"
          type="number"
          step="0.1"
          min={1}
          max={10}
          defaultValue={defaults?.energy_score ?? ""}
          placeholder="Optional"
          className="border-white/12 text-white placeholder:text-white/32"
        />
        {fieldErrors?.energyScore ? (
          <p className="text-xs text-ec-error">{fieldErrors.energyScore}</p>
        ) : null}
      </div>
    </div>
  )
}

// ---- Inline edit row ----

function EditTrackRow({
  playlistId,
  track,
  colSpan,
  onClose,
}: {
  playlistId: string
  track: Track
  colSpan: number
  onClose: () => void
}) {
  const [state, formAction, pending] = useActionState(
    updateTrackAction,
    initialPlaylistActionState
  )

  // Effect calls the parent's close callback (not setState directly) once the
  // update succeeds — the parent owns the editing state.
  useEffect(() => {
    if (state.ok) {
      onClose()
    }
  }, [state.ok, onClose])

  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="playlistId" value={playlistId} />
          <input type="hidden" name="trackId" value={track.id} />
          <TrackFields
            idPrefix={`edit-${track.id}`}
            defaults={track}
            fieldErrors={state.fieldErrors}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/48"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </td>
    </tr>
  )
}

// ---- One track row ----

function TrackRow({
  playlistId,
  track,
  index,
  energy,
  isFirst,
  isLast,
  optional,
  colSpan,
  onHover,
}: {
  playlistId: string
  track: Track
  index: number
  energy: TrackEnergyView
  isFirst: boolean
  isLast: boolean
  optional: OptionalColumn[]
  colSpan: number
  onHover: (index: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [, moveAction] = useActionState(moveTrackAction, initialPlaylistActionState)
  const [, removeAction, removePending] = useActionState(
    removeTrackAction,
    initialPlaylistActionState
  )

  if (editing) {
    return (
      <EditTrackRow
        playlistId={playlistId}
        track={track}
        colSpan={colSpan}
        onClose={() => setEditing(false)}
      />
    )
  }

  const camelot = toCamelot(track.musical_key)

  return (
    <tr
      className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.045]"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <td className="w-8 px-3 py-1.5 text-right font-mono text-xs text-white/28">
        {index + 1}
      </td>
      <td className="px-3 py-1.5">
        <div className="flex w-[132px] items-center gap-2.5">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(Math.max(energy.score, 0), 10) * 10}%`,
                background: energyBarGradient(energy.score),
              }}
            />
          </span>
          <span
            className="w-6 text-right font-mono text-xs font-bold"
            style={{ color: energyColor(energy.score) }}
            title={`energy source: ${energy.source}`}
          >
            {energy.score}
          </span>
        </div>
      </td>
      <td className="max-w-[180px] truncate px-3 py-1.5 text-white/62">
        {track.artist}
      </td>
      <td className="max-w-[280px] truncate px-3 py-1.5 font-medium text-white">
        {track.name}
      </td>
      <td className="w-16 px-3 py-1.5 text-right font-mono tabular-nums text-white">
        {track.bpm !== null ? track.bpm.toFixed(2) : "—"}
      </td>
      <td className="px-3 py-1.5 text-center">
        {camelot ? <span className="inline-block min-w-[40px] rounded-md border border-white/14 bg-white/[0.03] px-1.5 py-px text-center font-mono text-[11.5px] font-semibold text-white">{camelot}</span> : <span className="text-white/28">—</span>}
      </td>
      <td className="px-3 py-1.5 text-center">
        {track.musical_key ? (
          <span className="inline-block min-w-[40px] rounded-md border border-white/14 bg-white/[0.03] px-1.5 py-px text-center font-mono text-[11.5px] font-semibold text-white">{track.musical_key}</span>
        ) : (
          <span className="text-white/28">—</span>
        )}
      </td>
      {optional.includes("genre") ? (
        <td className="max-w-[150px] truncate px-3 py-1.5 text-white/62">
          {track.genre || <span className="text-white/28">—</span>}
        </td>
      ) : null}
      {optional.includes("duration") ? (
        <td className="w-16 px-3 py-1.5 text-right font-mono tabular-nums text-white/62">
          {formatDuration(track.duration_seconds)}
        </td>
      ) : null}
      {optional.includes("comment") ? (
        <td className="max-w-[170px] truncate px-3 py-1.5 text-white/62">
          {track.comment || <span className="text-white/28">—</span>}
        </td>
      ) : null}
      <td className="px-3 py-1.5">
        <div className="flex items-center justify-end gap-0.5">
          <form action={moveAction}>
            <input type="hidden" name="playlistId" value={playlistId} />
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="direction" value="up" />
            <Button type="submit" variant="ghost" size="icon-xs" aria-label="Move up" disabled={isFirst} className="text-white/40 hover:text-white">
              <ArrowUp />
            </Button>
          </form>
          <form action={moveAction}>
            <input type="hidden" name="playlistId" value={playlistId} />
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="direction" value="down" />
            <Button type="submit" variant="ghost" size="icon-xs" aria-label="Move down" disabled={isLast} className="text-white/40 hover:text-white">
              <ArrowDown />
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Edit track"
            className="text-white/40 hover:text-white"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          {confirmingRemove ? (
            <form action={removeAction} className="flex items-center gap-1">
              <input type="hidden" name="playlistId" value={playlistId} />
              <input type="hidden" name="trackId" value={track.id} />
              <Button type="submit" variant="destructive" size="xs" disabled={removePending}>
                {removePending ? "…" : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Cancel remove"
                className="text-white/40"
                onClick={() => setConfirmingRemove(false)}
              >
                <X />
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove track"
              className="text-white/40 hover:text-ec-error"
              onClick={() => setConfirmingRemove(true)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ---- Add-track form ----

function AddTrackForm({ playlistId }: { playlistId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(
    addTrackAction,
    initialPlaylistActionState
  )
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
    }
  }, [state])

  if (!open) {
    return (
      <div className="border-t border-white/[0.06] p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/62 hover:text-white"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-3.5" />
          Add track
        </Button>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 border-t border-white/[0.06] p-4"
    >
      <input type="hidden" name="playlistId" value={playlistId} />
      <TrackFields idPrefix="add" fieldErrors={state.fieldErrors} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add track"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/48"
          onClick={() => setOpen(false)}
        >
          Close
        </Button>
        {!state.ok && state.message ? (
          <span className="text-sm text-ec-error">{state.message}</span>
        ) : null}
      </div>
    </form>
  )
}

// ---- The table ----

export function TrackTable({
  playlistId,
  tracks,
  energies,
  onHover,
}: TrackTableProps) {
  const [optional, setOptional] = useState<OptionalColumn[]>([])

  // Read the persisted column choice once after mount. It must default to [] on
  // the server + first client render (localStorage isn't available at SSR), then
  // sync in — a legitimate external-store read, not a render-driven cascade.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptional(parseColumnPrefs(window.localStorage.getItem(COLUMN_PREFS_STORAGE_KEY)))
  }, [])

  function toggleColumn(col: OptionalColumn, on: boolean) {
    setOptional((prev) => {
      const next = on
        ? OPTIONAL_COLUMNS.filter((c) => c === col || prev.includes(c))
        : prev.filter((c) => c !== col)
      try {
        window.localStorage.setItem(COLUMN_PREFS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage failures (private mode etc.) — prefs just won't persist.
      }
      return next
    })
  }

  // base 7 columns + optional + actions
  const colSpan = 7 + optional.length + 1

  return (
    <div className="overflow-hidden rounded-[16px] border border-ec-border bg-[#0C0917]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/42">
          Tracklist
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span>Energy</span>
            <span className="h-2 w-[88px] rounded-full" style={{ background: "linear-gradient(90deg,#4C6EF5,#22D3EE,#A24DE0,#F0348A)" }} />
            <span>low → high</span>
          </div>
          <ColumnsMenu active={optional} onToggle={toggleColumn} />
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-white/48">
          No tracks yet. Add one below, or paste a full tracklist in the import panel.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-white/12 text-left text-[10px] uppercase tracking-[0.13em] text-white/40">
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2">Energy</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2 text-right">BPM</th>
                <th className="px-3 py-2 text-center">Camelot</th>
                <th className="px-3 py-2 text-center">Key</th>
                {optional.includes("genre") ? <th className="px-3 py-2">Genre</th> : null}
                {optional.includes("duration") ? <th className="px-3 py-2 text-right">Time</th> : null}
                {optional.includes("comment") ? <th className="px-3 py-2">Comment</th> : null}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  playlistId={playlistId}
                  track={track}
                  index={index}
                  energy={energies[index] ?? { score: 0, source: "estimated" }}
                  isFirst={index === 0}
                  isLast={index === tracks.length - 1}
                  optional={optional}
                  colSpan={colSpan}
                  onHover={onHover}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddTrackForm playlistId={playlistId} />
    </div>
  )
}
