"use client"

import { useActionState, useState } from "react"
import { Pencil } from "lucide-react"

import { updatePlaylistDetailsAction } from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { initialPlaylistActionState } from "@/lib/playlists/action-state"
import { PLAYLIST_DESCRIPTION_MAX_LENGTH } from "@/lib/playlists/schemas"

const COPY = DASHBOARD_COPY.playlistHeaderEdit

/**
 * Detail-page title block: renders the playlist name (+ optional description)
 * with a pencil that flips into an inline rename/describe form (V3 feedback).
 * The server action revalidates the page, so on success we just close.
 */
export function PlaylistHeaderEdit({
  playlistId,
  name,
  description,
  locale,
}: {
  playlistId: string
  name: string
  description: string | null
  locale: SiteLocale
}) {
  const [editing, setEditing] = useState(false)

  return editing ? (
    <HeaderEditForm
      playlistId={playlistId}
      name={name}
      description={description}
      locale={locale}
      onClose={() => setEditing(false)}
    />
  ) : (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <h1 className="break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {name}
        </h1>
        <button
          type="button"
          aria-label={COPY.editAria[locale]}
          onClick={() => setEditing(true)}
          className="mt-2 grid size-8 shrink-0 place-items-center rounded-lg text-white/48 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Pencil className="size-4" />
        </button>
      </div>
      {description ? (
        <p className="max-w-2xl text-sm leading-6 text-white/56">
          {description}
        </p>
      ) : null}
    </div>
  )
}

function HeaderEditForm({
  playlistId,
  name,
  description,
  locale,
  onClose,
}: {
  playlistId: string
  name: string
  description: string | null
  locale: SiteLocale
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(
    async (
      prev: typeof initialPlaylistActionState,
      formData: FormData
    ) => {
      const result = await updatePlaylistDetailsAction(prev, formData)
      if (result.ok) {
        onClose()
      }
      return result
    },
    initialPlaylistActionState
  )

  return (
    <form action={formAction} className="max-w-2xl space-y-3">
      <input type="hidden" name="playlistId" value={playlistId} />

      <div className="space-y-2">
        <Label htmlFor="playlist-edit-name" className="text-white/72">
          {COPY.nameLabel[locale]}
        </Label>
        <Input
          id="playlist-edit-name"
          name="name"
          defaultValue={name}
          maxLength={120}
          required
          autoFocus
          className="border-white/12 text-lg font-semibold text-white"
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-ec-error">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="playlist-edit-description" className="text-white/72">
          {COPY.descriptionLabel[locale]}
        </Label>
        <Textarea
          id="playlist-edit-description"
          name="description"
          defaultValue={description ?? ""}
          rows={2}
          maxLength={PLAYLIST_DESCRIPTION_MAX_LENGTH}
          placeholder={COPY.descriptionPlaceholder[locale]}
          className="border-white/12 text-sm text-white placeholder:text-white/28"
        />
      </div>

      <div className="flex items-center gap-2.5">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? COPY.saving[locale] : COPY.save[locale]}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {COPY.cancel[locale]}
        </Button>
        {!state.ok && state.message ? (
          <p className="text-sm text-ec-error">{state.message}</p>
        ) : null}
      </div>
    </form>
  )
}
