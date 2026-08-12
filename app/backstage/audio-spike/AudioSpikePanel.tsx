"use client"

/**
 * Measurement harness for the browser audio-analysis spike.
 *
 * Pick real files, get per-track timings plus an accuracy read against the
 * tags those files already carry (usually written by Mixed In Key), and a
 * verdict on whether browser-side analysis is fast enough to ship.
 *
 * Lives in backstage because it is a measuring instrument, not a feature.
 */

import { useEffect, useRef, useState } from "react"
import { FolderOpen, Music4 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TrackAnalysis } from "@/lib/audio/analysis-types"
import { analyzeAudioFile, disposeAudioWorker } from "@/lib/audio/analyze-track"
import { isAudioFileName } from "@/lib/playlists/parse-audio-tags"
import { toCamelot } from "@/lib/music/camelot"
import { cn } from "@/lib/utils"

const MAX_FILES = 60

function formatMs(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function p95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.round(0.95 * (sorted.length - 1)))]
}

/** Octave-agnostic Camelot comparison: same ring position counts as a match. */
function keysAgree(detected: string | null, tagged: string | null): boolean | null {
  if (!detected || !tagged) return null
  const a = toCamelot(detected)
  const b = toCamelot(tagged)
  if (!a || !b) return null
  return a === b
}

/** Tolerates half/double-time tag conventions, like the engine's B21 rule. */
function bpmAgrees(detected: number | null, tagged: number | null): boolean | null {
  if (!detected || !tagged) return null
  const close = (a: number, b: number) => Math.abs(a - b) <= 1.5
  return close(detected, tagged) || close(detected, tagged * 2) || close(detected, tagged / 2)
}

export function AudioSpikePanel() {
  const filesInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<TrackAnalysis[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [uiBlockedMs, setUiBlockedMs] = useState(0)
  const [supportsFolder, setSupportsFolder] = useState(false)

  useEffect(() => {
    const probe = document.createElement("input")
    setSupportsFolder("webkitdirectory" in probe)
  }, [])

  useEffect(() => disposeAudioWorker, [])

  async function run(fileList: FileList | File[]) {
    const picked = Array.from(fileList).filter((file) => isAudioFileName(file.name))
    if (picked.length === 0) return

    const batch = picked.slice(0, MAX_FILES)
    setRows([])
    setRunning(true)
    setProgress({ done: 0, total: batch.length })
    setUiBlockedMs(0)

    // Main-thread responsiveness probe: a rAF loop should tick every ~16ms.
    // The largest gap it sees is the longest the UI was frozen — the number
    // that decides whether this can run while someone uses the app.
    let worstGap = 0
    let lastTick = performance.now()
    let probing = true
    const tick = () => {
      const now = performance.now()
      worstGap = Math.max(worstGap, now - lastTick)
      lastTick = now
      if (probing) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    const { parseBlob } = await import("music-metadata")

    for (const [index, file] of batch.entries()) {
      // Read the file's own tags first so detected values have something to be
      // compared against.
      let taggedBpm: number | null = null
      let taggedKey: string | null = null
      try {
        const tags = await parseBlob(file, { duration: false, skipCovers: true })
        taggedBpm = typeof tags.common.bpm === "number" ? tags.common.bpm : null
        taggedKey = typeof tags.common.key === "string" ? tags.common.key : null
      } catch {
        // Untagged files are exactly the case this feature exists for.
      }

      const analysis = await analyzeAudioFile(file, { taggedBpm, taggedKey })
      setRows((current) => [...current, analysis])
      setProgress({ done: index + 1, total: batch.length })
    }

    probing = false
    setUiBlockedMs(worstGap)
    setRunning(false)
  }

  const done = rows.filter((row) => !row.error)
  const totals = {
    tracks: done.length,
    audioSeconds: done.reduce((sum, row) => sum + row.durationSeconds, 0),
    wallMs: done.reduce((sum, row) => sum + row.totalMs, 0),
    decode: median(done.map((row) => row.decodeMs)),
    bpm: median(done.map((row) => row.bpmMs)),
    features: median(done.map((row) => row.featuresMs)),
    totalMedian: median(done.map((row) => row.totalMs)),
    totalP95: p95(done.map((row) => row.totalMs)),
    realtime: median(done.map((row) => row.realtimeFactor)),
  }

  const keyChecks = done.map((row) => keysAgree(row.detectedKey, row.taggedKey))
  const bpmChecks = done.map((row) => bpmAgrees(row.bpm, row.taggedBpm))
  const keyComparable = keyChecks.filter((value) => value !== null)
  const bpmComparable = bpmChecks.filter((value) => value !== null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          onChange={(event) => event.target.files && run(event.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error — non-standard but widely supported folder picking
          webkitdirectory=""
          className="hidden"
          onChange={(event) => event.target.files && run(event.target.files)}
        />
        <Button
          onClick={() => filesInputRef.current?.click()}
          disabled={running}
        >
          <Music4 className="size-4" />
          Pick audio files
        </Button>
        {supportsFolder ? (
          <Button
            variant="outline"
            onClick={() => folderInputRef.current?.click()}
            disabled={running}
          >
            <FolderOpen className="size-4" />
            Pick a folder
          </Button>
        ) : null}
        {running ? (
          <span className="self-center text-sm text-ec-text-dim">
            Analysing {progress.done}/{progress.total}…
          </span>
        ) : null}
      </div>

      {done.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Median per track" value={formatMs(totals.totalMedian)} />
          <Stat label="p95 per track" value={formatMs(totals.totalP95)} />
          <Stat
            label="Realtime factor"
            value={`${totals.realtime.toFixed(0)}×`}
            hint="audio seconds analysed per second of wall clock"
          />
          <Stat
            label="Worst UI freeze"
            value={formatMs(uiBlockedMs)}
            hint="longest gap between animation frames"
            tone={uiBlockedMs > 200 ? "bad" : uiBlockedMs > 50 ? "warn" : "good"}
          />
          <Stat label="Median decode" value={formatMs(totals.decode)} />
          <Stat label="Median BPM pass" value={formatMs(totals.bpm)} />
          <Stat label="Median feature pass" value={formatMs(totals.features)} />
          <Stat
            label="Batch total"
            value={`${formatMs(totals.wallMs)} for ${totals.tracks} tracks`}
            hint={`${Math.round(totals.audioSeconds / 60)} min of audio`}
          />
          <Stat
            label="BPM vs tags"
            value={
              bpmComparable.length === 0
                ? "no tagged files"
                : `${bpmComparable.filter(Boolean).length}/${bpmComparable.length}`
            }
            hint="±1.5 BPM, half/double-time tolerated"
          />
          <Stat
            label="Key vs tags"
            value={
              keyComparable.length === 0
                ? "no tagged files"
                : `${keyComparable.filter(Boolean).length}/${keyComparable.length}`
            }
            hint="exact Camelot position"
          />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-ec-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ec-text-dim">
              <tr className="border-b border-ec-border">
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Len</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">×RT</th>
                <th className="px-3 py-2 font-medium">BPM</th>
                <th className="px-3 py-2 font-medium">Tag</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Tag</th>
                <th className="px-3 py-2 font-medium">Conf</th>
                <th className="px-3 py-2 font-medium">Flux</th>
                <th className="px-3 py-2 font-medium">Entropy</th>
                <th className="px-3 py-2 font-medium">Onsets/s</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const keyOk = keysAgree(row.detectedKey, row.taggedKey)
                const bpmOk = bpmAgrees(row.bpm, row.taggedBpm)

                return (
                  <tr
                    key={`${index}-${row.fileName}`}
                    className="border-b border-ec-border/60 last:border-b-0"
                  >
                    <td className="max-w-[240px] truncate px-3 py-2" title={row.fileName}>
                      {row.fileName}
                    </td>
                    {row.error ? (
                      <td colSpan={11} className="px-3 py-2 text-ec-amber">
                        {row.error}
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2 tabular-nums">
                          {Math.round(row.durationSeconds)}s
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatMs(row.totalMs)}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {row.realtimeFactor.toFixed(0)}×
                        </td>
                        <td className={cn("px-3 py-2 tabular-nums", verdictClass(bpmOk))}>
                          {row.bpm ? row.bpm.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ec-text-dim">
                          {row.taggedBpm ?? "—"}
                        </td>
                        <td className={cn("px-3 py-2", verdictClass(keyOk))}>
                          {row.detectedKey ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-ec-text-dim">
                          {row.taggedKey ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ec-text-dim">
                          {row.keyConfidence !== null
                            ? row.keyConfidence.toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ec-text-dim">
                          {row.features ? row.features.fluxMean.toFixed(3) : "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ec-text-dim">
                          {row.features ? row.features.entropyMean.toFixed(3) : "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ec-text-dim">
                          {row.features ? row.features.onsetRate.toFixed(2) : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function verdictClass(agrees: boolean | null): string {
  if (agrees === null) return ""
  return agrees ? "text-ec-cyan" : "text-ec-amber"
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: "good" | "warn" | "bad"
}) {
  return (
    <div className="rounded-lg border border-ec-border bg-ec-raised/40 p-3">
      <p className="text-xs uppercase tracking-wide text-ec-text-dim">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-lg font-bold",
          tone === "bad" && "text-ec-error",
          tone === "warn" && "text-ec-amber",
          tone === "good" && "text-ec-cyan"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[0.7rem] text-ec-text-dim">{hint}</p> : null}
    </div>
  )
}
