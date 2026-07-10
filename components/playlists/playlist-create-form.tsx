"use client"

import { useActionState } from "react"
import { ListMusic } from "lucide-react"

import {
  createPlaylistAction,
} from "@/app/dashboard/playlists/actions"
import {
  initialPlaylistActionState,
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
import { NativeSelect } from "@/components/ui/native-select"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { SET_CONTEXTS, SUPPORTED_GENRES, GENRE_LABELS } from "@/lib/product/strategy"

export function PlaylistCreateForm({ locale }: { locale: SiteLocale }) {
  const [state, formAction, isPending] = useActionState(
    createPlaylistAction,
    initialPlaylistActionState
  )
  const copy = DASHBOARD_COPY.createForm

  return (
    <Card className="border-white/10 bg-[#0C0917] text-white ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ListMusic className="size-4 text-white/58" />
          {copy.title[locale]}
        </CardTitle>
        <CardDescription className="text-white/58">
          {copy.description[locale]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="playlist-name" className="text-white/72">
              {copy.name[locale]}
            </Label>
            <Input
              id="playlist-name"
              name="name"
              placeholder={copy.namePlaceholder[locale]}
              maxLength={120}
              required
              className="border-white/12 text-white placeholder:text-white/32"
            />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-ec-error">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="playlist-genre" className="text-white/72">
              {copy.genre[locale]}
            </Label>
            <NativeSelect
              id="playlist-genre"
              name="genre"
              defaultValue="house"
              className="border-white/12 text-white"
            >
              {SUPPORTED_GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {GENRE_LABELS[genre]}
                </option>
              ))}
            </NativeSelect>
            {state.fieldErrors?.genre ? (
              <p className="text-xs text-ec-error">{state.fieldErrors.genre}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="playlist-context" className="text-white/72">
              {copy.context[locale]}
            </Label>
            <NativeSelect
              id="playlist-context"
              name="context"
              defaultValue="main"
              className="border-white/12 text-white"
            >
              {SET_CONTEXTS.map((context) => (
                <option key={context} value={context}>
                  {CONTEXT_COPY[context][locale]}
                </option>
              ))}
            </NativeSelect>
            {state.fieldErrors?.context ? (
              <p className="text-xs text-ec-error">
                {state.fieldErrors.context}
              </p>
            ) : null}
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? copy.creating[locale] : copy.create[locale]}
            </Button>
          </div>
        </form>

        {!state.ok && state.message ? (
          <p className="mt-3 text-sm text-ec-error">{state.message}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
