"use client"

import { useActionState, useMemo, useState } from "react"
import { TriangleAlert } from "lucide-react"

import { createPlaylistWithTracksAction } from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  TaxonomySelect,
  type TaxonomyCustomOption,
} from "@/components/playlists/taxonomy-select"
import { formatTemplate } from "@/lib/content/analysis-copy"
import {
  CONTEXT_COPY,
  DASHBOARD_COPY,
  type LocalizedLabel,
} from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { initialPlaylistActionState } from "@/lib/playlists/action-state"
import {
  parseTracklist,
  TRACKLIST_FORMATS,
  type TracklistFormat,
} from "@/lib/playlists/parse-tracklist"
import {
  GENRE_LABELS,
  SET_CONTEXTS,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"
import type { UserContext, UserGenre } from "@/types/domain"

const COPY = DASHBOARD_COPY.manualCreate
const PASTE_COPY = DASHBOARD_COPY.tracklistImport
const SHARED = DASHBOARD_COPY.importUpload

const FORMAT_LABELS: Record<TracklistFormat, LocalizedLabel> = {
  "artist-track": PASTE_COPY.formatArtistTrack,
  "track-artist": PASTE_COPY.formatTrackArtist,
}

const PLACEHOLDER = [
  "Bicep - Glue",
  "Overmono - So U Kno (128 bpm)",
  "01. Fred again.. - Delilah",
].join("\n")

/**
 * The "by hand" entry-point panel: name + genre + context, plus an OPTIONAL
 * pasted tracklist (moved here from the playlist detail page). One submit
 * creates the playlist and seeds the pasted tracks when present.
 */
export function ManualCreatePanel({
  locale,
  customContexts,
  customGenres,
}: {
  locale: SiteLocale
  customContexts: UserContext[]
  customGenres: UserGenre[]
}) {
  const [state, formAction, isPending] = useActionState(
    createPlaylistWithTracksAction,
    initialPlaylistActionState
  )
  const [text, setText] = useState("")
  const [format, setFormat] = useState<TracklistFormat>("artist-track")

  // Live preview only — the server re-parses the raw text on submit.
  const preview = useMemo(
    () => (text.trim() ? parseTracklist(text, format) : null),
    [text, format]
  )

  const contextCustoms: TaxonomyCustomOption[] = customContexts.map((entry) => ({
    id: entry.id,
    name: entry.name,
    behavesLikeLabel: CONTEXT_COPY[entry.behaves_like][locale],
  }))
  const genreCustoms: TaxonomyCustomOption[] = customGenres.map((entry) => ({
    id: entry.id,
    name: entry.name,
    behavesLikeLabel: GENRE_LABELS[entry.behaves_like] ?? entry.behaves_like,
  }))

  const trackCount = preview?.tracks.length ?? 0

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor="manual-name" className="text-white/72">
            {COPY.name[locale]}
          </Label>
          <Input
            id="manual-name"
            name="name"
            placeholder={COPY.namePlaceholder[locale]}
            maxLength={120}
            required
            className="border-white/12 text-white placeholder:text-white/32"
          />
          {state.fieldErrors?.name ? (
            <p className="text-xs text-ec-error">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-genre" className="text-white/72">
            {SHARED.genre[locale]}
          </Label>
          <TaxonomySelect
            id="manual-genre"
            name="genre"
            kind="genre"
            locale={locale}
            defaultValue="house"
            baseOptions={SUPPORTED_GENRES.map((genre) => ({
              value: genre,
              label: GENRE_LABELS[genre],
            }))}
            customs={genreCustoms}
          />
          {state.fieldErrors?.genre ? (
            <p className="text-xs text-ec-error">{state.fieldErrors.genre}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-context" className="text-white/72">
            {SHARED.setContext[locale]}
          </Label>
          <TaxonomySelect
            id="manual-context"
            name="context"
            kind="context"
            locale={locale}
            defaultValue="main"
            baseOptions={SET_CONTEXTS.map((context) => ({
              value: context,
              label: CONTEXT_COPY[context][locale],
            }))}
            customs={contextCustoms}
          />
          {state.fieldErrors?.context ? (
            <p className="text-xs text-ec-error">{state.fieldErrors.context}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-[16px] border border-ec-border bg-black/14 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {COPY.pasteTitle[locale]}
          </p>
          <p className="text-xs leading-5 text-white/48">
            {COPY.pasteHint[locale]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs uppercase tracking-[0.18em] text-white/38">
            {PASTE_COPY.lineFormat[locale]}
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

        <Textarea
          id="manual-tracklist-text"
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          maxLength={20000}
          className="border-white/12 font-mono text-sm text-white placeholder:text-white/28"
        />

        {preview ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/38">
              {formatTemplate(PASTE_COPY.preview[locale], {
                count: preview.tracks.length,
              })}
              {preview.errors.length > 0
                ? formatTemplate(PASTE_COPY.skippedSuffix[locale], {
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
                    {formatTemplate(PASTE_COPY.andMore[locale], {
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
                    {formatTemplate(PASTE_COPY.lineError[locale], {
                      line: error.line,
                    })}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? COPY.creating[locale]
            : trackCount > 0
              ? formatTemplate(COPY.createWithTracksCta[locale], {
                  count: trackCount,
                })
              : COPY.createCta[locale]}
        </Button>
        {!state.ok && state.message ? (
          <p className="text-sm text-ec-error">{state.message}</p>
        ) : null}
      </div>
    </form>
  )
}
