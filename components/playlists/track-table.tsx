"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import {
  Columns3,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import {
  addTrackAction,
  removeTrackAction,
  updateTrackAction,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { energyBarGradient, energyColor } from "@/lib/charts/energy-colors"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { toCamelot } from "@/lib/music/camelot"
import { initialPlaylistActionState } from "@/lib/playlists/action-state"
import {
  COLUMN_PREFS_STORAGE_KEY,
  OPTIONAL_COLUMNS,
  parseColumnPrefs,
  type OptionalColumn,
} from "@/lib/tracklist/column-prefs"
import type { EnergySource } from "@/types/analysis"
import type { Track } from "@/types/domain"

const COPY = DASHBOARD_COPY.trackTable

export interface TrackEnergyView {
  score: number
  source: EnergySource
}

type SortKey =
  | "energy"
  | "artist"
  | "title"
  | "bpm"
  | "camelot"
  | "key"
  | "genre"
  | "duration"

interface TrackTableProps {
  playlistId: string
  tracks: Track[]
  energies: TrackEnergyView[]
  onHover: (index: number | null) => void
  /** Called with the new track order after a drag or a column sort. */
  onReorder: (tracks: Track[]) => void
  locale: SiteLocale
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
  locale,
}: {
  active: OptionalColumn[]
  onToggle: (col: OptionalColumn, on: boolean) => void
  locale: SiteLocale
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
        {COPY.columns[locale]}
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
              {COPY.optionalColumns[locale]}
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
                {DASHBOARD_COPY.columnLabels[col][locale]}
              </label>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

// ---- Shared track fields (add + edit) ----

function TrackFields({
  idPrefix,
  defaults,
  fieldErrors,
  locale,
}: {
  idPrefix: string
  defaults?: Track
  fieldErrors: Record<string, string> | null
  locale: SiteLocale
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1.4fr_0.6fr_0.6fr]">
      {[
        {
          name: "artist",
          label: COPY.fieldArtist[locale],
          value: defaults?.artist ?? "",
          placeholder: COPY.fieldArtist[locale],
        },
        {
          name: "name",
          label: COPY.fieldTrack[locale],
          value: defaults?.name ?? "",
          placeholder: COPY.fieldTrackPlaceholder[locale],
        },
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
          {COPY.fieldEnergy[locale]}
        </Label>
        <Input
          id={`${idPrefix}-energy`}
          name="energyScore"
          type="number"
          step="0.1"
          min={1}
          max={10}
          defaultValue={defaults?.energy_score ?? ""}
          placeholder={COPY.fieldEnergyPlaceholder[locale]}
          className="border-white/12 text-white placeholder:text-white/32"
        />
        {fieldErrors?.energyScore ? (
          <p className="text-xs text-ec-error">{fieldErrors.energyScore}</p>
        ) : null}
      </div>
      {/* Rich tag fields (V3): editable so untagged files (wav/flac without
          BPM/key metadata) can be completed by hand. All optional. */}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-musicalKey`} className="text-white/72">
          {COPY.fieldKey[locale]}
        </Label>
        <Input
          id={`${idPrefix}-musicalKey`}
          name="musicalKey"
          defaultValue={defaults?.musical_key ?? ""}
          placeholder="8A / Am"
          maxLength={12}
          className="border-white/12 text-white placeholder:text-white/32"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-genre`} className="text-white/72">
          {COPY.fieldGenre[locale]}
        </Label>
        <Input
          id={`${idPrefix}-genre`}
          name="genre"
          defaultValue={defaults?.genre ?? ""}
          placeholder="Hard Techno"
          maxLength={200}
          className="border-white/12 text-white placeholder:text-white/32"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-comment`} className="text-white/72">
          {COPY.fieldComment[locale]}
        </Label>
        <Input
          id={`${idPrefix}-comment`}
          name="comment"
          defaultValue={defaults?.comment ?? ""}
          placeholder="Energy 7"
          maxLength={200}
          className="border-white/12 text-white placeholder:text-white/32"
        />
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
  locale,
}: {
  playlistId: string
  track: Track
  colSpan: number
  onClose: () => void
  locale: SiteLocale
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
            locale={locale}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? COPY.saving[locale] : COPY.saveChanges[locale]}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/48"
              onClick={onClose}
            >
              {COPY.cancel[locale]}
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
  optional,
  colSpan,
  onHover,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  locale,
}: {
  playlistId: string
  track: Track
  index: number
  energy: TrackEnergyView
  optional: OptionalColumn[]
  colSpan: number
  onHover: (index: number | null) => void
  isDragOver: boolean
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: (index: number) => void
  onDragEnd: () => void
  locale: SiteLocale
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
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
        locale={locale}
      />
    )
  }

  const camelot = toCamelot(track.musical_key)

  return (
    <tr
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(index)
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      className={`border-b border-white/[0.05] last:border-0 hover:bg-white/[0.045] ${isDragOver ? "shadow-[inset_0_2px_0_#A24DE0]" : ""}`}
    >
      <td
        className="w-6 cursor-grab px-1 text-center text-white/28 active:cursor-grabbing"
        title={COPY.dragToReorder[locale]}
      >
        <GripVertical className="mx-auto size-3.5" />
      </td>
      <td className="w-7 px-2 py-1.5 text-right font-mono text-xs text-white/28">
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
            title={formatTemplate(COPY.energySource[locale], {
              source: energy.source.replace("_", " + "),
            })}
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
        {camelot ? (
          <span className="inline-block min-w-[40px] rounded-md border border-white/14 bg-white/[0.03] px-1.5 py-px text-center font-mono text-[11.5px] font-semibold text-white">
            {camelot}
          </span>
        ) : (
          <span className="text-white/28">—</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-center">
        {track.musical_key ? (
          <span className="inline-block min-w-[40px] rounded-md border border-white/14 bg-white/[0.03] px-1.5 py-px text-center font-mono text-[11.5px] font-semibold text-white">
            {track.musical_key}
          </span>
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
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={COPY.editTrack[locale]}
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
                {removePending ? "…" : COPY.confirm[locale]}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={COPY.cancelRemove[locale]}
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
              aria-label={COPY.removeTrack[locale]}
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

function AddTrackForm({
  playlistId,
  locale,
}: {
  playlistId: string
  locale: SiteLocale
}) {
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
          {COPY.addTrack[locale]}
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
      <TrackFields idPrefix="add" fieldErrors={state.fieldErrors} locale={locale} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? COPY.adding[locale] : COPY.addTrack[locale]}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/48"
          onClick={() => setOpen(false)}
        >
          {COPY.close[locale]}
        </Button>
        {!state.ok && state.message ? (
          <span className="text-sm text-ec-error">{state.message}</span>
        ) : null}
      </div>
    </form>
  )
}

// ---- Sort helpers ----

function sortTracks(
  tracks: Track[],
  energies: TrackEnergyView[],
  key: SortKey,
  dir: 1 | -1
): Track[] {
  const pairs = tracks.map((track, i) => ({ track, energy: energies[i] }))
  const str = (v: string | null) => (v ?? "").toLowerCase()
  const num = (v: number | null) => (v ?? Number.NEGATIVE_INFINITY)

  pairs.sort((a, b) => {
    let cmp = 0
    switch (key) {
      case "energy":
        cmp = a.energy.score - b.energy.score
        break
      case "bpm":
        cmp = num(a.track.bpm) - num(b.track.bpm)
        break
      case "duration":
        cmp = num(a.track.duration_seconds) - num(b.track.duration_seconds)
        break
      case "artist":
        cmp = str(a.track.artist).localeCompare(str(b.track.artist))
        break
      case "title":
        cmp = str(a.track.name).localeCompare(str(b.track.name))
        break
      case "genre":
        cmp = str(a.track.genre).localeCompare(str(b.track.genre))
        break
      case "key":
        cmp = str(a.track.musical_key).localeCompare(str(b.track.musical_key))
        break
      case "camelot":
        cmp = str(toCamelot(a.track.musical_key)).localeCompare(
          str(toCamelot(b.track.musical_key))
        )
        break
    }
    return cmp * dir
  })

  return pairs.map((p) => p.track)
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  active: boolean
  dir: 1 | -1
  onSort: (key: SortKey) => void
  className?: string
}) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase tracking-[0.13em] hover:text-white/70"
      >
        {label}
        {active ? (
          <span className="text-[#A24DE0]">{dir > 0 ? "▲" : "▼"}</span>
        ) : null}
      </button>
    </th>
  )
}

// ---- The table ----

export function TrackTable({
  playlistId,
  tracks,
  energies,
  onHover,
  onReorder,
  locale,
}: TrackTableProps) {
  const [optional, setOptional] = useState<OptionalColumn[]>([])
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  function handleSort(key: SortKey) {
    const dir: 1 | -1 = sort && sort.key === key && sort.dir === 1 ? -1 : 1
    setSort({ key, dir })
    onReorder(sortTracks(tracks, energies, key, dir))
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = tracks.slice()
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)
    setSort(null) // a manual drag defines a custom order, not a column sort
    setDragIndex(null)
    setDragOverIndex(null)
    onReorder(next)
  }

  // base columns: handle, #, energy, artist, title, bpm, camelot, key = 8
  const colSpan = 8 + optional.length + 1

  return (
    <div className="overflow-hidden rounded-[16px] border border-ec-border bg-[#0C0917]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/42">
          {COPY.tracklist[locale]}
        </span>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 text-[11px] text-white/40 sm:flex">
            <span>{COPY.energyLegend[locale]}</span>
            <span
              className="h-2 w-[88px] rounded-full"
              style={{ background: "linear-gradient(90deg,#4C6EF5,#22D3EE,#A24DE0,#F0348A)" }}
            />
            <span>{COPY.energyLegendLow[locale]}</span>
          </div>
          <ColumnsMenu active={optional} onToggle={toggleColumn} locale={locale} />
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-white/48">
          {COPY.emptyState[locale]}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-white/12 text-left text-[10px] uppercase tracking-[0.13em] text-white/40">
                <th className="w-6" />
                <th className="px-2 py-2 text-right">#</th>
                <SortHeader label={COPY.headerEnergy[locale]} sortKey="energy" active={sort?.key === "energy"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2" />
                <SortHeader label={COPY.headerArtist[locale]} sortKey="artist" active={sort?.key === "artist"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2" />
                <SortHeader label={COPY.headerTitle[locale]} sortKey="title" active={sort?.key === "title"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2" />
                <SortHeader label={COPY.headerBpm[locale]} sortKey="bpm" active={sort?.key === "bpm"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2 text-right" />
                <SortHeader label={COPY.headerCamelot[locale]} sortKey="camelot" active={sort?.key === "camelot"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2 text-center" />
                <SortHeader label={COPY.headerKey[locale]} sortKey="key" active={sort?.key === "key"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2 text-center" />
                {optional.includes("genre") ? (
                  <SortHeader label={DASHBOARD_COPY.columnLabels.genre[locale]} sortKey="genre" active={sort?.key === "genre"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2" />
                ) : null}
                {optional.includes("duration") ? (
                  <SortHeader label={DASHBOARD_COPY.columnLabels.duration[locale]} sortKey="duration" active={sort?.key === "duration"} dir={sort?.dir ?? 1} onSort={handleSort} className="px-3 py-2 text-right" />
                ) : null}
                {optional.includes("comment") ? (
                  <th className="px-3 py-2">{COPY.headerComment[locale]}</th>
                ) : null}
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
                  optional={optional}
                  colSpan={colSpan}
                  onHover={onHover}
                  isDragOver={dragOverIndex === index && dragIndex !== index}
                  onDragStart={setDragIndex}
                  onDragOver={setDragOverIndex}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  locale={locale}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddTrackForm playlistId={playlistId} locale={locale} />
    </div>
  )
}
