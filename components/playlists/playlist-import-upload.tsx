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
import {
  GENRE_LABELS,
  SET_CONTEXTS,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"

const CONTEXT_LABELS: Record<(typeof SET_CONTEXTS)[number], string> = {
  opening: "Opening",
  main: "Main time",
  closing: "Closing",
}

export function PlaylistImportUpload() {
  const [state, formAction, isPending] = useActionState(
    importPlaylistAction,
    initialPlaylistActionState
  )
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <Card className="border-white/10 bg-[#14101F] text-white ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <UploadCloud className="size-4 text-white/58" />
          Import your playlist
        </CardTitle>
        <CardDescription className="text-white/58">
          Upload an export from Rekordbox (.xml) or Traktor (.nml). We read
          the BPM, key, and — if you use Mixed In Key — the energy of each
          track automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file" className="text-white/72">
              Playlist file
            </Label>
            <label
              htmlFor="import-file"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/16 bg-black/18 px-4 py-3 text-sm text-white/62 transition-colors hover:border-white/28"
            >
              <UploadCloud className="size-4 shrink-0 text-white/48" />
              <span className="truncate">
                {fileName ?? "Choose a .xml (Rekordbox) or .nml (Traktor) file"}
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
                Set context
              </Label>
              <NativeSelect
                id="import-context"
                name="context"
                defaultValue="main"
                className="border-white/12 text-white"
              >
                {SET_CONTEXTS.map((context) => (
                  <option key={context} value={context}>
                    {CONTEXT_LABELS[context]}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-genre" className="text-white/72">
                Genre
              </Label>
              <NativeSelect
                id="import-genre"
                name="genre"
                defaultValue=""
                className="border-white/12 text-white"
              >
                <option value="">Auto-detect from file</option>
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
              {isPending ? "Importing…" : "Import playlist"}
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
