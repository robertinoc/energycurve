"use client"

import { useActionState, useMemo, useState } from "react"
import { ClipboardPaste, TriangleAlert } from "lucide-react"

import {
  importTracklistAction,
  initialPlaylistActionState,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  parseTracklist,
  TRACKLIST_FORMATS,
  type TracklistFormat,
} from "@/lib/playlists/parse-tracklist"

interface TracklistImportProps {
  playlistId: string
  existingTrackCount: number
}

const FORMAT_LABELS: Record<TracklistFormat, string> = {
  "artist-track": "Artist – Track",
  "track-artist": "Track – Artist",
}

const PLACEHOLDER = [
  "Bicep - Glue",
  "Overmono - So U Kno (128 bpm)",
  "01. Fred again.. - Delilah",
].join("\n")

export function TracklistImport({
  playlistId,
  existingTrackCount,
}: TracklistImportProps) {
  const [text, setText] = useState("")
  const [format, setFormat] = useState<TracklistFormat>("artist-track")
  const [state, formAction, isPending] = useActionState(
    importTracklistAction,
    initialPlaylistActionState
  )

  // Live preview only — the server re-parses the raw text on submit.
  const preview = useMemo(
    () => (text.trim() ? parseTracklist(text, format) : null),
    [text, format]
  )

  return (
    <Card className="border-white/10 bg-[#17171F] text-white ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ClipboardPaste className="size-4 text-white/58" />
          Paste a tracklist
        </CardTitle>
        <CardDescription className="text-white/58">
          One track per line. Numbering prefixes and a trailing
          &quot;(128 bpm)&quot; are picked up automatically. Flip the format if
          the preview looks swapped.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="playlistId" value={playlistId} />

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-white/38">
              Line format
            </span>
            {TRACKLIST_FORMATS.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 text-sm text-white/72"
              >
                <input
                  type="radio"
                  name="format"
                  value={option}
                  checked={format === option}
                  onChange={() => setFormat(option)}
                  className="accent-[#7B3FE4]"
                />
                {FORMAT_LABELS[option]}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracklist-text" className="text-white/72">
              Tracklist
            </Label>
            <Textarea
              id="tracklist-text"
              name="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER}
              rows={8}
              maxLength={20000}
              className="border-white/12 font-mono text-sm text-white placeholder:text-white/28"
            />
          </div>

          {preview ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">
                Preview — {preview.tracks.length} track(s)
                {preview.errors.length > 0
                  ? `, ${preview.errors.length} skipped line(s)`
                  : ""}
              </p>

              {preview.tracks.length > 0 ? (
                <ol className="space-y-1.5">
                  {preview.tracks.slice(0, 30).map((track) => (
                    <li
                      key={`${track.sourceLine}-${track.artist}-${track.name}`}
                      className="flex items-baseline gap-3 text-sm"
                    >
                      <span className="font-mono text-xs text-white/38">
                        {String(track.sourceLine).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 truncate text-white">
                        {track.artist}
                        <span className="text-white/42"> — </span>
                        {track.name}
                      </span>
                      {track.bpm !== null ? (
                        <span className="ml-auto shrink-0 font-mono text-xs text-white/52">
                          {track.bpm} BPM
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {preview.tracks.length > 30 ? (
                    <li className="text-xs text-white/42">
                      …and {preview.tracks.length - 30} more
                    </li>
                  ) : null}
                </ol>
              ) : null}

              {preview.errors.length > 0 ? (
                <div className="space-y-1 border-t border-white/8 pt-3">
                  {preview.errors.slice(0, 10).map((error) => (
                    <p
                      key={`${error.line}-${error.reason}`}
                      className="flex items-center gap-2 text-xs text-amber-300/90"
                    >
                      <TriangleAlert className="size-3 shrink-0" />
                      Line {error.line}: no “Artist – Track” separator found —
                      it will be skipped.
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {existingTrackCount > 0 ? (
            <p className="flex items-center gap-2 text-xs text-amber-300/90">
              <TriangleAlert className="size-3 shrink-0" />
              Importing replaces the {existingTrackCount} track(s) currently in
              this playlist.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isPending || !preview || preview.tracks.length === 0}
            >
              {isPending
                ? "Importing…"
                : `Import ${preview?.tracks.length ?? 0} track(s)`}
            </Button>
            {state.message ? (
              <p
                className={`text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
