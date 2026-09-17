"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Lock, Upload } from "lucide-react"

import { CTAButton } from "@/components/marketing/cta-button"
import { SetCurve } from "@/components/playlists/set-curve"
import { TOOL_COPY } from "@/lib/content/tools-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import { decodeUploadedText } from "@/lib/playlists/decode-upload"
import type {
  ImportedTrack,
  ImportSource,
  PlaylistChoice,
} from "@/lib/playlists/imported-track"
import {
  listPlaylists,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import { parseTracklist } from "@/lib/playlists/parse-tracklist"
import { SET_CONTEXTS, type PlaylistContext } from "@/lib/product/strategy"
import { EXAMPLE_SET, EXAMPLE_SET_NAME } from "@/lib/tools/example-set"
import {
  analyzeForTool,
  TooFewTracksError,
  tracksFromPastedLines,
  type ToolAnalysis,
} from "@/lib/tools/energy-curve"
import { stashSet } from "@/lib/tools/stash"
import { captureToolEvent } from "@/lib/tools/tool-events"
import { useTypedBeforeHydration } from "@/lib/tools/use-typed-before-hydration"

/**
 * The free energy-curve tool.
 *
 * A client component with no server counterpart, and that is the feature rather
 * than an implementation detail: the file is read with `File.arrayBuffer()`,
 * decoded, parsed and analysed in this component's own process. There is no
 * action, no route handler and no fetch anywhere in this file or anything it
 * imports, so "your playlist never leaves your browser" is a property of the
 * code rather than a promise someone has to remember to keep. `e2e/tools.spec.ts`
 * asserts it by failing the test if any request carries a track title.
 *
 * The page around it is server-rendered — see the route files. This handles the
 * interaction only.
 */

const UPLOAD_ACCEPT = ".xml,.nml,.m3u8,.m3u,.csv,.txt"

/** State the panel can be in. `pick` is the one a single-playlist file skips. */
type Stage =
  | { kind: "idle" }
  | { kind: "pick"; contents: string; choices: PlaylistChoice[] }
  | { kind: "result"; analysis: ToolAnalysis }

/**
 * An analysed set back in the shape the analyser takes.
 *
 * Re-reading under a different context, and stashing for signup, both need the
 * tracks again. The resolved energy is carried across as `energy` rather than
 * being re-derived, so switching context twice cannot drift the curve.
 */
function toImportedTracks(analysis: ToolAnalysis): ImportedTrack[] {
  return analysis.tracks.map((track) => ({
    artist: track.artist,
    name: track.name,
    bpm: track.bpm,
    key: track.camelot,
    genre: analysis.genre,
    energy: track.energy,
    sourceUri: null,
    comment: null,
    durationSeconds: null,
  }))
}

function ProblemCount({
  label,
  count,
  href,
  hrefLabel,
}: {
  label: string
  count: number
  /** An optional way through to the tool that explains this number. */
  href?: string
  hrefLabel?: string
}) {
  return (
    <div className="flex-1 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <p
        className={`font-heading text-2xl font-bold ${
          count > 0 ? "text-white" : "text-white/40"
        }`}
      >
        {count}
      </p>
      <p className="mt-0.5 text-xs leading-5 text-white/60">{label}</p>
      {href && hrefLabel && count > 0 && (
        <Link
          href={href}
          className="mt-1.5 inline-block text-xs font-semibold text-ec-cyan underline-offset-4 hover:underline"
        >
          {hrefLabel}
        </Link>
      )}
    </div>
  )
}

export function EnergyCurveTool({ locale }: { locale: SiteLocale }) {
  const copy = TOOL_COPY.ui
  const [stage, setStage] = useState<Stage>({ kind: "idle" })
  const [context, setContext] = useState<PlaylistContext>("main")
  const [paste, setPaste] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // A tracklist pasted before hydration is in the textarea and not in state,
  // which leaves "Analyze this list" disabled over text the visitor can see.
  useTypedBeforeHydration([["tool-paste", paste, setPaste]])

  function show(
    tracks: ImportedTrack[],
    source: ImportSource,
    playlistName: string | null,
    nextContext: PlaylistContext = context
  ) {
    try {
      const analysis = analyzeForTool({
        tracks,
        source,
        playlistName,
        context: nextContext,
      })

      setError(null)
      setStage({ kind: "result", analysis })
      captureToolEvent("tool_result_shown", {
        locale,
        source,
        trackCount: analysis.tracks.length,
        score: Math.round(analysis.score),
      })
    } catch (caught) {
      setStage({ kind: "idle" })
      setError(
        caught instanceof TooFewTracksError
          ? copy.errorTooFew[locale]
          : copy.errorUnsupported[locale]
      )
    }
  }

  function readContents(contents: string, playlistIndex?: number) {
    try {
      const choices = listPlaylists(contents)

      // Only ask when there is something to ask about. One playlist, or a
      // format that is one playlist by definition, goes straight through.
      if (choices.length > 1 && playlistIndex === undefined) {
        setError(null)
        setStage({ kind: "pick", contents, choices })
        return
      }

      const parsed = parseImport(contents, { playlistIndex })

      captureToolEvent("tool_file_loaded", {
        locale,
        source: parsed.source,
        trackCount: parsed.tracks.length,
      })
      show(parsed.tracks, parsed.source, parsed.playlistName)
    } catch (caught) {
      setStage({ kind: "idle" })
      // Every failure in here is the same failure to the visitor: we could not
      // read the file. UnsupportedImportError is our own; the XML guard and the
      // parsers throw plain Errors for a malformed document.
      void (caught as UnsupportedImportError)
      setError(copy.errorUnsupported[locale])
    }
  }

  async function acceptFile(file: File | undefined) {
    if (!file) {
      return
    }

    // `arrayBuffer()` on the File the browser already holds. Nothing is posted:
    // the bytes go from the disk into this tab and no further.
    readContents(decodeUploadedText(await file.arrayBuffer()))
  }

  function analyzePaste() {
    const parsed = parseTracklist(paste, "artist-track")

    if (parsed.tracks.length === 0) {
      setError(copy.errorEmptyPaste[locale])
      return
    }

    captureToolEvent("tool_file_loaded", {
      locale,
      source: "text",
      trackCount: parsed.tracks.length,
    })
    show(tracksFromPastedLines(parsed.tracks), "text", null)
  }

  function loadExample() {
    captureToolEvent("tool_example_loaded", {
      locale,
      trackCount: EXAMPLE_SET.length,
    })
    show(EXAMPLE_SET, "rekordbox", EXAMPLE_SET_NAME)
  }

  function changeContext(next: PlaylistContext) {
    setContext(next)

    // Re-read the set under the new shape rather than asking for the file
    // again: the tracks are already here.
    if (stage.kind === "result") {
      show(
        toImportedTracks(stage.analysis),
        stage.analysis.source,
        stage.analysis.playlistName,
        next
      )
    }
  }

  function goToSignup() {
    if (stage.kind === "result") {
      stashSet({
        source: stage.analysis.source,
        playlistName: stage.analysis.playlistName,
        genre: stage.analysis.genre,
        context: stage.analysis.context,
        tracks: toImportedTracks(stage.analysis),
      })
    }

    captureToolEvent("tool_signup_click", { locale })
  }

  const contextLabels: Record<PlaylistContext, string> = {
    opening: copy.contextOpening[locale],
    main: copy.contextMain[locale],
    closing: copy.contextClosing[locale],
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
                accept={UPLOAD_ACCEPT}
                className="sr-only"
                // Visually hidden and opened by the button beside it, so there
                // is no visible label to point an htmlFor at — but a screen
                // reader still lands on the input and has to be told what it
                // takes. Lighthouse counts this, and it is right to.
                aria-label={copy.dropTitle[locale]}
                onChange={(event) => void acceptFile(event.target.files?.[0])}
                data-testid="tool-file-input"
              />
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  {copy.browse[locale]}
                </button>
                <button
                  type="button"
                  onClick={loadExample}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-ec-cyan underline-offset-4 transition hover:underline"
                  data-testid="tool-example"
                >
                  {copy.tryExample[locale]}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="tool-paste"
                className="text-sm font-semibold text-white"
              >
                {copy.orPaste[locale]}
              </label>
              <textarea
                id="tool-paste"
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
                rows={4}
                placeholder={copy.pastePlaceholder[locale]}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 font-mono text-sm text-white placeholder:text-white/25 focus:border-ec-cyan focus:outline-none"
                data-testid="tool-paste"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-white/45">{copy.pasteHint[locale]}</p>
                {/*
                  Not disabled on an empty box. `analyzePaste` has always had a
                  message for nothing-to-read and disabling the button made it
                  unreachable — the visitor got a greyed-out control and no
                  reason. Saying "one track per line" when they press it is the
                  useful half of the same guard.
                */}
                <button
                  type="button"
                  onClick={analyzePaste}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                  data-testid="tool-analyze-paste"
                >
                  {copy.analyzePaste[locale]}
                </button>
              </div>
            </div>
          </>
        )}

        {stage.kind === "pick" && (
          <div>
            <h2 className="font-heading text-lg font-semibold text-white">
              {copy.pickPlaylist[locale]}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {stage.choices.map((choice) => (
                <li key={choice.index}>
                  <button
                    type="button"
                    onClick={() => readContents(stage.contents, choice.index)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left transition hover:border-white/20"
                  >
                    <span className="text-sm font-semibold text-white">
                      {choice.name ?? "—"}
                    </span>
                    <span className="text-xs text-white/50">
                      {choice.trackCount} {copy.trackCount[locale]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage.kind === "result" && (
          <div data-testid="tool-result">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  {copy.scoreLabel[locale]}
                </p>
                <p className="font-heading text-4xl font-bold text-white">
                  <span data-testid="tool-score">
                    {stage.analysis.score.toFixed(1)}
                  </span>
                  <span className="text-xl text-white/40">/10</span>
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {stage.analysis.genreDetected
                    ? `${copy.genreDetected[locale]} ${stage.analysis.genre}`
                    : copy.genreFallback[locale]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStage({ kind: "idle" })
                  setPaste("")
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                {copy.startOver[locale]}
              </button>
            </div>

            <div className="mt-5">
              <h2 className="font-heading text-base font-semibold text-white">
                {copy.curveTitle[locale]}
              </h2>
              <div className="mt-2" data-testid="tool-curve">
                <SetCurve
                  scores={stage.analysis.curve}
                  target={stage.analysis.targetCurve}
                  hoveredIndex={null}
                  estimatedIndices={stage.analysis.estimatedIndices}
                />
              </div>
              <p className="mt-1.5 text-xs leading-5 text-white/45">
                {copy.curveLegend[locale]}
              </p>
            </div>

            {/* The shape the curve is judged against is a choice, so it is a
                control rather than an assumption stated after the fact. */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-white">
                {copy.contextLabel[locale]}
              </p>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
                {SET_CONTEXTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeContext(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      stage.analysis.context === value
                        ? "bg-white/15 text-white"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {contextLabels[value]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs leading-5 text-white/45">
                {copy.contextHint[locale]}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="font-heading text-base font-semibold text-white">
                {copy.problemsTitle[locale]}
              </h2>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <ProblemCount
                  label={copy.energyJumps[locale]}
                  count={stage.analysis.problems.energyJumps}
                />
                <ProblemCount
                  label={copy.harmonicClashes[locale]}
                  count={stage.analysis.problems.harmonicClashes}
                  // The count says how many; the wheel says what to do about
                  // one. Only offered here because this is the only number on
                  // the page another tool can actually answer.
                  href={localizedPath("/tools/camelot-wheel", locale)}
                  hrefLabel={copy.seeOnWheel[locale]}
                />
                <ProblemCount
                  label={copy.misplacedPeaks[locale]}
                  count={stage.analysis.problems.misplacedPeaks}
                />
              </div>
            </div>

            {/* Said out loud rather than smoothed over: a curve made of guesses
                is a different object from a curve made of readings. */}
            {stage.analysis.coverage.verdict !== "measured" && (
              <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-xs leading-6 text-amber-100/80">
                {stage.analysis.coverage.verdict === "invented"
                  ? copy.coverageInvented[locale]
                  : copy.coverageInferred[locale]}{" "}
                <Link
                  href={localizedPath(
                    "/blog/tus-temas-no-tienen-bpm-ni-tonalidad",
                    "es"
                  )}
                  className="font-semibold underline underline-offset-4"
                >
                  {copy.coverageLink[locale]}
                </Link>
              </p>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-white/40" aria-hidden />
                <h2 className="font-heading text-base font-semibold text-white">
                  {copy.lockedTitle[locale]}
                </h2>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                {copy.lockedBody[locale]}
              </p>
              <CTAButton
                href="/signup"
                className="mt-4"
                onClick={goToSignup}
              >
                {copy.lockedCta[locale]}
              </CTAButton>
              <p className="mt-2 text-xs text-white/40">
                {copy.lockedKept[locale]}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            // Its own handle: `getByRole("alert")` matches two elements on any
            // page here, because Next ships a route announcer with the same role.
            data-testid="tool-error"
            className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/[0.07] p-4 text-sm leading-6 text-red-100/85"
          >
            {error}{" "}
            <Link
              href={localizedPath("/import-formats", locale)}
              className="font-semibold underline underline-offset-4"
            >
              {copy.formatsLink[locale]}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
