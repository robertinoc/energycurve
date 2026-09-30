"use client"

import { useRef, useState } from "react"
import { ArrowRight, Download, FileCheck2, Upload } from "lucide-react"

import { CONVERTER_COPY } from "@/lib/content/playlist-converter-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { decodeUploadedText } from "@/lib/playlists/decode-upload"
import {
  ConversionError,
  convertPlaylistFile,
  type ConversionResult,
  type ConvertedFile,
} from "@/lib/tools/playlist-converter"
import { captureToolEvent } from "@/lib/tools/tool-events"

/**
 * The converter's interface: a drop zone, then a list of files to download.
 *
 * The direction is read from the extension rather than asked for. TraktorBox
 * asked first and uploaded second, which was two steps to arrive at a fact the
 * filename already states — and a wrong answer on step one produced an error
 * on step two. Here the two directions are shown as what they are: a
 * description of what comes out, not a choice to make.
 *
 * Everything happens in this tab. `File.arrayBuffer()` reads the bytes the
 * browser already holds, the converter is a pure function, and the download is
 * a Blob URL. There is no request in this component, which is what lets the
 * page promise the file is never uploaded and have that be a structural fact.
 */

type Stage =
  | { kind: "idle" }
  | { kind: "result"; sourceName: string; result: ConversionResult }

const ACCEPT = ".nml,.m3u8,.m3u"

function saveFile(file: ConvertedFile) {
  const blob = new Blob([file.contents], { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = file.filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoked on the next tick, not synchronously: Safari has been seen to drop
  // a download whose URL was revoked before the click had finished dispatching.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function PlaylistConverter({ locale }: { locale: SiteLocale }) {
  const copy = CONVERTER_COPY.ui
  const [stage, setStage] = useState<Stage>({ kind: "idle" })
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function messageFor(caught: unknown): string {
    if (caught instanceof ConversionError) {
      switch (caught.code) {
        case "unsupported_extension":
          return copy.errorUnsupported[locale]
        case "no_playlists":
          return copy.errorNoPlaylists[locale]
        case "no_tracks":
          return copy.errorNoTracks[locale]
        case "unreadable":
          return copy.errorUnreadable[locale]
      }
    }

    return copy.errorUnreadable[locale]
  }

  async function acceptFile(file: File | undefined) {
    if (!file) {
      return
    }

    try {
      // `arrayBuffer()` on the File the browser already holds. Nothing is
      // posted: the bytes go from the disk into this tab and no further.
      const contents = decodeUploadedText(await file.arrayBuffer())
      const result = convertPlaylistFile(file.name, contents)

      setError(null)
      setStage({ kind: "result", sourceName: file.name, result })

      // Direction and counts only — never the filename or a track. The page's
      // promise is that the playlist stays on the DJ's machine.
      captureToolEvent("tool_result_shown", {
        locale,
        tool: "playlist_converter",
        direction: result.direction,
        trackCount: result.files.reduce((sum, out) => sum + out.trackCount, 0),
      })
    } catch (caught) {
      setStage({ kind: "idle" })
      setError(messageFor(caught))
    } finally {
      // So the same file can be chosen again after an error.
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  function reset() {
    setStage({ kind: "idle" })
    setError(null)
  }

  function trackCountLabel(count: number) {
    return count === 1
      ? copy.trackCountOne[locale]
      : copy.trackCountMany[locale].replace("{n}", String(count))
  }

  return (
    <div className="rounded-[26px] bg-[linear-gradient(140deg,rgba(162,77,224,0.85),rgba(106,92,240,0.35)_40%,rgba(34,211,238,0.75))] p-px shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="rounded-[25px] bg-ec-surface p-5 sm:p-7">
        {stage.kind === "idle" && (
          <>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                void acceptFile(event.dataTransfer.files?.[0])
              }}
              className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center transition sm:p-8 ${
                dragging
                  ? "border-ec-cyan bg-white/[0.06]"
                  : "border-white/15 bg-white/[0.02]"
              }`}
            >
              <Upload className="size-7 text-ec-cyan/70" aria-hidden />
              <h2 className="font-heading text-lg font-semibold text-white">
                {copy.dropTitle[locale]}
              </h2>
              <p className="max-w-md text-sm leading-6 text-white/60">
                {copy.dropBody[locale]}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                // Visually hidden and opened by the button beside it, so there
                // is no visible label to point an htmlFor at — but a screen
                // reader still lands on the input and has to be told what it
                // takes.
                aria-label={copy.dropTitle[locale]}
                onChange={(event) => void acceptFile(event.target.files?.[0])}
                data-testid="converter-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
              >
                {copy.browse[locale]}
              </button>
            </div>

            <section className="mt-5" aria-labelledby="converter-directions">
              <h3
                id="converter-directions"
                className="text-[11px] uppercase tracking-[0.16em] text-white/50"
              >
                {copy.directionsTitle[locale]}
              </h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["nmlToM3u8", "nmlToM3u8Body", ".nml", ".m3u8"],
                    ["m3u8ToNml", "m3u8ToNmlBody", ".m3u8", ".nml"],
                  ] as const
                ).map(([name, body, from, to]) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                  >
                    <p className="flex items-center gap-2 font-heading text-sm font-semibold text-white">
                      <span>{copy[name][locale]}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-ec-cyan">
                      {from}
                      <ArrowRight className="size-3" aria-hidden />
                      {to}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-white/60">
                      {copy[body][locale]}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {stage.kind === "result" && (
          <div data-testid="converter-result">
            <div className="flex items-start gap-3">
              <FileCheck2 className="mt-0.5 size-6 shrink-0 text-ec-cyan" aria-hidden />
              <div>
                <h2 className="font-heading text-lg font-semibold text-white">
                  {copy.resultTitle[locale]}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {stage.result.files.length === 1
                    ? `${copy.resultOne[locale]} `
                    : `${stage.result.files.length} ${copy.resultMany[locale]} `}
                  {stage.result.files.length === 1 && (
                    <span className="font-mono text-white/80">
                      {stage.sourceName}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-2" data-testid="converter-files">
              {stage.result.files.map((file) => (
                <li
                  key={file.filename}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-white">
                      {file.filename}
                    </p>
                    <p className="text-xs text-white/50">
                      {trackCountLabel(file.trackCount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveFile(file)}
                    className="inline-flex items-center gap-2 rounded-full bg-ec-cyan px-4 py-2 text-sm font-semibold text-[#08050F] transition hover:brightness-110"
                    data-testid="converter-download"
                  >
                    <Download className="size-4" aria-hidden />
                    {copy.download[locale]}
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm leading-6 text-white/60">
              {stage.result.direction === "nml_to_m3u8"
                ? copy.nextNml[locale]
                : copy.nextM3u8[locale]}
            </p>

            <button
              type="button"
              onClick={reset}
              className="mt-4 text-sm font-semibold text-ec-cyan underline-offset-4 hover:underline"
              data-testid="converter-reset"
            >
              {copy.convertAnother[locale]}
            </button>
          </div>
        )}

        {error && (
          <p
            role="alert"
            // Its own handle: `getByRole("alert")` matches two elements on any
            // page here, because Next ships a route announcer with the same role.
            data-testid="converter-error"
            className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/[0.07] p-4 text-sm leading-6 text-red-100/85"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
