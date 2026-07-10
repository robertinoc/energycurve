"use client"

import { useState } from "react"
import { ChevronDown, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DASHBOARD_COPY, type LocalizedLabel } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  defaultExportFormat,
  exportFilename,
  serializePlaylist,
  EXPORT_FORMAT_META,
  type ExportFormat,
  type ExportPlaylist,
} from "@/lib/playlists/export"

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
  { format: "csv", label: COPY.csvFile, ext: ".csv", group: "plain" },
  { format: "txt", label: COPY.textFile, ext: ".txt", group: "plain" },
]

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function PlaylistExportButton({
  playlist,
  locale,
}: PlaylistExportButtonProps) {
  const [open, setOpen] = useState(false)
  const disabled = playlist.tracks.length === 0
  const defaultFormat = defaultExportFormat(playlist.importSource)

  function handleExport(format: ExportFormat) {
    setOpen(false)
    const content = serializePlaylist(format, playlist)
    const { mimeType } = EXPORT_FORMAT_META[format]
    downloadFile(exportFilename(format, playlist.name), mimeType, content)
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
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-white/12 bg-[#17121f] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <p className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
              {COPY.djSoftware[locale]}
            </p>
            {djItems.map((item) => (
              <ExportRow
                key={item.format}
                item={item}
                isDefault={item.format === defaultFormat}
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
            <p className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
              {COPY.plain[locale]}
            </p>
            {plainItems.map((item) => (
              <ExportRow
                key={item.format}
                item={item}
                isDefault={item.format === defaultFormat}
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
  onClick,
  locale,
}: {
  item: MenuItem
  isDefault: boolean
  onClick: () => void
  locale: SiteLocale
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/[0.06] hover:text-white"
    >
      {item.label[locale]}
      <span className="font-mono text-[11px] text-white/38">{item.ext}</span>
      {isDefault ? (
        <span className="ml-auto text-[9.5px] uppercase tracking-[0.16em] text-white/38">
          {COPY.defaultTag[locale]}
        </span>
      ) : null}
    </button>
  )
}
