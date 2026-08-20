"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, MessageSquare } from "lucide-react"

import {
  addSuggestionAction,
  resolveSuggestionAction,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { Suggestion } from "@/services/collaboration-service"

const COPY = DASHBOARD_COPY.collaboration

/**
 * The conversation on a shared set, on both sides of it.
 *
 * One component for owner and collaborator because it is one thread: the only
 * difference is that the owner can mark a suggestion handled, which is a single
 * `canResolve` branch rather than a reason to maintain two views that drift.
 *
 * Oldest first, unlike version history. A conversation reads forwards.
 */
export function SuggestionThread({
  playlistId,
  suggestions,
  trackPositions,
  canResolve,
  locale,
}: {
  playlistId: string
  suggestions: Suggestion[]
  /** trackId → 1-based position, so a comment can name the row it's about. */
  trackPositions: Record<string, number>
  canResolve: boolean
  locale: SiteLocale
}) {
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const send = () => {
    setError(null)

    startTransition(async () => {
      const result = await addSuggestionAction(playlistId, body, null)

      if (result.ok) {
        setBody("")
      } else {
        setError(result.message ?? null)
      }
    })
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-ec-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ec-text">
        <MessageSquare className="size-4 text-ec-cyan" />
        {COPY.suggestionsLabel[locale]}
      </h2>

      {suggestions.length === 0 ? (
        <p className="mt-3 text-[13px] text-ec-text-dim">
          {COPY.noSuggestions[locale]}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className={`rounded-xl border px-3.5 py-2.5 ${
                suggestion.resolvedAt
                  ? "border-white/8 bg-white/[0.02] opacity-60"
                  : "border-white/12 bg-ec-raised"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/40">
                <span className="truncate">{suggestion.authorEmail}</span>
                {suggestion.trackId && trackPositions[suggestion.trackId] ? (
                  <span>
                    ·{" "}
                    {formatTemplate(COPY.aboutTrack[locale], {
                      position: trackPositions[suggestion.trackId],
                    })}
                  </span>
                ) : null}
                {suggestion.resolvedAt ? (
                  <span className="text-ec-cyan">· {COPY.resolved[locale]}</span>
                ) : null}
              </div>

              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/82">
                {suggestion.body}
              </p>

              {canResolve && !suggestion.resolvedAt ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await resolveSuggestionAction(playlistId, suggestion.id)
                    })
                  }
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-ec-cyan transition hover:underline disabled:opacity-40"
                >
                  <Check className="size-3" />
                  {COPY.resolve[locale]}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          placeholder={COPY.suggestionPlaceholder[locale]}
          aria-label={COPY.suggestionsLabel[locale]}
          className="w-full resize-y rounded-lg border border-white/12 bg-ec-raised px-3 py-2 text-sm leading-6 text-white placeholder:text-white/30 focus:border-ec-cyan focus:outline-none"
        />
        <div className="flex items-center justify-end">
          <Button type="submit" size="sm" disabled={pending || body.trim() === ""}>
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {COPY.sending[locale]}
              </>
            ) : (
              COPY.send[locale]
            )}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="mt-1 text-[13px] text-ec-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
