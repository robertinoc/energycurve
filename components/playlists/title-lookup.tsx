"use client"

import { useState, useTransition } from "react"
import { Loader2, Search } from "lucide-react"

import { lookupTitlesAction } from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.titleLookup

/**
 * Fills in BPM and key for the tracks whose files the DJ doesn't have.
 *
 * The disclosure is in the intro, above the button, not in a tooltip or a link:
 * this is the one feature in the app that sends the user's data to a third party,
 * and the sentence that says so has to be the one they read before clicking. The
 * recipient is named.
 *
 * The GetSongBPM credit is a real link and it stays. Their terms suspend accounts
 * whose backlink disappears — but it would also be the right thing with no terms
 * attached, since the data is theirs.
 */
export function TitleLookup({
  playlistId,
  missingCount,
  locale,
}: {
  playlistId: string
  missingCount: number
  locale: SiteLocale
}) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<{ written: number; asked: number } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="rounded-2xl border border-white/10 bg-ec-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ec-text">
        <Search className="size-4 text-ec-cyan" />
        {COPY.title[locale]}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[13px] leading-6 text-ec-text-dim">
        {COPY.intro[locale]}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={pending || missingCount === 0}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              const result = await lookupTitlesAction(playlistId)

              if (result.ok) {
                setDone({ written: result.written ?? 0, asked: result.asked ?? 0 })
              } else {
                setError(result.message ?? null)
              }
            })
          }
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {COPY.looking[locale]}
            </>
          ) : (
            formatTemplate(COPY.lookUp[locale], { count: missingCount })
          )}
        </Button>

        {done ? (
          <span className="max-w-[46ch] text-[13px] leading-5 text-white/70">
            {done.asked === 0
              ? COPY.nothingMissing[locale]
              : formatTemplate(COPY.doneCount[locale], {
                  written: done.written,
                  asked: done.asked,
                })}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-[13px] text-ec-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-4 border-t border-white/8 pt-3 text-xs text-white/32">
        {COPY.credit[locale]}{" "}
        <a
          href="https://getsongbpm.com"
          target="_blank"
          rel="noopener"
          className="text-ec-cyan underline-offset-4 hover:underline"
        >
          GetSongBPM
        </a>
      </p>
    </section>
  )
}
