"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen, Music4, TriangleAlert } from "lucide-react"

import { importAudioFilesAction } from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TaxonomySelect,
  type TaxonomyCustomOption,
} from "@/components/playlists/taxonomy-select"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { ImportedTrack } from "@/lib/playlists/imported-track"
import {
  AUDIO_IMPORT_MAX_FILES,
  audioTagsToImportedTrack,
  isAudioFileName,
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
  track: ImportedTrack
  /** Tag parse failed — artist/title derived from the filename. */
  fromFilename: boolean
  included: boolean
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
}: {
  locale: SiteLocale
  customContexts: UserContext[]
  customGenres: UserGenre[]
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupportsFolder("webkitdirectory" in probe)
  }, [])

  async function handleFiles(fileList: FileList | File[]) {
    const all = Array.from(fileList)
    const audio = all.filter((file) => isAudioFileName(file.name))

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
        audio.length < all.length
          ? { kept: audio.length, total: all.length }
          : null,
      truncated: kept.length < unique.length,
      unreadable: 0,
    })
    setPhase("reading")
    setProgress({ done: 0, total: kept.length })

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
        track: audioTagsToImportedTrack(file.name, relativePath, tags),
        fromFilename: tags === null,
        included: true,
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
