"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Music2, Pencil, Trash2, X } from "lucide-react"

import {
  addTrackAction,
  moveTrackAction,
  removeTrackAction,
  updateTrackAction,
} from "@/app/dashboard/playlists/actions"
import {
  initialPlaylistActionState,
  type PlaylistActionState,
} from "@/lib/playlists/action-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  energyBarGradient,
  energyColor,
} from "@/lib/charts/energy-colors"
import type { Track } from "@/types/domain"

interface TrackEditorProps {
  playlistId: string
  tracks: Track[]
}

interface TrackFieldsProps {
  idPrefix: string
  defaults?: Track
  fieldErrors: Record<string, string> | null
}

function TrackFields({ idPrefix, defaults, fieldErrors }: TrackFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1.4fr_0.6fr_0.6fr]">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-artist`} className="text-white/72">
          Artist
        </Label>
        <Input
          id={`${idPrefix}-artist`}
          name="artist"
          defaultValue={defaults?.artist ?? ""}
          placeholder="Artist"
          maxLength={200}
          required
          className="border-white/12 text-white placeholder:text-white/32"
        />
        {fieldErrors?.artist ? (
          <p className="text-xs text-ec-error">{fieldErrors.artist}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`} className="text-white/72">
          Track
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={defaults?.name ?? ""}
          placeholder="Track title"
          maxLength={200}
          required
          className="border-white/12 text-white placeholder:text-white/32"
        />
        {fieldErrors?.name ? (
          <p className="text-xs text-ec-error">{fieldErrors.name}</p>
        ) : null}
      </div>
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

function ActionFeedback({ state }: { state: PlaylistActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <p
      className={`text-sm ${state.ok ? "text-ec-cyan" : "text-ec-error"}`}
    >
      {state.message}
    </p>
  )
}

function EditTrackRow({
  playlistId,
  track,
  onClose,
}: {
  playlistId: string
  track: Track
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(
    updateTrackAction,
    initialPlaylistActionState
  )

  useEffect(() => {
    if (state.ok) {
      onClose()
    }
  }, [state.ok, onClose])

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-white/12 bg-black/24 p-4"
    >
      <input type="hidden" name="playlistId" value={playlistId} />
      <input type="hidden" name="trackId" value={track.id} />
      <TrackFields
        idPrefix={`edit-${track.id}`}
        defaults={track}
        fieldErrors={state.fieldErrors}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
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
        <ActionFeedback state={state} />
      </div>
    </form>
  )
}

function TrackRow({
  playlistId,
  track,
  isFirst,
  isLast,
}: {
  playlistId: string
  track: Track
  isFirst: boolean
  isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [moveState, moveAction] = useActionState(
    moveTrackAction,
    initialPlaylistActionState
  )
  const [removeState, removeAction, removePending] = useActionState(
    removeTrackAction,
    initialPlaylistActionState
  )

  if (editing) {
    return (
      <EditTrackRow
        playlistId={playlistId}
        track={track}
        onClose={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-[11px] border border-ec-border bg-ec-sunken px-[15px] py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="w-6 shrink-0 text-right font-mono text-xs text-ec-text-dim">
          {track.position}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ec-text">
            {track.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11.5px] text-ec-text-dim">
            {track.artist} · {track.bpm !== null ? `${track.bpm} BPM` : "— BPM"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {track.energy_score !== null ? (
          <div className="flex items-center gap-2.5">
            <div className="h-[7px] w-24 overflow-hidden rounded-full bg-ec-raised">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(Math.max(track.energy_score, 0), 10) * 10}%`,
                  background: energyBarGradient(track.energy_score),
                }}
              />
            </div>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: energyColor(track.energy_score) }}
            >
              {track.energy_score}
            </span>
          </div>
        ) : (
          <span className="font-mono text-[11.5px] text-ec-text-dim">
            energy auto
          </span>
        )}

        <div className="flex items-center gap-1">
          <form action={moveAction}>
            <input type="hidden" name="playlistId" value={playlistId} />
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="direction" value="up" />
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              aria-label="Move up"
              disabled={isFirst}
              className="text-white/48 hover:text-white"
            >
              <ArrowUp />
            </Button>
          </form>
          <form action={moveAction}>
            <input type="hidden" name="playlistId" value={playlistId} />
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="direction" value="down" />
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              aria-label="Move down"
              disabled={isLast}
              className="text-white/48 hover:text-white"
            >
              <ArrowDown />
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Edit track"
            className="text-white/48 hover:text-white"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          {confirmingRemove ? (
            <form action={removeAction} className="flex items-center gap-1">
              <input type="hidden" name="playlistId" value={playlistId} />
              <input type="hidden" name="trackId" value={track.id} />
              <Button
                type="submit"
                variant="destructive"
                size="xs"
                disabled={removePending}
              >
                {removePending ? "Removing…" : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Cancel remove"
                className="text-white/48"
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
              className="text-white/48 hover:text-ec-error"
              onClick={() => setConfirmingRemove(true)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {!moveState.ok && moveState.message ? (
        <p className="text-xs text-ec-error">{moveState.message}</p>
      ) : null}
      {!removeState.ok && removeState.message ? (
        <p className="text-xs text-ec-error">{removeState.message}</p>
      ) : null}
    </div>
  )
}

function AddTrackForm({ playlistId }: { playlistId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(
    addTrackAction,
    initialPlaylistActionState
  )

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-2xl border border-dashed border-white/14 bg-black/12 p-4"
    >
      <input type="hidden" name="playlistId" value={playlistId} />
      <TrackFields idPrefix="add" fieldErrors={state.fieldErrors} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add track"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  )
}

export function TrackEditor({ playlistId, tracks }: TrackEditorProps) {
  return (
    <Card className="border-white/10 bg-[#0C0917] text-white ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Music2 className="size-4 text-white/58" />
          Tracklist
        </CardTitle>
        <CardDescription className="text-white/58">
          {tracks.length > 0
            ? `${tracks.length} track(s) in playing order. BPM drives the energy score; a manual energy value overrides it.`
            : "No tracks yet. Add them one by one below, or paste a full tracklist in the import panel."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            playlistId={playlistId}
            track={track}
            isFirst={index === 0}
            isLast={index === tracks.length - 1}
          />
        ))}
        <AddTrackForm playlistId={playlistId} />
      </CardContent>
    </Card>
  )
}
