"use client"

import { useState } from "react"
import { ChevronDown, Download, ShieldCheck, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DASHBOARD_COPY, type LocalizedLabel } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  defaultExportFormat,
  exportFilename,
  hasPreservedEntries,
  nativeExportWillMissTracks,
  serializePlaylist,
  EXPORT_FORMAT_META,
  type ExportFormat,
  type ExportPlaylist,
} from "@/lib/playlists/export"
import { saveTextFile } from "@/lib/playlists/save-file"

const COPY = DASHBOARD_COPY.exportMenu

interface PlaylistExportButtonProps {
  playlist: ExportPlaylist
  locale: SiteLocale
}

interface MenuItem {
  format: ExportFormat
  label: LocalizedLabel
  ext: string
  group: "dj" | "plain"
}

const MENU_ITEMS: MenuItem[] = [
  { format: "rekordbox", label: COPY.forRekordbox, ext: ".xml", group: "dj" },
  { format: "traktor", label: COPY.forTraktor, ext: ".nml", group: "dj" },
  { format: "m3u8", label: COPY.forMusicApps, ext: ".m3u8", group: "dj" },
  { format: "csv", label: COPY.csvFile, ext: ".csv", group: "plain" },
  { format: "txt", label: COPY.textFile, ext: ".txt", group: "plain" },
]

export function PlaylistExportButton({
  playlist,
  locale,
}: PlaylistExportButtonProps) {
  const [open, setOpen] = useState(false)
  // Default off, and deliberately not remembered across opens: it writes into
  // the DJ's library, so it should be a decision each time rather than a
  // setting that quietly stays on.
  const [writeEnergy, setWriteEnergy] = useState(false)
  const disabled = playlist.tracks.length === 0
  const defaultFormat = defaultExportFormat(playlist.importSource)
  const fromFiles = playlist.importSource === "files"
  const preserved = hasPreservedEntries(playlist)

  function handleExport(format: ExportFormat) {
    setOpen(false)
    const content = serializePlaylist(format, playlist, {
      writeEnergyToComment: writeEnergy,
    })
    const { mimeType } = EXPORT_FORMAT_META[format]

    // Not awaited: this runs inside the click handler so the user gesture is
    // still live for the share sheet, and there is nothing to do with the
    // outcome — the OS reports success or the user dismissed it on purpose.
    void saveTextFile(exportFilename(format, playlist.name), mimeType, content)
  }

  const djItems = MENU_ITEMS.filter((i) => i.group === "dj")
  const plainItems = MENU_ITEMS.filter((i) => i.group === "plain")

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="border-white/10 bg-white/[0.04] text-white hover:border-white/16 hover:bg-white/[0.07]"
      >
        <Download className="size-3.5" />
        {COPY.export[locale]}
        <ChevronDown className="size-3.5" />
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-white/12 bg-[#17121f] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <p className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
              {COPY.djSoftware[locale]}
            </p>
            {preserved && !fromFiles ? (
              // Named before the click, next to the formats it applies to. The
              // people who need to read this are the ones a previous export
              // already cost hotcues.
              <div className="mx-1 mb-1 rounded-lg border border-[#4ADE80]/24 bg-[#4ADE80]/[0.07] px-2.5 py-2">
                <p className="flex items-start gap-1.5 text-[11px] font-medium leading-4 text-[#86EFAC]">
                  <ShieldCheck aria-hidden className="mt-px size-3 shrink-0" />
                  {COPY.preservedTitle[locale]}
                </p>
                <p className="mt-1 text-[10.5px] leading-4 text-white/58">
                  {COPY.preservedBody[locale]}
                </p>
              </div>
            ) : null}
            {fromFiles ? (
              // Said here rather than after the click: once the file is
              // downloaded, a warning is too late to be useful.
              <div className="mx-1 mb-1 rounded-lg border border-[#F5A524]/28 bg-[#F5A524]/10 px-2.5 py-2">
                <p className="flex items-start gap-1.5 text-[11px] font-medium leading-4 text-[#F5C15E]">
                  <TriangleAlert aria-hidden className="mt-px size-3 shrink-0" />
                  {COPY.filesWarningTitle[locale]}
                </p>
                <p className="mt-1 text-[10.5px] leading-4 text-white/58">
                  {COPY.filesWarningBody[locale]}
                </p>
              </div>
            ) : null}
            {djItems.map((item) => (
              <ExportRow
                key={item.format}
                item={item}
                isDefault={item.format === defaultFormat}
                willMiss={nativeExportWillMissTracks(
                  playlist.importSource,
                  item.format
                )}
                recommended={fromFiles}
                onClick={() => handleExport(item.format)}
                locale={locale}
              />
            ))}
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/45"
            >
              {COPY.forSerato[locale]}
              <span className="ml-auto rounded-md border border-white/12 px-1.5 text-[9.5px] uppercase tracking-[0.12em] text-white/40">
                {COPY.soon[locale]}
              </span>
            </button>

            <div className="my-1 h-px bg-white/[0.08]" />
            <label className="mx-1 flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
              <input
                type="checkbox"
                checked={writeEnergy}
                onChange={(event) => setWriteEnergy(event.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 accent-[#A24DE0]"
              />
              <span>
                <span className="block text-[11.5px] leading-4 text-white/78">
                  {COPY.writeEnergyLabel[locale]}
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-white/48">
                  {COPY.writeEnergyHint[locale]}
                </span>
              </span>
            </label>

            <div className="my-1 h-px bg-white/[0.08]" />
            <p className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
              {COPY.plain[locale]}
            </p>
            {plainItems.map((item) => (
              <ExportRow
                key={item.format}
                item={item}
                isDefault={item.format === defaultFormat}
                willMiss={false}
                recommended={fromFiles}
                onClick={() => handleExport(item.format)}
                locale={locale}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function ExportRow({
  item,
  isDefault,
  willMiss,
  recommended,
  onClick,
  locale,
}: {
  item: MenuItem
  isDefault: boolean
  /** Native export that can't resolve this playlist's files. */
  willMiss: boolean
  /** Label the default as "recommended" rather than just remembered. */
  recommended: boolean
  onClick: () => void
  locale: SiteLocale
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/[0.06] hover:text-white"
    >
      <span
        className={cn("whitespace-nowrap", willMiss && "text-white/50")}
      >
        {item.label[locale]}
      </span>
      <span className="font-mono text-[11px] text-white/38">{item.ext}</span>
      {willMiss ? (
        // Still selectable — someone may only want the metadata — but it can't
        // read as an equal choice next to the one that works. The block above
        // carries the explanation, so the row only marks which ones are hit.
        <TriangleAlert
          className="ml-auto size-3.5 shrink-0 text-[#F5C15E]"
          aria-label={COPY.willBeMissing[locale]}
        />
      ) : isDefault ? (
        <span className="ml-auto whitespace-nowrap text-[9.5px] uppercase tracking-[0.16em] text-white/38">
          {recommended ? COPY.recommendedTag[locale] : COPY.defaultTag[locale]}
        </span>
      ) : null}
    </button>
  )
}
