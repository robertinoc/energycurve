"use client"

import { useState, useTransition } from "react"
import { Loader2, UserPlus, X } from "lucide-react"

import {
  inviteCollaboratorAction,
  removeCollaboratorAction,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { Collaborator } from "@/services/collaboration-service"

const COPY = DASHBOARD_COPY.collaboration

/**
 * The owner's side of a shared set: who can see it, and adding or removing them.
 *
 * States what a collaborator can't do, up front, rather than letting them discover
 * it by trying. A read-only share that isn't announced as read-only reads as a
 * broken editor to the person on the other end.
 */
export function CollaboratorsPanel({
  playlistId,
  collaborators,
  locale,
}: {
  playlistId: string
  collaborators: Collaborator[]
  locale: SiteLocale
}) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const invite = () => {
    setError(null)

    startTransition(async () => {
      const result = await inviteCollaboratorAction(playlistId, email)

      if (result.ok) {
        // Cleared only on success, so a rejected address stays in the field to be
        // corrected rather than retyped.
        setEmail("")
      } else {
        setError(result.message ?? null)
      }
    })
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-ec-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ec-text">
        <UserPlus className="size-4 text-ec-cyan" />
        {COPY.sectionLabel[locale]}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[13px] leading-6 text-ec-text-dim">
        {COPY.intro[locale]}
      </p>

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          invite()
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={COPY.emailPlaceholder[locale]}
          aria-label={COPY.sectionLabel[locale]}
          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-ec-raised px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-ec-cyan focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={pending || email.trim() === ""}>
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {COPY.inviting[locale]}
            </>
          ) : (
            COPY.invite[locale]
          )}
        </Button>
      </form>

      {error ? (
        <p className="mt-2 text-[13px] text-ec-error" role="alert">
          {error}
        </p>
      ) : null}

      {collaborators.length === 0 ? (
        <div className="mt-4 space-y-1.5">
          <p className="text-[13px] text-ec-text-dim">{COPY.empty[locale]}</p>
          <p className="text-xs leading-5 text-white/32">
            {COPY.pendingHint[locale]}
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {collaborators.map((collaborator) => (
            <li
              key={collaborator.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-ec-raised px-3 py-2"
            >
              <span className="truncate text-sm text-white/80">
                {collaborator.email}
              </span>
              <button
                type="button"
                aria-label={`${COPY.remove[locale]} ${collaborator.email}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await removeCollaboratorAction(playlistId, collaborator.id)
                  })
                }
                className="shrink-0 rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
