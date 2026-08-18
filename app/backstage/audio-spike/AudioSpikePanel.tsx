"use client"

/**
 * The audio-analysis spike, as a briefing rather than a data dump.
 *
 * The first version printed numbers and left the reader to work out what they
 * meant, which failed its only real test: the person who has to decide whether
 * this ships couldn't read it. So the screen now leads with conclusions, groups
 * each measurement under the question it answers, and states what "good" is for
 * every number. The interpretation lives in `lib/audio/spike-report.ts`.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleHelp,
  FolderOpen,
  Music4,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TrackAnalysis } from "@/lib/audio/analysis-types"
import { analyzeAudioFile, disposeAudioWorker } from "@/lib/audio/analyze-track"
import {
  DEFAULT_KEY_PROFILES,
  KEY_PROFILES,
  type KeyProfileSet,
} from "@/lib/audio/key-detection"
import {
  bpmAgrees,
  buildSpikeReport,
  formatDuration,
  keysAgree,
  LONG_TRACK_SECONDS,
  sortTracks,
  type Measure,
  type SortKey,
  type Verdict,
} from "@/lib/audio/spike-report"
import { isAudioFileName } from "@/lib/playlists/parse-audio-tags"
import { cn } from "@/lib/utils"

const MAX_FILES = 60

interface SelectionNotes {
  /** Rejected because the extension isn't audio. */
  skippedNonAudio: number
  /** The same file picked twice (files + folder, or copies on disk). */
  skippedDuplicates: number
  /** Selection was larger than the cap. */
  truncated: number
}

export function AudioSpikePanel() {
  const filesInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<TrackAnalysis[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [worstFreezeMs, setWorstFreezeMs] = useState<number | null>(null)
  const [notes, setNotes] = useState<SelectionNotes>({
    skippedNonAudio: 0,
    skippedDuplicates: 0,
    truncated: 0,
  })
  const [supportsFolder, setSupportsFolder] = useState(false)
  /**
   * Which reference profiles this run correlates against. The whole point of the
   * switch: run the same folder twice and read the Key column, instead of
   * arguing about which published profile set suits dance music.
   */
  const [keyProfiles, setKeyProfiles] =
    useState<KeyProfileSet>(DEFAULT_KEY_PROFILES)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "totalMs",
    desc: true,
  })

  useEffect(() => {
    const probe = document.createElement("input")
    setSupportsFolder("webkitdirectory" in probe)
  }, [])

  useEffect(() => disposeAudioWorker, [])

  async function run(fileList: FileList | File[]) {
    const all = Array.from(fileList)
    const audio = all.filter((file) => isAudioFileName(file.name))

    // Dedupe by path + size. Picking files *and* the folder that contains them
    // otherwise analyses each one twice, which quietly doubles the batch and
    // skews every median.
    const seen = new Set<string>()
    const unique = audio.filter((file) => {
      const key = `${file.webkitRelativePath || file.name}::${file.size}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })

    const batch = unique.slice(0, MAX_FILES)

    setNotes({
      skippedNonAudio: all.length - audio.length,
      skippedDuplicates: audio.length - unique.length,
      truncated: unique.length - batch.length,
    })

    if (batch.length === 0) {
      setRows([])
      return
    }

    setRows([])
    setRunning(true)
    setProgress({ done: 0, total: batch.length })
    setWorstFreezeMs(null)

    // Main-thread responsiveness probe. requestAnimationFrame is throttled when
    // the tab isn't visible, so a background run reports a meaningless zero —
    // the frame count is how we tell "never froze" from "never measured".
    let worstGap = 0
    let frames = 0
    let lastTick = performance.now()
    let probing = true
    const tick = () => {
      const now = performance.now()
      frames += 1
      worstGap = Math.max(worstGap, now - lastTick)
      lastTick = now
      if (probing) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    const { parseBlob } = await import("music-metadata")

    for (const [index, file] of batch.entries()) {
      // Read the file's own tags first, so detected values have something to be
      // measured against.
      let taggedBpm: number | null = null
      let taggedKey: string | null = null
      try {
        const tags = await parseBlob(file, { duration: false, skipCovers: true })
        taggedBpm = typeof tags.common.bpm === "number" ? tags.common.bpm : null
        taggedKey = typeof tags.common.key === "string" ? tags.common.key : null
      } catch {
        // Untagged files are exactly the case this feature exists for.
      }

      const analysis = await analyzeAudioFile(file, {
        taggedBpm,
        taggedKey,
        keyProfiles,
      })
      setRows((current) => [...current, analysis])
      setProgress({ done: index + 1, total: batch.length })
    }

    probing = false
    // Under ~10 frames the probe never really ran; don't report a number.
    setWorstFreezeMs(frames > 10 ? worstGap : null)
    setRunning(false)
  }

  const report = useMemo(
    () => buildSpikeReport(rows, worstFreezeMs),
    [rows, worstFreezeMs]
  )

  const sortedRows = useMemo(
    () => sortTracks(rows, sort.key, sort.desc),
    [rows, sort]
  )

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key ? { key, desc: !current.desc } : { key, desc: true }
    )
  }

  const hasResults = report.tracks > 0 || report.failed > 0

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
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
          <Button onClick={() => filesInputRef.current?.click()} disabled={running}>
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
          <label className="flex items-center gap-2 text-sm text-ec-text-dim">
            Key profiles
            <select
              value={keyProfiles}
              onChange={(event) =>
                setKeyProfiles(event.target.value as KeyProfileSet)
              }
              disabled={running}
              className="rounded-md border border-ec-border bg-ec-raised px-2 py-1 text-sm text-ec-text"
            >
              {Object.keys(KEY_PROFILES).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {running ? (
            <span className="text-sm text-ec-text-dim">
              Analysing {progress.done}/{progress.total}… keep this tab in front or
              the freeze probe can&apos;t measure
            </span>
          ) : null}
        </div>

        <SelectionSummary notes={notes} analysed={report.tracks + report.failed} />
      </div>

      {!hasResults ? (
        <EmptyBriefing />
      ) : (
        <>
          {/* Conclusions first, before any raw number. */}
          <section className="rounded-xl border border-ec-border bg-ec-raised/40 p-5">
            <h2 className="font-heading text-lg font-bold">What this run says</h2>
            <ul className="mt-4 space-y-2.5">
              {report.headlines.map((line) => (
                <li key={line.text} className="flex gap-2.5 text-sm leading-6">
                  <VerdictIcon verdict={line.verdict} className="mt-1 shrink-0" />
                  <span className="text-ec-text-muted">{line.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <Question
            title="Is it fast enough?"
            note={`${report.tracks} tracks · ${Math.round(
              report.audioSeconds / 60
            )} min of audio${
              report.longFiles > 0
                ? ` · ${report.longFiles} file(s) over ${
                    LONG_TRACK_SECONDS / 60
                  } min look like recorded sets rather than tracks, which inflates the slow tail`
                : ""
            }`}
          >
            <MeasureCard label="This run took" measure={report.speed.batchTotal} />
            <MeasureCard
              label="Median per track"
              measure={report.speed.medianPerTrack}
            />
            <MeasureCard label="Slowest 5%" measure={report.speed.p95PerTrack} />
            <MeasureCard
              label="Realtime factor"
              measure={report.speed.realtimeFactor}
            />
          </Question>

          <Question title="Does the app stay usable while it runs?">
            <MeasureCard
              label="Worst interface freeze"
              measure={report.responsiveness.worstFreeze}
            />
          </Question>

          <Question
            title="Can we trust the numbers?"
            note={`Checked against the tags your own files carry. ${report.accuracy.bpmBreakdown.untagged} file(s) had no BPM tag and ${report.accuracy.keyBreakdown.untagged} had no key tag — those aren't failures, there was simply nothing to check.`}
          >
            <MeasureCard label="Tempo vs your tags" measure={report.accuracy.bpm} />
            <MeasureCard label="Key vs your tags" measure={report.accuracy.key} />
          </Question>

          <section className="space-y-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Per-track detail</h2>
              <p className="mt-1 max-w-3xl text-sm text-ec-text-dim">
                Use this to find <em>which</em> files disagree, not to read averages
                — that&apos;s what the cards above are for. Click a column heading to
                sort; sorting by key or tempo pulls the mismatches together.
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ec-border">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ec-text-dim">
                  <tr className="border-b border-ec-border">
                    <SortableHeader
                      label="File"
                      sortKey="fileName"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Length"
                      sortKey="durationSeconds"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Analysis time"
                      sortKey="totalMs"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="×RT"
                      sortKey="realtimeFactor"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Tempo — ours / tag"
                      sortKey="bpm"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Key — ours / tag"
                      sortKey="detectedKey"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Key conf."
                      sortKey="keyConfidence"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    {/* Windows that agreed. More trustworthy than Key conf.,
                        which reported 0.4-0.85 while getting the mode wrong. */}
                    <th className="px-3 py-2 font-medium">Agree</th>
                    <th className="px-3 py-2 font-medium">Flux</th>
                    <th className="px-3 py-2 font-medium">Entropy</th>
                    <th className="px-3 py-2 font-medium">Onsets/s</th>
                    {/* How much of the track the frames actually covered. Shown
                        because every column to the left is computed from that
                        sample, not from the whole file — see sample-windows.ts. */}
                    <th className="px-3 py-2 font-medium">Sampled</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => (
                    <TrackRow key={`${index}-${row.fileName}`} row={row} />
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-ec-text-dim">
              Flux, entropy and onsets are the raw inputs to the future Energy Model
              v3 — they&apos;re shown so we can sanity-check that they move with the
              music, not because they mean anything on their own yet.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function EmptyBriefing() {
  return (
    <section className="rounded-xl border border-ec-border bg-ec-raised/40 p-5">
      <h2 className="font-heading text-lg font-bold">What this screen is for</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ec-text-muted">
        It answers three questions about analysing audio in the browser, using your
        own library as the test set:
      </p>
      <ol className="mt-3 max-w-3xl list-decimal space-y-1.5 pl-5 text-sm leading-6 text-ec-text-muted">
        <li>
          <strong>Is it fast enough</strong> that a DJ would wait for a whole
          playlist?
        </li>
        <li>
          <strong>Does the app stay usable</strong> while it runs, or does the
          interface freeze?
        </li>
        <li>
          <strong>Are the results right?</strong> Checked against the BPM and key
          tags your files already carry. Whatever tool wrote those tags is the
          reference, and it has its own error rate — a disagreement is not proof
          we are the one that&apos;s wrong.
        </li>
      </ol>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ec-text-dim">
        Pick 20–30 tracks of what you actually play. Keep this tab in front while it
        runs, or the browser throttles the freeze probe and that number comes back
        meaningless. Audio never leaves this machine — only the tags and the
        measurements are read.
      </p>
    </section>
  )
}

function SelectionSummary({
  notes,
  analysed,
}: {
  notes: SelectionNotes
  analysed: number
}) {
  const parts: string[] = []
  if (analysed > 0) parts.push(`${analysed} analysed`)
  if (notes.skippedNonAudio > 0) {
    parts.push(`${notes.skippedNonAudio} non-audio file(s) ignored`)
  }
  if (notes.skippedDuplicates > 0) {
    parts.push(`${notes.skippedDuplicates} duplicate(s) skipped`)
  }
  if (notes.truncated > 0) {
    parts.push(`${notes.truncated} over the ${MAX_FILES}-file cap, not analysed`)
  }

  if (parts.length === 0) {
    return null
  }

  return <p className="text-sm text-ec-text-dim">{parts.join(" · ")}</p>
}

function Question({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        {note ? (
          <p className="mt-1 max-w-3xl text-sm text-ec-text-dim">{note}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  )
}

const VERDICT_TEXT: Record<Verdict, string> = {
  good: "text-ec-cyan",
  warn: "text-ec-amber",
  bad: "text-ec-error",
  unknown: "text-ec-text",
}

function VerdictIcon({
  verdict,
  className,
}: {
  verdict: Verdict
  className?: string
}) {
  const Icon =
    verdict === "good"
      ? CheckCircle2
      : verdict === "warn"
        ? AlertTriangle
        : verdict === "bad"
          ? XCircle
          : CircleHelp

  return (
    <Icon aria-hidden className={cn("size-4", VERDICT_TEXT[verdict], className)} />
  )
}

function MeasureCard({ label, measure }: { label: string; measure: Measure }) {
  return (
    <div className="rounded-lg border border-ec-border bg-ec-raised/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-ec-text-dim">{label}</p>
        <VerdictIcon verdict={measure.verdict} />
      </div>
      <p
        className={cn(
          "mt-1 font-heading text-lg font-bold",
          VERDICT_TEXT[measure.verdict]
        )}
      >
        {measure.value}
      </p>
      <p className="mt-1.5 text-[0.72rem] leading-5 text-ec-text-dim">
        {measure.meaning}
      </p>
    </div>
  )
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; desc: boolean }
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === sortKey

  return (
    <th
      className="px-3 py-2 font-medium"
      aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ec-text",
          active && "text-ec-text"
        )}
      >
        {label}
        {active ? (
          sort.desc ? (
            <ArrowDown aria-hidden className="size-3" />
          ) : (
            <ArrowUp aria-hidden className="size-3" />
          )
        ) : null}
      </button>
    </th>
  )
}

/** Detected value beside its tag, with the agreement made explicit. */
function ComparisonCell({
  detected,
  tagged,
  agrees,
}: {
  detected: string
  tagged: string
  agrees: boolean | null
}) {
  return (
    <td className="px-3 py-2">
      <span
        className={cn(
          "tabular-nums",
          agrees === true && "text-ec-cyan",
          agrees === false && "text-ec-error"
        )}
      >
        {detected}
      </span>
      <span className="text-ec-text-dim"> / {tagged}</span>
      {agrees === null ? (
        <span className="ml-1 text-[0.7rem] text-ec-text-dim">no tag</span>
      ) : null}
    </td>
  )
}

function TrackRow({ row }: { row: TrackAnalysis }) {
  const isLong = row.durationSeconds >= LONG_TRACK_SECONDS

  return (
    <tr className="border-b border-ec-border/60 last:border-b-0">
      {/*
        Wide, and wrapping rather than truncating. A DJ filename is
        "01 - Artist, Other Artist - Title (Extended Mix).flac" — the part that
        identifies the track sits at the end, which is exactly what an ellipsis
        eats. Two lines of full name beat one line ending in "…".
      */}
      <td className="min-w-[22rem] max-w-[34rem] px-3 py-2" title={row.fileName}>
        <span className="block break-words">{row.fileName}</span>
        {isLong ? (
          <span className="text-[0.7rem] text-ec-amber">
            looks like a recorded set, not a track
          </span>
        ) : null}
      </td>

      {row.error ? (
        <td colSpan={9} className="px-3 py-2 text-ec-error">
          {row.error}
        </td>
      ) : (
        <>
          <td className="px-3 py-2 tabular-nums">
            {Math.floor(row.durationSeconds / 60)}:
            {String(Math.round(row.durationSeconds % 60)).padStart(2, "0")}
          </td>
          <td className="px-3 py-2 tabular-nums">{formatDuration(row.totalMs)}</td>
          <td className="px-3 py-2 tabular-nums text-ec-text-dim">
            {Math.round(row.realtimeFactor)}×
          </td>
          <ComparisonCell
            detected={row.bpm ? row.bpm.toFixed(1) : "—"}
            tagged={row.taggedBpm !== null ? String(row.taggedBpm) : "—"}
            agrees={bpmAgrees(row.bpm, row.taggedBpm)}
          />
          <ComparisonCell
            detected={row.detectedKey ?? "—"}
            tagged={row.taggedKey ?? "—"}
            agrees={keysAgree(row.detectedKey, row.taggedKey)}
          />
          <td className="px-3 py-2 tabular-nums text-ec-text-dim">
            {row.keyConfidence !== null ? row.keyConfidence.toFixed(2) : "—"}
          </td>
          <td className="px-3 py-2 tabular-nums text-ec-text-dim">
            {row.keyAgreement !== null
              ? `${Math.round(row.keyAgreement * 100)}%${
                  row.keySegments ? ` (${row.keySegments})` : ""
                }`
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
          <td className="px-3 py-2 tabular-nums text-ec-text-dim">
            {row.features && row.durationSeconds > 0
              ? `${Math.round(row.features.analyzedSeconds)}s · ${Math.round(
                  (row.features.analyzedSeconds / row.durationSeconds) * 100
                )}%`
              : "—"}
          </td>
        </>
      )}
    </tr>
  )
}
