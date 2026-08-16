"use client"

import { useState, useTransition } from "react"
import { BookmarkPlus } from "lucide-react"

import { saveCurveTemplateAction } from "@/app/dashboard/playlists/template-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.curveTemplates

/**
 * Saves this set's curve as a reusable target shape.
 *
 * Collapsed to a single button until it's wanted: naming something is a
 * commitment, and a permanently open text field on a page about a playlist
 * invites the question "what is this for" every time it's not being used.
 */
export function SaveShapeButton({
  playlistId,
  locale,
}: {
  playlistId: string
  locale: SiteLocale
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  if (saved) {
    return <span className="text-xs text-white/40">{COPY.saved[locale]}</span>
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title={COPY.hint[locale]}
        onClick={() => setOpen(true)}
        className="text-white/58 hover:text-white"
      >
        <BookmarkPlus className="size-4" />
        {COPY.saveButton[locale]}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={name}
        autoFocus
        maxLength={60}
        placeholder={COPY.namePlaceholder[locale]}
        onChange={(event) => setName(event.target.value)}
        className="h-8 w-48 border-white/12 text-sm text-white"
      />
      <Button
        type="button"
        size="sm"
        disabled={pending || name.trim().length === 0}
        onClick={() =>
          startTransition(async () => {
            const result = await saveCurveTemplateAction(playlistId, name)

            if (result.ok) {
              setSaved(true)
            }
          })
        }
      >
        {pending ? COPY.saving[locale] : COPY.save[locale]}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
        className="text-white/48"
      >
        {COPY.cancel[locale]}
      </Button>
    </div>
  )
}
