"use client"

import { useRef, useState } from "react"
import { AudioLines, Check, Loader2, TriangleAlert } from "lucide-react"

import { applyMeasuredAudioAction } from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { analyzeAudioFile } from "@/lib/audio/analyze-track"
import { toTrackAudioFeatures } from "@/lib/audio/track-features"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  matchAudioToTracks,
  type MatchResult,
  type MatchTarget,
} from "@/lib/playlists/audio-match"
import {
  AUDIO_IMPORT_MAX_FILES,
  audioTagsToImportedTrack,
  isAudioFileName,
  isSystemJunkFile,
  type AudioTagSource,
} from "@/lib/playlists/parse-audio-tags"

const COPY = DASHBOARD_COPY.audioEnrich

// music-metadata is heavy and browser-only — loaded lazily so it never enters the
// page bundle, same as the import flow.
let musicMetadataPromise: Promise<typeof import("music-metadata")> | null = null

function loadMusicMetadata() {
  musicMetadataPromise ??= import("music-metadata")
  return musicMetadataPromise
}

type Phase = "idle" | "reading" | "review" | "measuring" | "done"

/** A matched pair, plus the file handle needed to measure it. */
interface Pair {
  trackId: string
  position: number
  label: string
  fileName: string
  file: File
  reason: MatchResult["matched"][number]["reason"]
  included: boolean
}

/**
 * Measures the audio of a playlist that already exists.
 *
 * Until this, audio analysis only ran while *creating* a playlist from files —
 * so a DJ who pasted a text list had no way to get real BPM or energy for it, and
 * the no-score state told them to "run the audio analysis on this playlist",
 * which was advice the product couldn't take.
 *
 * The audio still never leaves the machine. Files are read and decoded here; only
 * the resulting numbers are sent.
 *
 * The review step is the point. Matching by artist and title is right most of the
 * time and wrong occasionally, and a wrong match writes another track's BPM onto a
 * track where nothing looks broken afterwards — worse than the missing data it
 * replaced. So nothing is written until the DJ has seen the pairs.
 */
export function AudioEnrich({
  playlistId,
  tracks,
  locale,
}: {
  playlistId: string
  tracks: MatchTarget[]
  locale: SiteLocale
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [pairs, setPairs] = useState<Pair[]>([])
  const [result, setResult] = useState<MatchResult | null>(null)
  const [written, setWritten] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    setError(null)

    const kept = Array.from(files)
      .filter((file) => !isSystemJunkFile(file.name) && isAudioFileName(file.name))
      .slice(0, AUDIO_IMPORT_MAX_FILES)

    if (kept.length === 0) {
      setError(COPY.noAudioFiles[locale])
      return
    }

    setPhase("reading")
    setProgress({ done: 0, total: kept.length })

    const { parseBlob } = await loadMusicMetadata()
    const byKey = new Map<string, File>()
    const candidates = []

    for (const [index, file] of kept.entries()) {
      let tags: AudioTagSource | null = null

      try {
        tags = (await parseBlob(file, {
          duration: false,
          skipCovers: true,
        })) as unknown as AudioTagSource
      } catch {
        // Unreadable tags aren't fatal: the filename usually carries
        // "Artist - Title", which is what the matcher needs.
      }

      const parsedTrack = audioTagsToImportedTrack(
        file.name,
        file.webkitRelativePath || null,
        tags
      )
      const key = `${index}-${file.name}`

      byKey.set(key, file)
      candidates.push({
        key,
        artist: parsedTrack.artist,
        title: parsedTrack.name,
      })

      setProgress({ done: index + 1, total: kept.length })
    }

    const matchResult = matchAudioToTracks(tracks, candidates)

    setResult(matchResult)
    setPairs(
      matchResult.matched.map((match) => ({
        trackId: match.target.id,
        position: match.target.position,
        label: `${match.target.artist} — ${match.target.name}`,
        fileName: byKey.get(match.candidate.key)?.name ?? "",
        file: byKey.get(match.candidate.key)!,
        reason: match.reason,
        // Title-only matches start unchecked: they're the weaker key, and the
        // whole point of this screen is that the DJ decides on those.
        included: match.reason === "artist_and_title",
      }))
    )
    setPhase("review")
  }

  const measure = async () => {
    const chosen = pairs.filter((pair) => pair.included)

    if (chosen.length === 0) {
      return
    }

    setPhase("measuring")
    setProgress({ done: 0, total: chosen.length })
    setError(null)

    const updates = []

    for (const [index, pair] of chosen.entries()) {
      try {
        const measured = await analyzeAudioFile(pair.file)

        updates.push({
          trackId: pair.trackId,
          bpm: measured.bpm,
          musicalKey: measured.detectedKey,
          // Null when the worker produced no feature pass; the BPM and key are
          // still worth writing on their own.
          features: measured.features
            ? toTrackAudioFeatures(measured.features)
            : null,
        })
      } catch {
        // One undecodable file doesn't abandon the rest. It simply contributes
        // nothing, and the count at the end tells the DJ how many landed.
      }

      setProgress({ done: index + 1, total: chosen.length })
    }

    if (updates.length === 0) {
      setError(COPY.nothingMeasured[locale])
      setPhase("review")
      return
    }

    const applied = await applyMeasuredAudioAction({ playlistId, updates })

    if (!applied.ok) {
      setError(applied.message ?? COPY.nothingMeasured[locale])
      setPhase("review")
      return
    }

    setWritten(applied.written ?? 0)
    setPhase("done")
  }

  const chosenCount = pairs.filter((pair) => pair.included).length

  return (
    <section className="rounded-2xl border border-white/10 bg-ec-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ec-text">
        <AudioLines className="size-4 text-ec-cyan" />
        {COPY.title[locale]}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[13px] leading-6 text-ec-text-dim">
        {COPY.intro[locale]}
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        // @ts-expect-error — non-standard, and the only way to pick a folder.
        webkitdirectory=""
        className="hidden"
        onChange={(event) => pick(event.target.files)}
      />

      {phase === "idle" || phase === "done" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            {COPY.pickFolder[locale]}
          </Button>
          {phase === "done" ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ec-cyan">
              <Check className="size-3.5" />
              {formatTemplate(COPY.doneCount[locale], { count: written })}
            </span>
          ) : null}
        </div>
      ) : null}

      {phase === "reading" || phase === "measuring" ? (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-2 text-sm text-white/80">
            <Loader2 className="size-4 animate-spin text-ec-cyan" />
            {phase === "reading"
              ? COPY.reading[locale]
              : COPY.measuring[locale]}{" "}
            <span className="font-mono tabular-nums">
              {progress.done}/{progress.total}
            </span>
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            className="h-1.5 overflow-hidden rounded-full bg-ec-raised"
          >
            <div
              className="h-full rounded-full bg-ec-cyan transition-[width]"
              style={{
                width: `${
                  progress.total === 0
                    ? 0
                    : Math.round((progress.done / progress.total) * 100)
                }%`,
              }}
            />
          </div>
          {phase === "measuring" ? (
            <p className="text-xs text-white/40">{COPY.keepTabOpen[locale]}</p>
          ) : null}
        </div>
      ) : null}

      {phase === "review" && result ? (
        <div className="mt-4 space-y-4">
          <ul className="flex flex-col gap-1.5">
            {pairs.map((pair) => (
              <li
                key={pair.trackId}
                className="flex items-start gap-2.5 rounded-lg bg-ec-raised px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={pair.included}
                  aria-label={pair.label}
                  onChange={() =>
                    setPairs((current) =>
                      current.map((row) =>
                        row.trackId === pair.trackId
                          ? { ...row, included: !row.included }
                          : row
                      )
                    )
                  }
                  className="mt-1 size-3.5 shrink-0 accent-[#22d3ee]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/85">
                    <span className="font-mono text-xs text-white/32">
                      {pair.position}
                    </span>{" "}
                    {pair.label}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {pair.fileName}
                    {pair.reason === "title_only" ? (
                      // Named rather than hidden: this is the match the DJ is
                      // here to confirm, and it starts unchecked for that reason.
                      <span className="ml-1.5 text-ec-amber">
                        · {COPY.titleOnly[locale]}
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* What didn't match, said plainly. A DJ who picked the wrong folder
              needs to see that nothing landed, not a silent no-op. */}
          {result.unmatchedTracks.length > 0 || result.ambiguous.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-ec-amber/30 bg-ec-amber/[0.06] px-3 py-2.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-ec-amber" />
              <p className="text-xs leading-5 text-white/70">
                {formatTemplate(COPY.leftOut[locale], {
                  unmatched: result.unmatchedTracks.length,
                  ambiguous: result.ambiguous.length,
                })}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={measure} disabled={chosenCount === 0}>
              {formatTemplate(COPY.measureCount[locale], { count: chosenCount })}
            </Button>
            <button
              type="button"
              onClick={() => {
                setPhase("idle")
                setPairs([])
                setResult(null)
              }}
              className="text-[13px] text-white/50 transition hover:text-white"
            >
              {COPY.cancel[locale]}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-[13px] text-ec-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
