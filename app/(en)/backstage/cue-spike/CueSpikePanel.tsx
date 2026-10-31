"use client"

/**
 * The CUE-points measuring instrument (phase A). Drop files, get each track's
 * whole envelope with the three suggested CUEs on it, export the table.
 *
 * Nothing leaves the browser and nothing is written anywhere: the audio stays on
 * the machine like every other analysis here, and the results exist only in this
 * tab and in whatever file the export downloads.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, Music4 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TrackAnalysis } from "@/lib/audio/analysis-types"
import { analyzeAudioFile, disposeAudioWorker } from "@/lib/audio/analyze-track"
import { formatMinutesSeconds, type CueKind } from "@/lib/audio/cue-candidates"
import {
  candidatesFor,
  summarise,
  toCsv,
  toCueRow,
  toJsonExport,
} from "@/lib/audio/cue-report"
import {
  isAudioFileName,
  isSystemJunkFile,
} from "@/lib/playlists/parse-audio-tags"

import { Bento, BentoLabel } from "../BackstagePrimitives"
import { CUE_STYLE, EnvelopeChart } from "./EnvelopeChart"

const MAX_FILES = 60

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  // Revoked on the next tick: revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function ms(value: number | null) {
  if (value === null) return "—"
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

export function CueSpikePanel() {
  const filesInputRef = useRef<HTMLInputElement>(null)
  const [analyses, setAnalyses] = useState<TrackAnalysis[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  useEffect(() => disposeAudioWorker, [])

  async function run(fileList: FileList | File[]) {
    const audio = Array.from(fileList).filter(
      (file) => !isSystemJunkFile(file.name) && isAudioFileName(file.name)
    )
    const batch = audio.slice(0, MAX_FILES)
    if (batch.length === 0) return

    setAnalyses([])
    setRunning(true)
    setProgress({ done: 0, total: batch.length })

    // One at a time, like the import: timing several decodes at once would
    // measure contention, not the analysis.
    for (const [index, file] of batch.entries()) {
      const analysis = await analyzeAudioFile(file, { cueMeasurement: true })
      setAnalyses((current) => [...current, analysis])
      setProgress({ done: index + 1, total: batch.length })
    }

    setRunning(false)
  }

  const results = useMemo(
    () =>
      analyses.map((analysis) => {
        const cues = candidatesFor(analysis)
        return { analysis, cues, row: toCueRow(analysis, cues) }
      }),
    [analyses]
  )
  const summary = useMemo(() => summarise(results.map((r) => r.row)), [results])

  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-")

  return (
    <div
      className="space-y-6"
      style={{
        // Standalone mode has no browser chrome: the page owns the notch and the
        // home indicator, so its edges have to stay clear of them.
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
      }}
    >
      <div className="flex flex-wrap gap-3">
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          data-testid="cue-files"
          onChange={(event) => event.target.files && run(event.target.files)}
        />
        <Button size="lg" onClick={() => filesInputRef.current?.click()} disabled={running}>
          <Music4 className="size-4" />
          Pick audio files
        </Button>
        {/* No folder picker, unlike the audio spike: this is read on a phone,
            where there are no folders to pick, and a multi-select covers 10–20
            files on a desktop. */}
      </div>

      {running ? (
        <p className="font-mono text-sm text-ec-text-muted" aria-live="polite">
          Analysing {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of{" "}
          {progress.total}…
        </p>
      ) : null}

      {results.length === 0 ? (
        <Bento className="p-5">
          <p className="text-sm leading-6 text-ec-text-muted">
            Pick 10–20 tracks you know well. For each one you get the whole
            track&apos;s energy, with three suggested CUEs on it: where the groove
            comes <strong>in</strong>, where the biggest <strong>drop</strong>{" "}
            lands, and where the outro starts (<strong>out</strong>). Judge them by
            ear against the track — that judgement is the result. Then download the
            table so the next run can be compared with this one.
          </p>
        </Bento>
      ) : (
        <>
          <Bento tone="accent" className="space-y-4 p-5">
            <BentoLabel>This run</BentoLabel>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Stat label="Tracks" value={`${summary.tracks}${summary.failed ? ` (+${summary.failed} failed)` : ""}`} />
              <Stat
                label="guess() BPM = analyze()"
                value={summary.bpmCompared ? `${summary.bpmAgree}/${summary.bpmCompared}` : "—"}
              />
              <Stat label="Today’s pass (median)" value={ms(summary.medianFeaturesMs)} />
              <Stat label="Whole-track envelope" value={ms(summary.medianEnvelopeMs)} />
              <Stat label="analyze() (median)" value={ms(summary.medianAnalyzeMs)} />
              <Stat label="guess() (median)" value={ms(summary.medianGuessMs)} />
              <Stat
                label="Added per track"
                value={
                  summary.medianAddedShare === null
                    ? "—"
                    : `+${Math.round(summary.medianAddedShare * 100)}%`
                }
              />
            </dl>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="secondary"
                disabled={running}
                data-testid="cue-export-csv"
                onClick={() =>
                  download(`cue-spike-${stamp()}.csv`, "text/csv", toCsv(results.map((r) => r.row)))
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={running}
                data-testid="cue-export-json"
                onClick={() =>
                  download(
                    `cue-spike-${stamp()}.json`,
                    "application/json",
                    JSON.stringify(toJsonExport(analyses, new Date().toISOString()))
                  )
                }
              >
                <Download className="size-4" />
                JSON
              </Button>
            </div>
          </Bento>

          <ol className="space-y-4" data-testid="cue-results">
            {results.map(({ analysis, cues, row }, index) => (
              <li key={`${analysis.fileName}-${index}`}>
                <Bento className="space-y-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-bold break-words">
                      {analysis.fileName}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-ec-text-dim">
                      {formatMinutesSeconds(analysis.durationSeconds)}
                      {" · "}
                      {analysis.bpm !== null ? `${analysis.bpm.toFixed(1)} BPM` : "no BPM"}
                      {analysis.cue?.guess
                        ? ` · guess ${analysis.cue.guess.bpm} BPM, beat 1 at ${analysis.cue.guess.offset.toFixed(3)} s`
                        : " · guess: no grid"}
                    </p>
                  </div>

                  {analysis.error ? (
                    <p className="text-sm text-ec-error">{analysis.error}</p>
                  ) : analysis.cue ? (
                    <>
                      <EnvelopeChart
                        id={`env-${index}`}
                        full={analysis.cue.envelope.full}
                        low={analysis.cue.envelope.low}
                        durationSeconds={analysis.durationSeconds}
                        cues={cues}
                      />
                      <dl className="grid grid-cols-3 gap-2">
                        {(["entry", "drop", "exit"] as CueKind[]).map((kind) => (
                          <CueTime key={kind} kind={kind} seconds={cues?.[kind]?.seconds ?? null} />
                        ))}
                      </dl>
                      <p className="font-mono text-[11px] leading-5 text-ec-text-dim">
                        today {ms(row.featuresMs)} · envelope {ms(row.envelopeMs)} · analyze{" "}
                        {ms(row.analyzeMs)} · guess {ms(row.guessMs)}
                      </p>
                      {row.notes ? (
                        <p className="text-xs leading-5 text-ec-text-muted">{row.notes}</p>
                      ) : null}
                    </>
                  ) : null}
                </Bento>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ec-text-muted">{label}</dt>
      <dd className="font-mono text-lg font-bold text-ec-text">{value}</dd>
    </div>
  )
}

function CueTime({ kind, seconds }: { kind: CueKind; seconds: number | null }) {
  const style = CUE_STYLE[kind]
  return (
    <div className="min-w-0 rounded-lg bg-ec-sunken px-2.5 py-2">
      <dt
        className="font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: style.color }}
      >
        {style.label}
      </dt>
      <dd className="font-mono text-xl font-bold text-ec-text">
        {formatMinutesSeconds(seconds)}
      </dd>
      <dd className="font-mono text-[11px] text-ec-text-dim">
        {seconds === null ? "not found" : `${seconds.toFixed(3)} s`}
      </dd>
    </div>
  )
}
