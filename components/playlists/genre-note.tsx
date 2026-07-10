"use client"

import { useState } from "react"
import { Activity, ChevronDown } from "lucide-react"

import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { genreTip } from "@/lib/engine/genre-tips"
import {
  GENRE_LABELS,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"

interface GenreNoteProps {
  genre: SupportedGenre | null
  context: PlaylistContext | null
  tracks: { bpm: number | null }[]
  locale: SiteLocale
}

export function GenreNote({ genre, context, tracks, locale }: GenreNoteProps) {
  const [open, setOpen] = useState(false)

  if (!genre) {
    return null
  }

  const contextLabel = context ? CONTEXT_COPY[context][locale] : null

  return (
    <div className="overflow-hidden rounded-[14px] border border-ec-border bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-ec-cyan">
          <Activity className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10.5px] uppercase tracking-[0.16em] text-ec-text-dim">
            {DASHBOARD_COPY.genreNote.detected[locale]}
          </span>
          <span className="block text-sm font-bold text-ec-text">
            <span className="text-ec-cyan">{GENRE_LABELS[genre] ?? genre}</span>
            {contextLabel ? ` · ${contextLabel}` : ""}
          </span>
        </span>
        <ChevronDown
          className={`ml-auto size-4 text-ec-text-dim transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <p className="px-4 pb-3 pl-[54px] text-[12.5px] leading-relaxed text-white/62">
          {genreTip(genre, context, tracks, locale)}
        </p>
      ) : null}
    </div>
  )
}
