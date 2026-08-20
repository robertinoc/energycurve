"use client"

import { useState, useTransition } from "react"
import { ChevronDown, ChevronUp, Lock, Loader2, Pencil } from "lucide-react"

import {
  releaseEditTurnAction,
  reorderSharedTracksAction,
  takeEditTurnAction,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { EDIT_LOCK_MINUTES, type LockState } from "@/lib/playlists/edit-lock"

const COPY = DASHBOARD_COPY.editTurn

interface Row {
  id: string
  artist: string
  name: string
  energy: number
}

/**
 * The collaborator's tracklist, editable while they hold the turn.
 *
 * Move-up / move-down rather than drag-and-drop. Not a placeholder for dnd: the
 * owner's screen has drag because that's where a DJ shapes a whole set, and this
 * is where the other DJ says "swap 6 and 7" — two buttons express that exactly,
 * work on a phone, and are reachable from a keyboard, which drag is not.
 *
 * The order is held locally while editing so each click is instant, and pushed on
 * every change. A failed push reverts the row and says why, because the one thing
 * worse than not being able to edit is believing you did.
 */
export function SharedSetEditor({
  playlistId,
  rows,
  lock,
  ownerEmail,
  locale,
}: {
  playlistId: string
  rows: Row[]
  lock: LockState
  ownerEmail: string
  locale: SiteLocale
}) {
  const [order, setOrder] = useState(rows)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const editable = lock.kind === "held_by_viewer"

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction

    if (target < 0 || target >= order.length) {
      return
    }

    const previous = order
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    setError(null)

    startTransition(async () => {
      const result = await reorderSharedTracksAction(
        playlistId,
        next.map((row) => row.id)
      )

      if (!result.ok) {
        // Reverted rather than left optimistic: a move that didn't persist and
        // looks like it did is how two DJs end up with different sets.
        setOrder(previous)
        setError(result.message ?? null)
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          editable
            ? "border-ec-cyan/35 bg-ec-cyan/[0.06]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        {editable ? (
          <Pencil className="size-4 shrink-0 text-ec-cyan" />
        ) : (
          <Lock className="size-4 shrink-0 text-white/40" />
        )}

        <p className="min-w-0 flex-1 text-[13px] leading-5 text-white/78">
          {lock.kind === "held_by_viewer"
            ? formatTemplate(COPY.youHaveIt[locale], {
                minutes: EDIT_LOCK_MINUTES,
              })
            : lock.kind === "held_by_other"
              ? formatTemplate(COPY.theyHaveIt[locale], { owner: ownerEmail })
              : lock.kind === "expired"
                ? COPY.expired[locale]
                : COPY.free[locale]}
        </p>

        {editable ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await releaseEditTurnAction(playlistId)
              })
            }
          >
            {COPY.handBack[locale]}
          </Button>
        ) : lock.kind === "held_by_other" ? null : (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await takeEditTurnAction(playlistId)

                if (!result.ok) {
                  setError(result.message ?? null)
                }
              })
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {COPY.taking[locale]}
              </>
            ) : (
              COPY.take[locale]
            )}
          </Button>
        )}
      </div>

      <ol className="flex flex-col gap-1">
        {order.map((row, index) => (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-lg bg-ec-surface px-3 py-2"
          >
            <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-white/32">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/82">
              <span className="text-white/50">{row.artist}</span> — {row.name}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/40">
              {row.energy.toFixed(1)}
            </span>

            {editable ? (
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label={formatTemplate(COPY.moveUp[locale], {
                    track: row.name,
                  })}
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-1 text-white/45 transition hover:bg-white/10 hover:text-white disabled:opacity-25"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={formatTemplate(COPY.moveDown[locale], {
                    track: row.name,
                  })}
                  disabled={pending || index === order.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-1 text-white/45 transition hover:bg-white/10 hover:text-white disabled:opacity-25"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="text-[13px] text-ec-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
