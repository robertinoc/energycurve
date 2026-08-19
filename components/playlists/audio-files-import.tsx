"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AudioLines, FolderOpen, Music4, TriangleAlert } from "lucide-react"

import { importAudioFilesAction } from "@/app/dashboard/playlists/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TaxonomySelect,
  type TaxonomyCustomOption,
} from "@/components/playlists/taxonomy-select"
import { toTrackAudioFeatures } from "@/lib/audio/track-features"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { ImportedTrack } from "@/lib/playlists/imported-track"
import {
  AUDIO_IMPORT_MAX_FILES,
  audioTagsToImportedTrack,
  isAudioFileName,
  isSystemJunkFile,
  type AudioTagSource,
} from "@/lib/playlists/parse-audio-tags"
import {
  GENRE_LABELS,
  SET_CONTEXTS,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"
import { cn } from "@/lib/utils"
import type { UserContext, UserGenre } from "@/types/domain"

const COPY = DASHBOARD_COPY.audioImport
const SHARED = DASHBOARD_COPY.importUpload

// music-metadata is heavy and browser-only — load it lazily on first use so it
// never enters the page bundle (Turbopack splits the dynamic import).
let musicMetadataPromise: Promise<typeof import("music-metadata")> | null = null

function loadMusicMetadata() {
  musicMetadataPromise ??= import("music-metadata")
  return musicMetadataPromise
}

interface ParsedRow {
  id: string
  fileName: string
  /**
   * The handle itself, kept so the audio can be analysed after the tags are
   * read. Holding a File costs nothing — it's a reference to bytes on disk, not
   * the bytes — and the audio still never leaves the machine.
   */
  file: File
  track: ImportedTrack
  /** Tag parse failed — artist/title derived from the filename. */
  fromFilename: boolean
  included: boolean
  /** BPM this row got from analysing the audio rather than from a tag. */
  analyzedBpm: number | null
}

interface SelectionNotes {
  filtered: { kept: number; total: number } | null
  truncated: boolean
  unreadable: number
}

type Phase = "idle" | "reading" | "preview" | "submitting"

export function AudioFilesImport({
  locale,
  customContexts,
  customGenres,
  canAnalyzeAudio,
}: {
  locale: SiteLocale
  customContexts: UserContext[]
  customGenres: UserGenre[]
  /** PRO gate for reading BPM out of the audio itself. */
  canAnalyzeAudio: boolean
}) {
  const router = useRouter()
  const filesInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>("idle")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [notes, setNotes] = useState<SelectionNotes>({
    filtered: null,
    truncated: false,
    unreadable: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [name, setName] = useState("")
  const [context, setContext] = useState("main")
  const [genre, setGenre] = useState("")

  // Folder picking (webkitdirectory) isn't supported everywhere (iOS Safari).
  // Detected after mount to avoid an SSR/hydration mismatch.
  const [supportsFolder, setSupportsFolder] = useState(false)

  useEffect(() => {
    const probe = document.createElement("input")
    setSupportsFolder("webkitdirectory" in probe)
  }, [])

  const [analysis, setAnalysis] = useState<{
    running: boolean
    done: number
    total: number
    failed: number
  } | null>(null)
  // Read inside the loop rather than through state: a cancel has to be seen by
  // an iteration already in flight, and a state update wouldn't be visible to it.
  const cancelAnalysis = useRef(false)

  /**
   * Reads the real BPM out of the audio, for the tracks whose tags don't carry
   * one.
   *
   * Only those: a file that already declares its tempo has nothing to gain from
   * two seconds of DSP, and skipping them is what keeps a rekordbox-tagged
   * folder instant. This is the whole point of the feature — wav/flac/aiff with
   * no tags were previously energy-estimated from their position in the set.
   */
  async function analyzeMissingBpm() {
    const targets = rows.filter(
      (row) => row.included && row.track.bpm === null
    )

    if (targets.length === 0 || analysis?.running) {
      return
    }

    cancelAnalysis.current = false
    setAnalysis({ running: true, done: 0, total: targets.length, failed: 0 })

    const { analyzeAudioFile, disposeAudioWorker } = await import(
      "@/lib/audio/analyze-track"
    )

    let failed = 0

    for (const [index, row] of targets.entries()) {
      if (cancelAnalysis.current) {
        break
      }

      const result = await analyzeAudioFile(row.file)

      // The spectral features are kept whether or not beat detection worked.
      // They are independent measurements — a beatless ambient intro still has a
      // loudness, a flux and an entropy — and they are what Energy Model v3 is
      // specified against. Before this they were computed and discarded.
      const audioFeatures = result.features
        ? toTrackAudioFeatures(result.features)
        : null

      if (result.bpm === null) {
        // Beat detection legitimately fails on ambient and beatless material.
        // The row keeps whatever BPM it had; it isn't an error worth a red banner.
        failed += 1

        if (audioFeatures) {
          setRows((current) =>
            current.map((entry) =>
              entry.id === row.id
                ? { ...entry, track: { ...entry.track, audioFeatures } }
                : entry
            )
          )
        }
      } else {
        const detected = Math.round(result.bpm)

        setRows((current) =>
          current.map((entry) =>
            entry.id === row.id
              ? {
                  ...entry,
                  analyzedBpm: detected,
                  track: { ...entry.track, bpm: detected, audioFeatures },
                }
              : entry
          )
        )
      }

      setAnalysis({
        running: true,
        done: index + 1,
        total: targets.length,
        failed,
      })
    }

    // One worker is reused across the batch; nothing else needs it afterwards.
    disposeAudioWorker()
    setAnalysis((current) =>
      current ? { ...current, running: false } : current
    )
  }

  async function handleFiles(fileList: FileList | File[]) {
    const all = Array.from(fileList)
    // Dropped before counting: see isSystemJunkFile. A folder of tracks on a Mac
    // also contains .DS_Store, and saying "1 file ignored" about it reads as though
    // something the DJ chose was mishandled.
    const picked = all.filter((file) => !isSystemJunkFile(file.name))
    const audio = picked.filter((file) => isAudioFileName(file.name))

    if (audio.length === 0) {
      setError(COPY.zeroReadable[locale])
      return
    }

    // Dedupe (same file via overlapping folder + file picks), then cap.
    const seen = new Set<string>()
    const unique = audio.filter((file) => {
      const key = `${file.webkitRelativePath || file.name}::${file.size}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    const kept = unique.slice(0, AUDIO_IMPORT_MAX_FILES)

    setError(null)
    setNotes({
      filtered:
        audio.length < picked.length
          ? { kept: audio.length, total: picked.length }
          : null,
      truncated: kept.length < unique.length,
      unreadable: 0,
    })
    setPhase("reading")
    setProgress({ done: 0, total: kept.length })
    // Same reason as resetSelection: these are different files now.
    setAnalysis(null)
    cancelAnalysis.current = true

    const { parseBlob } = await loadMusicMetadata()

    const parsed: ParsedRow[] = []
    let unreadable = 0

    for (const [index, file] of kept.entries()) {
      let tags: AudioTagSource | null = null

      try {
        // skipCovers: embedded artwork is never needed; duration comes from
        // the headers for most formats (lazy blob reads, no full buffering).
        tags = (await parseBlob(file, {
          duration: true,
          skipCovers: true,
        })) as unknown as AudioTagSource
      } catch {
        unreadable += 1
      }

      const relativePath = file.webkitRelativePath || null

      parsed.push({
        id: `${index}-${file.name}`,
        fileName: file.name,
        file,
        track: audioTagsToImportedTrack(file.name, relativePath, tags),
        fromFilename: tags === null,
        included: true,
        analyzedBpm: null,
      })
      setProgress({ done: index + 1, total: kept.length })
    }

    // Default set name: the picked folder's name when available.
    const firstRelative = kept.find((file) => file.webkitRelativePath)
    const folderName = firstRelative?.webkitRelativePath.split("/")[0] ?? ""

    setName((current) => current || folderName)
    setNotes((current) => ({ ...current, unreadable }))
    setRows(parsed)
    setPhase("preview")
  }

  function resetSelection() {
    setRows([])
    // Otherwise a fresh folder inherits the previous batch's "12 of 12 analysed".
    setAnalysis(null)
    cancelAnalysis.current = true
    setNotes({ filtered: null, truncated: false, unreadable: 0 })
    setError(null)
    setPhase("idle")
    if (filesInputRef.current) filesInputRef.current.value = ""
    if (folderInputRef.current) folderInputRef.current.value = ""
  }

  async function handleSubmit() {
    const included = rows.filter((row) => row.included)

    if (included.length === 0 || phase === "submitting") {
      return
    }

    setPhase("submitting")
    setError(null)

    const result = await importAudioFilesAction({
      name,
      context,
      genre,
      tracks: included.map((row) => row.track),
    })

    if (result.ok && result.playlistId) {
      router.push(`/dashboard/playlists/${result.playlistId}`)
      return
    }

    setError(result.message ?? null)
    setPhase("preview")
  }

  const includedRows = rows.filter((row) => row.included)
  const missingBpm = includedRows.filter((row) => row.track.bpm === null).length
  const missingKey = includedRows.filter((row) => row.track.key === null).length

  const contextCustoms: TaxonomyCustomOption[] = customContexts.map((entry) => ({
    id: entry.id,
    name: entry.name,
    behavesLikeLabel: CONTEXT_COPY[entry.behaves_like][locale],
  }))
  const genreCustoms: TaxonomyCustomOption[] = customGenres.map((entry) => ({
    id: entry.id,
    name: entry.name,
    behavesLikeLabel: GENRE_LABELS[entry.behaves_like],
  }))

  return (
    <div className="space-y-4">
      {phase === "idle" || phase === "reading" ? (
        <>
          <label
            htmlFor="audio-import-files"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              if (phase === "idle" && event.dataTransfer.files.length > 0) {
                void handleFiles(event.dataTransfer.files)
              }
            }}
            className={cn(
              "block cursor-pointer rounded-[18px] border-[1.5px] border-dashed bg-[radial-gradient(80%_120%_at_50%_0%,rgba(106,92,240,0.10),transparent_70%)] px-6 py-8 text-center transition-all",
              dragging
                ? "border-[#22D3EE]/70 bg-[#22D3EE]/[0.06]"
                : "border-white/16 hover:border-white/28"
            )}
          >
            {phase === "reading" ? (
              <span className="font-mono text-sm text-ec-cyan">
                {formatTemplate(COPY.readingProgress[locale], progress)}
              </span>
            ) : (
              <>
                <Music4 className="mx-auto size-5 text-white/48" />
                <span className="mt-3 block text-sm text-white/72">
                  {COPY.dropzoneMain[locale]}{" "}
                  <span className="font-semibold text-[#CDA2F1] underline decoration-[#A24DE0]/50 underline-offset-4">
                    {COPY.browse[locale]}
                  </span>
                </span>
                <span className="mt-1.5 block text-xs text-white/44">
                  {COPY.dropzoneHint[locale]}
                </span>
              </>
            )}
          </label>
          <input
            ref={filesInputRef}
            id="audio-import-files"
            type="file"
            multiple
            accept="audio/*,.mp3,.m4a,.aac,.flac,.wav,.aiff,.aif,.ogg,.opus"
            className="sr-only"
            disabled={phase === "reading"}
            onChange={(event) => {
              if (event.target.files && event.target.files.length > 0) {
                void handleFiles(event.target.files)
              }
            }}
          />

          {supportsFolder ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={phase === "reading"}
                onClick={() => folderInputRef.current?.click()}
                className="border-white/12 bg-white/[0.03] text-white/78 hover:border-white/20 hover:bg-white/[0.06]"
              >
                <FolderOpen className="size-3.5" />
                {COPY.chooseFolder[locale]}
              </Button>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error — non-standard but widely supported attribute
                webkitdirectory=""
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files && event.target.files.length > 0) {
                    void handleFiles(event.target.files)
                  }
                }}
              />
            </>
          ) : null}
        </>
      ) : null}

      {phase === "preview" || phase === "submitting" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/48">
            {notes.filtered ? (
              <span>
                {formatTemplate(COPY.filteredNote[locale], notes.filtered)}
              </span>
            ) : null}
            {notes.truncated ? (
              <span>
                {formatTemplate(COPY.truncatedNote[locale], {
                  max: AUDIO_IMPORT_MAX_FILES,
                })}
              </span>
            ) : null}
            {notes.unreadable > 0 ? (
              <span className="text-ec-amber/90">
                {formatTemplate(COPY.unreadableNote[locale], {
                  count: notes.unreadable,
                })}
              </span>
            ) : null}
            <button
              type="button"
              onClick={resetSelection}
              className="ml-auto text-white/56 underline decoration-white/24 underline-offset-4 hover:text-white"
            >
              {COPY.clearSelection[locale]}
            </button>
          </div>

          {missingBpm > 0 || missingKey > 0 ? (
            <p className="flex items-start gap-2 rounded-xl border border-ec-amber/25 bg-ec-amber/[0.06] px-3.5 py-2.5 text-xs leading-5 text-ec-amber/90">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {formatTemplate(COPY.missingTagsNote[locale], {
                noBpm: missingBpm,
                noKey: missingKey,
                total: includedRows.length,
              })}
            </p>
          ) : null}

          {missingBpm > 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                <AudioLines className="size-4 text-white/40" />
                {COPY.analyzeTitle[locale]}
                {canAnalyzeAudio ? null : (
                  <span className="rounded border border-white/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    pro
                  </span>
                )}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-white/48">
                {canAnalyzeAudio
                  ? formatTemplate(COPY.analyzeBody[locale], {
                      count: missingBpm,
                    })
                  : COPY.analyzeLockedBody[locale]}
              </p>

              {!canAnalyzeAudio ? (
                <Link
                  href="/pricing"
                  className={cn(buttonVariants({ size: "sm" }), "mt-3 w-fit")}
                >
                  {COPY.analyzeLockedCta[locale]}
                </Link>
              ) : analysis?.running ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs tabular-nums text-white/62">
                    {formatTemplate(COPY.analyzeProgress[locale], {
                      done: analysis.done,
                      total: analysis.total,
                    })}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full bg-ec-cyan transition-[width]"
                      style={{
                        width: `${(analysis.done / analysis.total) * 100}%`,
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      cancelAnalysis.current = true
                    }}
                  >
                    {COPY.analyzeCancel[locale]}
                  </Button>
                </div>
              ) : analysis ? (
                <p className="mt-2 text-xs leading-5 text-white/56">
                  {formatTemplate(COPY.analyzeDone[locale], {
                    ok: analysis.done - analysis.failed,
                    total: analysis.total,
                  })}
                  {analysis.failed > 0
                    ? ` ${formatTemplate(COPY.analyzeFailed[locale], {
                        count: analysis.failed,
                      })}`
                    : ""}
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={analyzeMissingBpm}
                  className="mt-3 w-fit"
                >
                  {formatTemplate(COPY.analyzeCta[locale], {
                    count: missingBpm,
                  })}
                </Button>
              )}
            </div>
          ) : null}

          <div className="max-h-80 overflow-y-auto rounded-[16px] border border-ec-border bg-black/18">
            <ul className="divide-y divide-white/[0.05]">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2 text-sm",
                    !row.included && "opacity-40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={row.included}
                    aria-label={formatTemplate(COPY.excludeAria[locale], {
                      name: row.track.name,
                    })}
                    onChange={() =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.id === row.id
                            ? { ...entry, included: !entry.included }
                            : entry
                        )
                      )
                    }
                    className="size-3.5 shrink-0 accent-[#A24DE0]"
                  />
                  <span className="w-5 shrink-0 font-mono text-xs text-white/38">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-white/82">
                    {row.track.artist ? (
                      <>
                        {row.track.artist}
                        <span className="text-white/38"> — </span>
                      </>
                    ) : null}
                    {row.track.name}
                    {row.fromFilename ? (
                      <span className="ml-2 rounded-md border border-ec-amber/30 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em] text-ec-amber/80">
                        {COPY.fromFilename[locale]}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-white/52">
                    <MetaBadge value={row.track.bpm?.toString() ?? null} />
                    <MetaBadge value={row.track.key} />
                    <MetaBadge
                      value={
                        row.track.energy !== null
                          ? `E${row.track.energy}`
                          : null
                      }
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="audio-import-name" className="text-white/72">
                {COPY.nameLabel[locale]}
              </Label>
              <Input
                id="audio-import-name"
                value={name}
                maxLength={120}
                placeholder={COPY.namePlaceholder[locale]}
                onChange={(event) => setName(event.target.value)}
                className="border-white/12 text-white placeholder:text-white/32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio-import-context" className="text-white/72">
                {SHARED.setContext[locale]}
              </Label>
              <TaxonomySelect
                id="audio-import-context"
                name="audio-context"
                kind="context"
                locale={locale}
                defaultValue="main"
                baseOptions={SET_CONTEXTS.map((value) => ({
                  value,
                  label: CONTEXT_COPY[value][locale],
                }))}
                customs={contextCustoms}
                onValueChange={setContext}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio-import-genre" className="text-white/72">
                {SHARED.genre[locale]}
              </Label>
              <TaxonomySelect
                id="audio-import-genre"
                name="audio-genre"
                kind="genre"
                locale={locale}
                defaultValue=""
                leadingOption={{
                  value: "",
                  label: SHARED.autoDetect[locale],
                  badge: SHARED.recommended[locale],
                }}
                baseOptions={SUPPORTED_GENRES.map((value) => ({
                  value,
                  label: GENRE_LABELS[value],
                }))}
                customs={genreCustoms}
                onValueChange={setGenre}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={phase === "submitting" || includedRows.length === 0}
              onClick={() => void handleSubmit()}
            >
              {phase === "submitting"
                ? COPY.creating[locale]
                : formatTemplate(COPY.createCta[locale], {
                    count: includedRows.length,
                  })}
            </Button>
            <span className="text-xs text-white/44">
              {SHARED.ctaHint[locale]}
            </span>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-ec-error">{error}</p> : null}
    </div>
  )
}

/** Compact mono badge for BPM / key / energy; dim dash when the tag is absent. */
function MetaBadge({ value }: { value: string | null }) {
  return (
    <span
      className={cn(
        "inline-block min-w-[38px] rounded-md border px-1.5 py-px text-center",
        value
          ? "border-white/14 bg-white/[0.03] text-white/78"
          : "border-white/[0.07] text-white/24"
      )}
    >
      {value ?? "—"}
    </span>
  )
}
