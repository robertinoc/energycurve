import type { PendingDeletion } from "@/services/account-deletion-service"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * Accounts with a deletion pending, and how long they have left.
 *
 * The reason this panel exists is narrower than "visibility". The grace period
 * is enforced by the daily cron, and the cron answers 503 without
 * `CRON_SECRET` — which is not set. So a scheduled deletion today has a date
 * that will pass with nothing happening, and that is worse than not offering
 * the button: the person was told a date.
 *
 * A row sitting at a negative number is the signal. An empty panel means either
 * nobody asked or the cron is working; a panel full of overdue rows means the
 * cron never ran, and there is no other place that would say so.
 */
export function PendingDeletions({
  deletions,
}: {
  deletions: PendingDeletion[]
}) {
  const overdue = deletions.filter((deletion) => deletion.daysLeft < 0).length

  return (
    <Bento tone="panel" className="space-y-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <BentoLabel>Pending deletions</BentoLabel>
        <span className="font-mono text-[11px] text-white/40">
          {deletions.length} scheduled
        </span>
      </div>

      {overdue > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.08)] px-3 py-2 text-[12px] leading-5 text-[#FF8F8F]"
        >
          {overdue} {overdue === 1 ? "account is" : "accounts are"} past the
          30-day grace period and still here. The sweep runs from the daily cron,
          which answers 503 without <code>CRON_SECRET</code> — if that is unset,
          nothing is executing these.
        </p>
      ) : null}

      {deletions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-white/40">
          Nobody has asked to be deleted. An empty panel here also looks the same
          as a cron that never ran, so it is worth confirming the sweep once.
        </p>
      ) : (
        <ul className="space-y-2">
          {deletions.map((deletion) => (
            <li
              key={deletion.profileId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0A0714]/60 px-3 py-2"
            >
              <span className="font-mono text-[11px] break-all text-white/65">
                {deletion.email}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                  deletion.daysLeft < 0
                    ? "border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.14)] text-[#FF6B6B]"
                    : "border-white/14 text-white/50"
                }`}
              >
                {deletion.daysLeft < 0
                  ? `${Math.abs(deletion.daysLeft)}d overdue`
                  : `${deletion.daysLeft}d left`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bento>
  )
}
