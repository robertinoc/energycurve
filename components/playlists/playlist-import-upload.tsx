"use client"

import { useActionState, useRef, useState } from "react"
import { CheckCircle2, UploadCloud } from "lucide-react"

import {
  importPlaylistAction,
} from "@/app/dashboard/playlists/actions"
import { initialPlaylistActionState } from "@/lib/playlists/action-state"
import { AudioFilesImport } from "@/components/playlists/audio-files-import"
import { ManualCreatePanel } from "@/components/playlists/manual-create-panel"
import { Button } from "@/components/ui/button"
import {
  TaxonomySelect,
  type TaxonomyCustomOption,
} from "@/components/playlists/taxonomy-select"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"
import {
  GENRE_LABELS,
  SET_CONTEXTS,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"
import type { UserContext, UserGenre } from "@/types/domain"

const COPY = DASHBOARD_COPY.importUpload

export function contextCustomOptions(
  customs: UserContext[],
  locale: SiteLocale
): TaxonomyCustomOption[] {
  return customs.map((entry) => ({
    id: entry.id,
    name: entry.name,
    behavesLikeLabel: CONTEXT_COPY[entry.behaves_like][locale],
  }))
}

export function genreCustomOptions(
  customs: UserGenre[]
): TaxonomyCustomOption[] {
  return customs.map((entry) => ({
    id: entry.id,
    name: entry.name,
    behavesLikeLabel: GENRE_LABELS[entry.behaves_like] ?? entry.behaves_like,
  }))
}

export function PlaylistImportUpload({
  locale,
  customContexts,
  customGenres,
}: {
  locale: SiteLocale
  customContexts: UserContext[]
  customGenres: UserGenre[]
}) {
  const [state, formAction, isPending] = useActionState(
    importPlaylistAction,
    initialPlaylistActionState
  )
  const [mode, setMode] = useState<"dj" | "audio" | "manual">("dj")
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function acceptDroppedFile(files: FileList | null) {
    const file = files?.[0]

    if (!file || !fileInputRef.current) {
      return
    }

    // Native inputs can't be assigned a File directly; a DataTransfer can
    // carry it in so the regular form submit path stays untouched.
    const transfer = new DataTransfer()
    transfer.items.add(file)
    fileInputRef.current.files = transfer.files
    setFileName(file.name)
  }

  return (
    <div className="rounded-[26px] bg-[linear-gradient(140deg,rgba(162,77,224,0.85),rgba(106,92,240,0.35)_40%,rgba(34,211,238,0.75))] p-px shadow-[0_30px_80px_rgba(0,0,0,0.45),0_0_60px_rgba(162,77,224,0.14)]">
      <div className="rounded-[25px] bg-[radial-gradient(120%_90%_at_85%_-10%,rgba(34,211,238,0.08),transparent_55%),radial-gradient(120%_90%_at_0%_0%,rgba(162,77,224,0.14),transparent_55%)] bg-ec-surface p-6 sm:p-7">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#7DE6F7]">
          {COPY.eyebrow[locale]}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-white">
          {COPY.title[locale]}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ec-text-muted">
          {mode === "audio"
            ? COPY.subtitleAudio[locale]
            : mode === "manual"
              ? COPY.subtitleManual[locale]
              : COPY.subtitle[locale]}
        </p>

        {/* The card hosts the three entry ways: a DJ-software export file,
            local audio files (tags read in the browser), or by hand (name +
            optional pasted tracklist). Same shell, one panel per tab. */}
        <div
          role="tablist"
          className="mt-5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
        >
          {(
            [
              { value: "dj", label: COPY.tabDjSoftware[locale] },
              { value: "audio", label: COPY.tabAudioFiles[locale] },
              { value: "manual", label: COPY.tabManual[locale] },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={mode === tab.value}
              onClick={() => setMode(tab.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.04em] transition-colors",
                mode === tab.value
                  ? "bg-white/12 text-white"
                  : "text-white/48 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "audio" ? (
          <div className="mt-5">
            <AudioFilesImport
              locale={locale}
              customContexts={customContexts}
              customGenres={customGenres}
            />
          </div>
        ) : null}

        {mode === "manual" ? (
          <div className="mt-5">
            <ManualCreatePanel
              locale={locale}
              customContexts={customContexts}
              customGenres={customGenres}
            />
          </div>
        ) : null}

        <form
          action={formAction}
          className={cn("mt-5 space-y-4", mode !== "dj" && "hidden")}
        >
          <label
            htmlFor="import-file"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              acceptDroppedFile(event.dataTransfer.files)
            }}
            className={cn(
              "block cursor-pointer rounded-[18px] border-[1.5px] border-dashed bg-[radial-gradient(80%_120%_at_50%_0%,rgba(106,92,240,0.10),transparent_70%)] px-6 py-8 text-center transition-all",
              dragging
                ? "border-[#22D3EE] bg-[#22D3EE]/[0.06]"
                : "border-[#A24DE0]/50 bg-black/20 hover:-translate-y-px hover:border-[#22D3EE]/75"
            )}
          >
            <span
              aria-hidden
              className="ec-gradient-bg mx-auto mb-3.5 grid size-13 place-items-center rounded-2xl shadow-[0_8px_26px_rgba(106,92,240,0.45)]"
            >
              {fileName ? (
                <CheckCircle2 className="size-6 text-white" />
              ) : (
                <UploadCloud className="size-6 text-white" />
              )}
            </span>

            {fileName ? (
              <>
                <span className="block truncate px-4 font-heading text-[16.5px] font-semibold text-white">
                  {fileName}
                </span>
                <span className="mt-1.5 block text-[12.5px] text-ec-cyan">
                  {COPY.fileReady[locale]}
                </span>
              </>
            ) : (
              <>
                <span className="block font-heading text-[16.5px] font-semibold text-white">
                  {COPY.dropzoneMain[locale]}{" "}
                  <span className="ec-gradient-text underline decoration-[#22D3EE]/50 underline-offset-3">
                    {COPY.browse[locale]}
                  </span>
                </span>
                <span className="mt-1.5 block text-[12.5px] text-ec-text-dim">
                  {COPY.dropzoneHint[locale]}
                </span>
              </>
            )}

            <span className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-[20px] border border-[#A24DE0]/40 bg-[#A24DE0]/[0.12] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#CDA2F1]">
                .xml · Rekordbox
              </span>
              <span className="rounded-[20px] border border-[#A24DE0]/40 bg-[#A24DE0]/[0.12] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#CDA2F1]">
                .txt · Rekordbox
              </span>
              <span className="rounded-[20px] border border-[#5EEAD4]/40 bg-[#5EEAD4]/[0.1] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8CF3E2]">
                .m3u8 · Music apps
              </span>
              <span className="rounded-[20px] border border-[#22D3EE]/40 bg-[#22D3EE]/[0.1] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7DE6F7]">
                .nml · Traktor
              </span>
            </span>
          </label>
          <input
            ref={fileInputRef}
            id="import-file"
            name="file"
            type="file"
            accept=".xml,.nml,.txt,.m3u8,.m3u,text/xml,application/xml,text/plain,audio/x-mpegurl"
            required
            className="sr-only"
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? null)
            }
          />

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-[14px] border border-ec-border bg-white/[0.02] px-3.5 py-2.5">
            <span className="mr-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ec-text-dim">
              {COPY.readsLabel[locale]}
            </span>
            {[
              { label: "BPM", mik: false },
              { label: COPY.readKey[locale], mik: false },
              { label: COPY.readGenres[locale], mik: false },
              { label: COPY.readMik[locale], mik: true },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-ec-text-muted"
              >
                <span
                  className={cn(
                    "size-[5px] rounded-full",
                    item.mik ? "bg-ec-violet" : "bg-ec-cyan"
                  )}
                />
                {item.label}
              </span>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="import-context"
                className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-ec-text-dim"
              >
                {COPY.setContext[locale]}
              </label>
              <TaxonomySelect
                id="import-context"
                name="context"
                kind="context"
                locale={locale}
                defaultValue="main"
                baseOptions={SET_CONTEXTS.map((context) => ({
                  value: context,
                  label: CONTEXT_COPY[context][locale],
                }))}
                customs={contextCustomOptions(customContexts, locale)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="import-genre"
                className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-ec-text-dim"
              >
                {COPY.genre[locale]}
              </label>
              <TaxonomySelect
                id="import-genre"
                name="genre"
                kind="genre"
                locale={locale}
                defaultValue=""
                leadingOption={{
                  value: "",
                  label: COPY.autoDetect[locale],
                  badge: COPY.recommended[locale],
                }}
                baseOptions={SUPPORTED_GENRES.map((genre) => ({
                  value: genre,
                  label: GENRE_LABELS[genre],
                }))}
                customs={genreCustomOptions(customGenres)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? COPY.importing[locale] : COPY.importCta[locale]}
            </Button>
            <span className="text-[12.5px] text-ec-text-dim">
              {COPY.ctaHint[locale]}
            </span>
            {!state.ok && state.message ? (
              <p className="w-full text-sm text-ec-error">{state.message}</p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
