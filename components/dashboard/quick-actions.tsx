import Link from "next/link"
import { ArrowRight, ClipboardPaste, ListPlus, Sparkles } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Tone = "accent" | "default"

interface ActionTileProps {
  eyebrow: string
  title: string
  body: string
  icon: ReactNode
  href?: string
  tone?: Tone
  locked?: boolean
}

/**
 * Reusable dashboard action card (pattern adapted from StageLink's
 * ActionTile). Renders as a link when `href` is set; a `locked` tile is a
 * non-interactive teaser for a not-yet-shipped feature.
 */
function ActionTile({
  eyebrow,
  title,
  body,
  icon,
  href,
  tone = "default",
  locked = false,
}: ActionTileProps) {
  const base = cn(
    "group relative flex h-full flex-col gap-3 rounded-[22px] border p-5 transition-all duration-200",
    tone === "accent"
      ? "border-[#A24DE0]/30 bg-[linear-gradient(160deg,rgba(162,77,224,0.16),rgba(12,9,23,0.6))]"
      : "border-white/10 bg-black/18",
    locked ? "opacity-70" : href ? "hover:-translate-y-0.5 hover:border-white/20" : ""
  )

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/72">
          {icon}
        </span>
        <span className="text-[0.68rem] uppercase tracking-[0.18em] text-white/38">
          {locked ? "🔒 Soon" : eyebrow}
        </span>
      </div>
      <div>
        <p className="flex items-center gap-1.5 font-heading text-base font-semibold text-white">
          {title}
          {href && !locked ? (
            <ArrowRight className="size-3.5 text-white/40 transition-transform group-hover:translate-x-0.5" />
          ) : null}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-white/52">{body}</p>
      </div>
    </>
  )

  if (href && !locked) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    )
  }

  return <div className={base}>{inner}</div>
}

/**
 * Quick-action strip shown to returning users (those who already have
 * playlists). New users get the step-by-step getting-started block instead.
 */
export function QuickActions() {
  return (
    <section>
      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/42">
        Quick actions
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <ActionTile
          tone="accent"
          eyebrow="Create"
          title="New playlist"
          body="Name a set, pick genre and context, and start shaping the curve."
          icon={<ListPlus className="size-4" />}
          href="/dashboard/playlists"
        />
        <ActionTile
          eyebrow="Import"
          title="Paste a tracklist"
          body="Drop a list from Rekordbox or Serato — BPMs are read automatically."
          icon={<ClipboardPaste className="size-4" />}
          href="/dashboard/playlists"
        />
        <ActionTile
          locked
          eyebrow="Soon"
          title="AI set insights"
          body="Coming soon — AI-written feedback on your set's story and flow."
          icon={<Sparkles className="size-4" />}
        />
      </div>
    </section>
  )
}
