"use client"

import { useState } from "react"

import type {
  PrivacyRequestForAdmin,
  PrivacyRequestKind,
} from "@/services/privacy-request-service"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * The data-rights queue, sorted by what is due soonest.
 *
 * This panel exists because of a specific sentence in
 * `docs/compliance/dsar-procedure.md`: the clock starts when the request
 * arrives, not when it is read. With one operator that turns an inbox into a
 * compliance surface, and an inbox does not sort by deadline or tell you what is
 * overdue.
 *
 * So the only thing it shows is the deadline, in days, with the sign that
 * matters. Overdue is red and stays visible; nothing here collapses or
 * auto-hides, because a queue that tidies itself is a queue that can be empty
 * for the wrong reason.
 */

const KIND_LABELS: Record<PrivacyRequestKind, string> = {
  rectify_email: "Email rectification · Art. 16",
  object: "Objection · Art. 21",
  restrict: "Restriction · Art. 18",
  other: "Other · Arts. 12–22",
}

function dueTone(days: number) {
  if (days < 0) {
    return "text-[#FF6B6B] bg-[rgba(255,107,107,0.14)] border-[rgba(255,107,107,0.3)]"
  }

  if (days <= 7) {
    return "text-[#FBBF24] bg-[rgba(251,191,36,0.14)] border-[rgba(251,191,36,0.3)]"
  }

  return "text-[#4ADE80] bg-[rgba(74,222,128,0.14)] border-[rgba(74,222,128,0.25)]"
}

function dueLabel(days: number) {
  if (days < 0) {
    return `${Math.abs(days)}d overdue`
  }

  if (days === 0) {
    return "due today"
  }

  return `${days}d left`
}

export function PrivacyRequestQueue({
  requests,
}: {
  requests: PrivacyRequestForAdmin[]
}) {
  const [resolving, setResolving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState<Set<string>>(new Set())

  async function resolve(id: string, status: "answered" | "refused") {
    const note = window.prompt(
      status === "refused"
        ? "Reason for refusing — required by Art. 12(4), and it has to be communicated to the person too:"
        : "What was done about it (optional, one line):"
    )

    // A null prompt is a cancel, and a refusal with no reason is not a refusal.
    if (note === null) return
    if (status === "refused" && note.trim().length === 0) {
      setError("A refusal needs a reason.")

      return
    }

    setResolving(id)
    setError(null)

    try {
      const response = await fetch(`/api/backstage/privacy-requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        setError(body?.error ?? "Unable to close the request.")

        return
      }

      setClosed((previous) => new Set(previous).add(id))
    } catch {
      setError("Unable to reach the server.")
    } finally {
      setResolving(null)
    }
  }

  const open = requests.filter((request) => !closed.has(request.id))

  return (
    <Bento tone="panel" className="space-y-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <BentoLabel>Data-rights queue</BentoLabel>
        <span className="font-mono text-[11px] text-white/40">
          {open.length} open
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-[12px] text-[#FF6B6B]">
          {error}
        </p>
      ) : null}

      {open.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-white/40">
          Nothing open. Requests filed from the account page land here with a
          30-day deadline.
        </p>
      ) : (
        <ul className="space-y-2">
          {open.map((request) => (
            <li
              key={request.id}
              className="space-y-2 rounded-xl border border-white/10 bg-[#0A0714]/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-white/88">
                  {KIND_LABELS[request.kind]}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${dueTone(request.daysUntilDue)}`}
                >
                  {dueLabel(request.daysUntilDue)}
                </span>
              </div>

              <p className="font-mono text-[11px] break-all text-white/45">
                {request.requesterEmail ?? "—"}
              </p>

              {request.details ? (
                <p className="text-[12px] leading-5 whitespace-pre-wrap text-white/60">
                  {request.details}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={resolving === request.id}
                  onClick={() => resolve(request.id, "answered")}
                  className="rounded-full border border-white/14 px-3 py-1 text-[12px] font-medium text-white transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  {resolving === request.id ? "Saving…" : "Mark answered"}
                </button>
                <button
                  type="button"
                  disabled={resolving === request.id}
                  onClick={() => resolve(request.id, "refused")}
                  className="rounded-full border border-white/14 px-3 py-1 text-[12px] font-medium text-white/70 transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Refuse
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-5 text-white/35">
        Marking it answered records the row — it does not send anything. Reply to
        the account address; a request that arrived from the session is already
        verified, so never ask for a document.
      </p>
    </Bento>
  )
}
