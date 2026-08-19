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
  TriangleAlert,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TrackAnalysis } from "@/lib/audio/analysis-types"
import { analyzeAudioFile, disposeAudioWorker } from "@/lib/audio/analyze-track"
import {
  ENERGY_LABEL_MAX,
  ENERGY_LABEL_MIN,
  clipKey,
  exportEnergyLabels,
  readEnergyLabels,
  removeEnergyLabel,
  summarizeEnergyLabels,
  writeEnergyLabel,
  labelsForFitting,
  parseLabelsDocument,
  type EnergyLabel,
} from "@/lib/audio/energy-labels"
import { fitEnergyModelV3 } from "@/lib/engine/energy-model-v3"
import { toTrackAudioFeatures } from "@/lib/audio/track-features"
import {
  CHROMA_METHODS,
  DEFAULT_CHROMA_METHOD,
  type ChromaMethod,
} from "@/lib/audio/analysis-types"
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
  variantAccuracy,
  formatVariantAccuracy,
} from "@/lib/audio/spike-report"
import {
  isAudioFileName,
  isSystemJunkFile,
} from "@/lib/playlists/parse-audio-tags"
import { cn } from "@/lib/utils"

/** 1…10, derived from the label bounds so the picker can't drift from the scale. */
const ENERGY_RATINGS = Array.from(
  { length: ENERGY_LABEL_MAX - ENERGY_LABEL_MIN + 1 },
  (_, index) => ENERGY_LABEL_MIN + index
)

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
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    /** What's being analysed right now — the thing that shows the run is alive. */
    current: "",
  })
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
  const [chromaMethod, setChromaMethod] =
    useState<ChromaMethod>(DEFAULT_CHROMA_METHOD)

  /**
   * Energy ratings, the training labels Energy Model v3 has no other source for.
   * Mirrored into localStorage so a reload doesn't lose an hour of listening.
   */
  const [labels, setLabels] = useState<Record<string, EnergyLabel>>({})
  const [copied, setCopied] = useState(false)
  /**
   * The picked File handles, so a row can be played. TrackAnalysis carries only
   * measurements, and rating a track you can't hear isn't rating.
   */
  const filesByClip = useRef(new Map<string, File>())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  // After mount, not during render: localStorage doesn't exist on the server, and
  // reading it in render would be a hydration mismatch.
  useEffect(() => setLabels(readEnergyLabels()), [])

  function rate(row: TrackAnalysis, value: number | null) {
    const clip = clipKey(row.fileName, row.fileSizeBytes)

    if (value === null) {
      setLabels(removeEnergyLabel(clip))
      return
    }

    const features = row.features ? toTrackAudioFeatures(row.features) : null

    // A rating with no measurement behind it can't train anything, so it isn't
    // stored — the select stays empty rather than pretending to have saved.
    if (!features) {
      return
    }

    setLabels(
      writeEnergyLabel(
        // The tempo the run detected: the model needs it and the feature set
        // doesn't carry it.
        { clip, fileName: row.fileName, label: value, features, bpm: row.bpm },
        new Date().toISOString()
      )
    )
  }

  function togglePlay(row: TrackAnalysis) {
    const clip = clipKey(row.fileName, row.fileSizeBytes)
    const element = audioRef.current
    const file = filesByClip.current.get(clip)

    if (!element || !file) {
      return
    }

    if (playing === clip) {
      element.pause()
      setPlaying(null)
      return
    }

    // Revoked on switch rather than accumulated: one live blob URL per rated track
    // would pin every file in memory for the session.
    if (element.src.startsWith("blob:")) {
      URL.revokeObjectURL(element.src)
    }

    element.src = URL.createObjectURL(file)
    void element.play()
    setPlaying(clip)
  }

  const labelSummary = useMemo(() => summarizeEnergyLabels(labels), [labels])

  async function copyLabels() {
    try {
      await navigator.clipboard.writeText(exportEnergyLabels(labels))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission can be refused; the labels are still in localStorage.
      setCopied(false)
    }
  }
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
    // The OS's own bookkeeping (.DS_Store and friends) is dropped before anything
    // is counted. It was never picked by a person, so reporting it as "ignored"
    // only makes a clean folder look like it had a problem.
    const picked = all.filter((file) => !isSystemJunkFile(file.name))
    const audio = picked.filter((file) => isAudioFileName(file.name))

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

    // Kept so a row can be played back for rating. A File is a reference to bytes
    // on disk, not the bytes, so holding the batch costs nothing.
    for (const file of batch) {
      filesByClip.current.set(clipKey(file.name, file.size), file)
    }

    setNotes({
      skippedNonAudio: picked.length - audio.length,
      skippedDuplicates: audio.length - unique.length,
      truncated: unique.length - batch.length,
    })

    if (batch.length === 0) {
      setRows([])
      return
    }

    setRows([])
    setRunning(true)
    setProgress({ done: 0, total: batch.length, current: batch[0]?.name ?? "" })
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
        chromaMethod,
      })
      setRows((current) => [...current, analysis])
      setProgress({
        done: index + 1,
        total: batch.length,
        // The next file, so the label names what is being worked on rather than
        // what just finished.
        current: batch[index + 1]?.name ?? "",
      })
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
          <label className="flex items-center gap-2 text-sm text-ec-text-dim">
            Chroma
            <select
              value={chromaMethod}
              onChange={(event) =>
                setChromaMethod(event.target.value as ChromaMethod)
              }
              disabled={running}
              className="rounded-md border border-ec-border bg-ec-raised px-2 py-1 text-sm text-ec-text"
            >
              {CHROMA_METHODS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* A long run has to look like a long run. The previous version of this was
            one line of dim grey text, which reads as a frozen page rather than as
            work in progress — and the instruction inside it (keep the tab in front)
            is load-bearing: without it the freeze probe measures nothing. */}
        {running ? <AnalysisProgress progress={progress} /> : null}

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
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ec-text-dim">
              <span>
                Energy labels: <strong className="text-ec-text">{labelSummary.usable}</strong> usable
                {labelSummary.total !== labelSummary.usable
                  ? ` (${labelSummary.total - labelSummary.usable} from an older extraction)`
                  : ""}
                {" · "}
                {labelSummary.coveredRatings}/10 ratings covered
              </span>
              {labelSummary.total === 0 ? (
                <span className="text-ec-text-muted">
                  Rate a track in the second column to start
                </span>
              ) : labelSummary.missingRatings.length > 0 ? (
                <span className="text-ec-amber">
                  {/* More useful than a raw count: fifty tracks all rated 7 fit a
                      model that can only ever answer 7. */}
                  still need a {labelSummary.missingRatings.join(", ")}
                </span>
              ) : (
                <span className="text-ec-mint">every rating has an example</span>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={copyLabels}
                disabled={labelSummary.usable === 0}
                className="h-7 px-2 text-xs"
                /* A disabled button with no reason reads as broken — it was read
                   that way once. Say what would enable it. */
                title={
                  labelSummary.usable === 0
                    ? "Rate at least one track first — there's nothing to copy yet"
                    : `Copy ${labelSummary.usable} label(s) as JSON`
                }
              >
                {copied ? "Copied" : "Copy labels JSON"}
              </Button>
            </div>
            {/* One element for the whole table: a per-row <audio> would decode
                every file the moment the rows render. */}
            <audio
              ref={audioRef}
              onEnded={() => setPlaying(null)}
              className="hidden"
            />
            <VariantMatrix rows={rows} />
            <FitPanel labels={labels} />

            <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ec-text-dim">
                  <tr className="border-b border-ec-border">
                    <SortableHeader
                      label="File"
                      sortKey="fileName"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    {/* Second column, not last. This is what the screen is *for*
                        while labelling, and fourteen columns overflowed the
                        container — so the one control the task needs sat past the
                        right edge, behind a scroll bar that announces there is more
                        but not that the more is the point. */}
                    <th className="px-3 py-2 font-medium">Energy by ear</th>
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
                    <th className="px-3 py-2 font-medium">Agree</th>
                    {/* The nine numeric columns that used to live here, folded into
                        one cell. Losing a little column-scannability buys back every
                        value being on screen at once. */}
                    <th className="px-3 py-2 font-medium">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => (
                    <TrackRow
                      key={`${index}-${row.fileName}`}
                      row={row}
                      label={
                        labels[clipKey(row.fileName, row.fileSizeBytes)] ?? null
                      }
                      playing={
                        playing === clipKey(row.fileName, row.fileSizeBytes)
                      }
                      canPlay={filesByClip.current.has(
                        clipKey(row.fileName, row.fileSizeBytes)
                      )}
                      onRate={rate}
                      onTogglePlay={togglePlay}
                    />
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

/**
 * What a run in progress looks like.
 *
 * Three things a reader needs and a dim one-liner didn't give them: that work is
 * happening at all (a bar that moves and a dot that pulses), how far along it is
 * (count, percentage, and the file being worked on), and the one instruction that
 * decides whether the numbers are worth anything.
 *
 * That last part is why the warning is a bordered amber panel rather than a note:
 * `requestAnimationFrame` is throttled in a background tab, so a run watched from
 * another window reports a freeze of 0 ms — indistinguishable from "never froze",
 * and the spike has already been burned by exactly that. An instruction that
 * invalidates the measurement when ignored cannot be styled like a footnote.
 */
function AnalysisProgress({
  progress,
}: {
  progress: { done: number; total: number; current: string }
}) {
  const percent =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0

  return (
    <div className="mt-4 rounded-xl border border-ec-border-strong bg-ec-raised p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ec-text">
          {/* Two spans: the outer one pings outward, the inner is a solid dot, so
              the signal reads as alive even when the bar sits on a slow file. */}
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ec-violet opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-ec-violet" />
          </span>
          Analysing {progress.done} of {progress.total}
        </span>
        <span className="text-sm tabular-nums text-ec-text-dim">{percent}%</span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ec-sunken"
        role="progressbar"
        aria-valuenow={progress.done}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-label="Analysis progress"
      >
        <div
          className="h-full rounded-full bg-ec-gradient transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {progress.current ? (
        <p className="mt-2 truncate text-xs text-ec-text-muted" title={progress.current}>
          {progress.current}
        </p>
      ) : null}

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-ec-amber/40 bg-ec-amber/10 px-3 py-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ec-amber" />
        <p className="text-xs text-ec-text">
          <strong className="font-medium">Keep this tab in front.</strong> The
          freeze probe uses animation frames, and the browser throttles those in a
          background tab — look away and it reports 0&nbsp;ms, which is
          indistinguishable from never having frozen.
        </p>
      </div>
    </div>
  )
}

/**
 * The per-track diagnostics, as labelled pairs in one cell.
 *
 * These were nine separate columns, and nine columns plus a filename overflowed the
 * page container. The resulting horizontal scroll cost more than tidiness: the
 * energy-rating control sat past the right edge, so the one thing the screen existed
 * for was the one thing nobody could see. A scroll bar announces that there is more
 * — never that the more is the point.
 *
 * Wrapping pairs give up a little scannability down a column and buy back every
 * value being visible at once, which is the trade this tool wants.
 */
/**
 * How every chroma × profile combination did, from the one run.
 *
 * The reason this exists rather than a picker and three runs: comparing variants
 * used to mean Robertino running the harness once per variant and sending
 * screenshots, which I then read by eye. That is slow for him and it puts a
 * transcription step between the measurement and the conclusion. Every vote here
 * comes from chroma the same frame pass already produced, so the whole comparison
 * is free.
 */
function VariantMatrix({ rows }: { rows: TrackAnalysis[] }) {
  const [copied, setCopied] = useState(false)
  const matrix = useMemo(() => variantAccuracy(rows), [rows])

  if (matrix.length === 0) {
    return null
  }

  const best = matrix[0]

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatVariantAccuracy(matrix))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-ec-border bg-ec-raised/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-sm font-bold">
          Key accuracy by variant
        </h3>
        <Button
          type="button"
          variant="secondary"
          onClick={copy}
          className="h-7 px-2 text-xs"
          title="Copy the table as text, so a result can be reported without a screenshot"
        >
          {copied ? "Copied" : "Copy as text"}
        </Button>
      </div>

      <table className="mt-3 w-full text-left text-xs">
        <thead className="uppercase tracking-wide text-ec-text-dim">
          <tr>
            <th className="py-1 pr-3 font-medium">Chroma</th>
            <th className="py-1 pr-3 font-medium">Profiles</th>
            <th className="py-1 pr-3 font-medium">Matches tag</th>
            {/* Sits beside the hit rate because it catches what the hit rate hides:
                a variant that answers the same key everywhere can look respectable
                on a small tagged sample while having lost all discrimination. */}
            <th className="py-1 font-medium">Spread of answers</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => {
            const percent =
              row.comparable > 0
                ? `${Math.round((row.hits / row.comparable) * 100)}%`
                : "n/a"

            return (
              <tr
                key={`${row.chroma}|${row.profiles}`}
                className="border-t border-ec-border/60"
              >
                <td className="py-1.5 pr-3">{row.chroma}</td>
                <td className="py-1.5 pr-3 text-ec-text-dim">{row.profiles}</td>
                <td className="py-1.5 pr-3 tabular-nums">
                  {row.hits}/{row.comparable}{" "}
                  <span className="text-ec-text-dim">({percent})</span>
                </td>
                <td className="py-1.5 tabular-nums text-ec-text-dim">
                  {row.topKey
                    ? `${row.distinctKeys} keys · top ${row.topKey.key} ×${row.topKey.count}`
                    : "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-ec-text-muted">
        Best on this library: <strong className="text-ec-text">{best.chroma}</strong>{" "}
        with {best.profiles}. Worth trusting only if its spread of answers is also
        wide — a combination that names one key for most of a library agrees with the
        tags by luck, not by reading the music.
      </p>
    </section>
  )
}

/**
 * Fits Energy Model v3 from the labels, right here.
 *
 * Until this existed the loop went: Robertino labels, copies the JSON, pastes it to
 * me, I run `fitEnergyModelV3` in a scratch script, I read the numbers back. That
 * makes the one step that turns a listening session into a model depend on me being
 * in the conversation, and it means he can't re-fit after adding ten more tracks
 * without asking.
 *
 * The verdict is not hidden behind interpretation: the spec's rule is that a more
 * complicated model which predicts no better is strictly worse, so the panel says
 * "ship it" or "don't" and shows both errors next to each other.
 */
function FitPanel({
  labels,
}: {
  labels: Record<string, EnergyLabel>
}) {
  const [pasted, setPasted] = useState("")
  const [copied, setCopied] = useState(false)

  const rows = useMemo(() => {
    // A paste wins over the live store, so a labels file from another machine can be
    // fitted without importing it anywhere.
    const source = pasted.trim() ? parseLabelsDocument(pasted) : labels
    return labelsForFitting(source)
  }, [labels, pasted])

  const result = useMemo(() => fitEnergyModelV3(rows), [rows])

  async function copyModel() {
    if (!result) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(result.model, null, 2)
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const beatsBaseline =
    result !== null && result.holdoutMae < result.bpmBaselineMae

  return (
    <section className="mt-6 rounded-xl border border-ec-border bg-ec-raised/40 p-4">
      <h3 className="font-heading text-sm font-bold">Fit Energy Model v3</h3>
      <p className="mt-1 text-xs text-ec-text-muted">
        Uses the ratings above, or paste a labels export from another machine.
        Standardises on the training rows only, holds out every fifth row, and fits
        by least squares on the logit of the rating.
      </p>

      <textarea
        value={pasted}
        onChange={(event) => setPasted(event.target.value)}
        placeholder="Paste a labels JSON here (optional)"
        rows={2}
        className="mt-3 w-full rounded-md border border-ec-border bg-ec-sunken px-2 py-1.5 font-mono text-xs text-ec-text"
      />

      <p className="mt-2 text-xs text-ec-text-dim">
        {rows.length} fittable row(s)
        {pasted.trim() ? " from the paste" : " from this session"}.
      </p>

      {result === null ? (
        <p className="mt-3 text-xs text-ec-amber">
          {/* Two different reasons, and the difference is actionable: one needs more
              tracks, the other needs more *varied* tracks. */}
          {rows.length < 18
            ? `Not enough to fit six parameters — ${rows.length} of about 30 rows. Rate more tracks.`
            : "Couldn't fit: two predictors are collinear, or one is constant across the corpus. Usually means the tracks are too alike — try a wider range of tempos and styles."}
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-ec-text-dim">Holdout error</dt>
              <dd className="tabular-nums text-ec-text">
                {result.holdoutMae.toFixed(2)} pts
              </dd>
            </div>
            <div>
              <dt className="text-ec-text-dim">BPM-only, same rows</dt>
              <dd className="tabular-nums text-ec-text">
                {result.bpmBaselineMae.toFixed(2)} pts
              </dd>
            </div>
            <div>
              <dt className="text-ec-text-dim">Training error</dt>
              <dd className="tabular-nums text-ec-text-dim">
                {result.trainingMae.toFixed(2)} pts
              </dd>
            </div>
            <div>
              <dt className="text-ec-text-dim">Rows</dt>
              <dd className="tabular-nums text-ec-text-dim">
                {result.usedRows} train / {result.holdoutRows} holdout
              </dd>
            </div>
          </dl>

          <p
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-xs",
              beatsBaseline
                ? "border-ec-mint/40 bg-ec-mint/10 text-ec-text"
                : "border-ec-amber/40 bg-ec-amber/10 text-ec-text"
            )}
          >
            {beatsBaseline ? (
              <>
                <strong className="font-medium">Beats BPM-only.</strong> Write both
                errors into docs/energy-model-v3.md, then paste the coefficients into
                ENERGY_MODEL_V3.
              </>
            ) : (
              <>
                <strong className="font-medium">Does not beat BPM-only.</strong> A
                model with more inputs that predicts no better is strictly worse, so
                this one doesn&apos;t ship. More rows across a wider range of energies
                is the next thing to try, not different coefficients.
              </>
            )}
          </p>

          <Button
            type="button"
            variant="secondary"
            onClick={copyModel}
            className="mt-3 h-7 px-2 text-xs"
            title="Copy the fitted coefficients as JSON"
          >
            {copied ? "Copied" : "Copy coefficients"}
          </Button>
        </>
      )}
    </section>
  )
}

function Signals({ row }: { row: TrackAnalysis }) {
  const seconds = Math.round(row.durationSeconds)

  const pairs: [string, string][] = [
    [
      "len",
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    ],
    ["took", formatDuration(row.totalMs)],
    ["×rt", `${Math.round(row.realtimeFactor)}×`],
  ]

  if (row.keyConfidence !== null) {
    pairs.push(["conf", row.keyConfidence.toFixed(2)])
  }

  if (row.features) {
    pairs.push(
      ["flux", row.features.fluxMean.toFixed(3)],
      ["entr", row.features.entropyMean.toFixed(3)],
      ["ons/s", row.features.onsetRate.toFixed(2)],
      [
        "tune",
        `${row.features.tuningOffsetSemitones >= 0 ? "+" : ""}${Math.round(
          row.features.tuningOffsetSemitones * 100
        )}¢`,
      ]
    )

    if (row.durationSeconds > 0) {
      pairs.push([
        "sampled",
        `${Math.round(row.features.analyzedSeconds)}s · ${Math.round(
          (row.features.analyzedSeconds / row.durationSeconds) * 100
        )}%`,
      ])
    }
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] leading-5 text-ec-text-dim">
      {pairs.map(([label, value]) => (
        <span key={label} className="tabular-nums whitespace-nowrap">
          <span className="text-ec-text-muted">{label}</span> {value}
        </span>
      ))}
    </div>
  )
}

function TrackRow({
  row,
  label,
  playing,
  canPlay,
  onRate,
  onTogglePlay,
}: {
  row: TrackAnalysis
  label: EnergyLabel | null
  playing: boolean
  canPlay: boolean
  onRate: (row: TrackAnalysis, value: number | null) => void
  onTogglePlay: (row: TrackAnalysis) => void
}) {
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

      {/* Second column: what the screen is for while labelling. */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTogglePlay(row)}
            disabled={!canPlay}
            className="rounded border border-ec-border px-2 py-1 text-xs text-ec-text-dim hover:text-ec-text disabled:opacity-40"
            aria-label={playing ? "Stop" : "Play"}
            title={canPlay ? undefined : "Re-pick the folder to play from here"}
          >
            {playing ? "■" : "▶"}
          </button>
          <select
            value={label?.label ?? ""}
            onChange={(event) =>
              onRate(
                row,
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            disabled={!row.features}
            className="rounded-md border border-ec-border bg-ec-raised px-2 py-1 text-xs text-ec-text disabled:opacity-40"
            title={
              row.features
                ? "How energetic this track feels to you, 1–10"
                : "No measurements for this file, so a rating can't be paired with anything"
            }
          >
            <option value="">—</option>
            {ENERGY_RATINGS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </td>

      {row.error ? (
        <td colSpan={4} className="px-3 py-2 text-ec-error">
          {row.error}
        </td>
      ) : (
        <>
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
            {row.keyAgreement !== null
              ? `${Math.round(row.keyAgreement * 100)}%${
                  row.keySegments ? ` (${row.keySegments})` : ""
                }`
              : "—"}
          </td>
          <td className="px-3 py-2">
            <Signals row={row} />
          </td>
        </>
      )}
    </tr>
  )
}
