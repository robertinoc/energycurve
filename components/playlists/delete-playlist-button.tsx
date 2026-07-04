"use client"

import { useActionState, useState } from "react"
import { Trash2 } from "lucide-react"

import {
  deletePlaylistAction,
} from "@/app/dashboard/playlists/actions"
import {
  initialPlaylistActionState,
} from "@/lib/playlists/action-state"
import { Button } from "@/components/ui/button"

interface DeletePlaylistButtonProps {
  playlistId: string
  playlistName: string
}

export function DeletePlaylistButton({
  playlistId,
  playlistName,
}: DeletePlaylistButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [state, formAction, isPending] = useActionState(
    deletePlaylistAction,
    initialPlaylistActionState
  )

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${playlistName}`}
        className="text-white/48 hover:text-red-400"
        onClick={() => setConfirming(true)}
      >
        <Trash2 />
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="playlistId" value={playlistId} />
      <Button type="submit" variant="destructive" size="xs" disabled={isPending}>
        {isPending ? "Deleting…" : "Confirm delete"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="text-white/48"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
      {!state.ok && state.message ? (
        <span className="text-xs text-red-400">{state.message}</span>
      ) : null}
    </form>
  )
}
