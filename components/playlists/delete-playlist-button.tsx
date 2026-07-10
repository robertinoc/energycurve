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
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.deleteButton

interface DeletePlaylistButtonProps {
  playlistId: string
  playlistName: string
  locale: SiteLocale
}

export function DeletePlaylistButton({
  playlistId,
  playlistName,
  locale,
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
        aria-label={formatTemplate(COPY.deleteAria[locale], {
          name: playlistName,
        })}
        className="text-white/48 hover:text-ec-error"
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
        {isPending ? COPY.deleting[locale] : COPY.confirmDelete[locale]}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="text-white/48"
        onClick={() => setConfirming(false)}
      >
        {COPY.cancel[locale]}
      </Button>
      {!state.ok && state.message ? (
        <span className="text-xs text-ec-error">{state.message}</span>
      ) : null}
    </form>
  )
}
