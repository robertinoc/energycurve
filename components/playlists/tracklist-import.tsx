"use client"

import { useActionState, useMemo, useState } from "react"
import { ClipboardPaste, TriangleAlert } from "lucide-react"

import {
  importTracklistAction,
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY, type LocalizedLabel } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  parseTracklist,
  TRACKLIST_FORMATS,
  type TracklistFormat,
} from "@/lib/playlists/parse-tracklist"

const COPY = DASHBOARD_COPY.tracklistImport

interface TracklistImportProps {
  playlistId: string
  existingTrackCount: number
  locale: SiteLocale
}

const FORMAT_LABELS: Record<TracklistFormat, LocalizedLabel> = {
  "artist-track": COPY.formatArtistTrack,
  "track-artist": COPY.formatTrackArtist,
}

const PLACEHOLDER = [
  "Bicep - Glue",
  "Overmono - So U Kno (128 bpm)",
  "01. Fred again.. - Delilah",
].join("\n")

export function TracklistImport({
  playlistId,
  existingTrackCount,
  locale,
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
    <Card className="border-white/10 bg-[#0C0917] text-white ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ClipboardPaste className="size-4 text-white/58" />
          {COPY.title[locale]}
        </CardTitle>
        <CardDescription className="text-white/58">
          {COPY.description[locale]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="playlistId" value={playlistId} />

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-white/38">
              {COPY.lineFormat[locale]}
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
                  className="accent-[#A24DE0]"
                />
                {FORMAT_LABELS[option][locale]}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracklist-text" className="text-white/72">
              {COPY.tracklist[locale]}
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
                {formatTemplate(COPY.preview[locale], {
                  count: preview.tracks.length,
                })}
                {preview.errors.length > 0
                  ? formatTemplate(COPY.skippedSuffix[locale], {
                      count: preview.errors.length,
                    })
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
                      {formatTemplate(COPY.andMore[locale], {
                        count: preview.tracks.length - 30,
                      })}
                    </li>
                  ) : null}
                </ol>
              ) : null}

              {preview.errors.length > 0 ? (
                <div className="space-y-1 border-t border-white/8 pt-3">
                  {preview.errors.slice(0, 10).map((error) => (
                    <p
                      key={`${error.line}-${error.reason}`}
                      className="flex items-center gap-2 text-xs text-ec-amber/90"
                    >
                      <TriangleAlert className="size-3 shrink-0" />
                      {formatTemplate(COPY.lineError[locale], {
                        line: error.line,
                      })}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {existingTrackCount > 0 ? (
            <p className="flex items-center gap-2 text-xs text-ec-amber/90">
              <TriangleAlert className="size-3 shrink-0" />
              {formatTemplate(COPY.replacesWarning[locale], {
                count: existingTrackCount,
              })}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isPending || !preview || preview.tracks.length === 0}
            >
              {isPending
                ? COPY.importing[locale]
                : formatTemplate(COPY.importCta[locale], {
                    count: preview?.tracks.length ?? 0,
                  })}
            </Button>
            {state.message ? (
              <p
                className={`text-sm ${state.ok ? "text-ec-cyan" : "text-ec-error"}`}
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
