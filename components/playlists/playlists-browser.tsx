"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"

import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { GENRE_LABELS, type PlaylistContext } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"
import type { PlaylistWithTrackCount } from "@/types/domain"

const COPY = DASHBOARD_COPY.playlists

const VIEW_STORAGE_KEY = "energycurve.playlists.view"

type ViewMode = "recent" | "genre"

/** Case- and accent-insensitive normalization for the name search. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function genreLabelOf(playlist: PlaylistWithTrackCount): string {
  return (
    playlist.custom_genre_name ??
    (playlist.genre ? (GENRE_LABELS[playlist.genre] ?? playlist.genre) : "—")
  )
}

/**
 * The "Your sets" list with a name search and a Recent | By genre view toggle
 * (V3 feedback — first step of playlist organization; folders may come later).
 * View choice persists per browser, like the tracklist column prefs.
 */
export function PlaylistsBrowser({
  playlists,
  locale,
}: {
  playlists: PlaylistWithTrackCount[]
  locale: SiteLocale
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<ViewMode>("recent")

  // Restore the persisted view after mount (localStorage isn't available at
  // SSR; defaulting to "recent" avoids a hydration mismatch).
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(stored === "genre" ? "genre" : "recent")
  }, [])

  function pickView(next: ViewMode) {
    setView(next)
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())

    if (!needle) {
      return playlists
    }

    return playlists.filter((playlist) =>
      normalize(playlist.name).includes(needle)
    )
  }, [playlists, query])

  const groups = useMemo(() => {
    if (view !== "genre") {
      return null
    }

    const byGenre = new Map<string, PlaylistWithTrackCount[]>()

    for (const playlist of filtered) {
      const label = genreLabelOf(playlist)
      const bucket = byGenre.get(label)

      if (bucket) {
        bucket.push(playlist)
      } else {
        byGenre.set(label, [playlist])
      }
    }

    return Array.from(byGenre.entries()).sort(([a], [b]) =>
      a.localeCompare(b, locale)
    )
  }, [filtered, view, locale])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
          {COPY.yourSets[locale]}
        </h2>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/38" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={COPY.searchPlaceholder[locale]}
              aria-label={COPY.searchPlaceholder[locale]}
              className="h-9 w-52 border-white/12 pl-9 text-sm text-white placeholder:text-white/32"
            />
          </div>

          <div
            role="group"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
          >
            {(
              [
                { value: "recent", label: COPY.viewRecent[locale] },
                { value: "genre", label: COPY.viewByGenre[locale] },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                onClick={() => pickView(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  view === option.value
                    ? "bg-white/12 text-white"
                    : "text-white/48 hover:text-white"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/48">
          {formatTemplate(COPY.noMatches[locale], { query: query.trim() })}
        </p>
      ) : groups ? (
        <div className="space-y-5">
          {groups.map(([label, entries]) => (
            <div key={label} className="space-y-2.5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
                {label}{" "}
                <span className="text-white/24">· {entries.length}</span>
              </p>
              {entries.map((playlist) => (
                <PlaylistRow key={playlist.id} playlist={playlist} locale={locale} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        filtered.map((playlist) => (
          <PlaylistRow key={playlist.id} playlist={playlist} locale={locale} />
        ))
      )}
    </section>
  )
}

function PlaylistRow({
  playlist,
  locale,
}: {
  playlist: PlaylistWithTrackCount
  locale: SiteLocale
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-[#0C0917] p-4 transition-colors hover:border-white/18">
      <Link
        href={`/dashboard/playlists/${playlist.id}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-4"
      >
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-base font-medium text-white">
            {playlist.name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {playlist.genre ? (
              <Badge variant="accent">{genreLabelOf(playlist)}</Badge>
            ) : null}
            {playlist.context ? (
              <Badge>
                {playlist.custom_context_name ??
                  CONTEXT_COPY[playlist.context as PlaylistContext]?.[locale] ??
                  playlist.context}
              </Badge>
            ) : null}
            <span className="text-xs text-white/48">
              {formatTemplate(COPY.trackCount[locale], {
                count: playlist.trackCount,
              })}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-white/32" />
      </Link>
      <DeletePlaylistButton
        playlistId={playlist.id}
        playlistName={playlist.name}
        locale={locale}
      />
    </div>
  )
}
