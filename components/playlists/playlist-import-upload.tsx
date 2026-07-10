"use client"

import { useActionState, useState } from "react"
import { UploadCloud } from "lucide-react"

import {
  importPlaylistAction,
} from "@/app/dashboard/playlists/actions"
import { initialPlaylistActionState } from "@/lib/playlists/action-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  GENRE_LABELS,
  SET_CONTEXTS,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"

export function PlaylistImportUpload({ locale }: { locale: SiteLocale }) {
  const [state, formAction, isPending] = useActionState(
    importPlaylistAction,
    initialPlaylistActionState
  )
  const [fileName, setFileName] = useState<string | null>(null)
  const copy = DASHBOARD_COPY.importUpload

  return (
    <Card className="border-white/10 bg-[#14101F] text-white ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <UploadCloud className="size-4 text-white/58" />
          {copy.title[locale]}
        </CardTitle>
        <CardDescription className="text-white/58">
          {copy.description[locale]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file" className="text-white/72">
              {copy.fileLabel[locale]}
            </Label>
            <label
              htmlFor="import-file"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/16 bg-black/18 px-4 py-3 text-sm text-white/62 transition-colors hover:border-white/28"
            >
              <UploadCloud className="size-4 shrink-0 text-white/48" />
              <span className="truncate">
                {fileName ?? copy.filePlaceholder[locale]}
              </span>
            </label>
            <input
              id="import-file"
              name="file"
              type="file"
              accept=".xml,.nml,text/xml,application/xml"
              required
              className="sr-only"
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name ?? null)
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="import-context" className="text-white/72">
                {copy.setContext[locale]}
              </Label>
              <NativeSelect
                id="import-context"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-genre" className="text-white/72">
                {copy.genre[locale]}
              </Label>
              <NativeSelect
                id="import-genre"
                name="genre"
                defaultValue=""
                className="border-white/12 text-white"
              >
                <option value="">{copy.autoDetect[locale]}</option>
                {SUPPORTED_GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {GENRE_LABELS[genre]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? copy.importing[locale] : copy.importCta[locale]}
            </Button>
            {!state.ok && state.message ? (
              <p className="text-sm text-red-400">{state.message}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
