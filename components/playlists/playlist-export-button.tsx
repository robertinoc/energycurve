"use client"

import { useState } from "react"
import { ChevronDown, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  availableExportFormats,
  defaultExportFormat,
  EXPORT_FORMAT_META,
  exportFilename,
  serializePlaylist,
  type ExportFormat,
  type ExportPlaylist,
} from "@/lib/playlists/export"

interface PlaylistExportButtonProps {
  playlist: ExportPlaylist
}

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

export function PlaylistExportButton({ playlist }: PlaylistExportButtonProps) {
  const [open, setOpen] = useState(false)

  const primary = defaultExportFormat(playlist.importSource)
  const formats = availableExportFormats(playlist.importSource)
  const disabled = playlist.tracks.length === 0

  function handleExport(format: ExportFormat) {
    setOpen(false)
    const content = serializePlaylist(format, playlist)
    const { mimeType } = EXPORT_FORMAT_META[format]
    downloadFile(exportFilename(format, playlist.name), mimeType, content)
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleExport(primary)}
          className="rounded-r-none border-white/10 bg-white/[0.04] text-white hover:border-white/16 hover:bg-white/[0.07]"
        >
          <Download className="size-3.5" />
          Export {EXPORT_FORMAT_META[primary].label}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Choose export format"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="rounded-l-none border-l-0 border-white/10 bg-white/[0.04] px-2 text-white hover:border-white/16 hover:bg-white/[0.07]"
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-white/12 bg-[#14101F] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <p className="px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.18em] text-white/40">
              Save as
            </p>
            {formats.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => handleExport(format)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/[0.06]",
                  format === primary ? "text-white" : ""
                )}
              >
                {EXPORT_FORMAT_META[format].label}
                {format === primary ? (
                  <span className="text-[0.6rem] uppercase tracking-[0.16em] text-white/38">
                    Default
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
