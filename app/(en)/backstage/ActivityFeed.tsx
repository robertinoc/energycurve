import type { BackstageUserRow } from "@/lib/backstage/users"
import type { AdminAuditRow } from "@/services/admin-audit-service"
import type { BackstageRecentAnalysis } from "@/services/backstage-service"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * Activity feed panels for the Users tab, following StageLink's
 * DashboardWelcome "Recent Activity" bento (header row + dashed empty
 * state). Signups come from the already-loaded user list; analyses from
 * getRecentAnalyses().
 *
 * The third panel is the admin audit trail, and it is here rather than behind a
 * separate tab on purpose: a record of who suspended and deleted whom is only
 * useful if it is in front of the person doing the suspending and deleting. An
 * audit log you have to go looking for gets read after an incident and never
 * before one.
 */

const FEED_LIMIT = 6

function formatFeedDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-white/40">
      {children}
    </p>
  )
}

function scoreTone(score: number) {
  if (score >= 7) {
    return "text-[#4ADE80] bg-[rgba(74,222,128,0.14)] border-[rgba(74,222,128,0.25)]"
  }

  if (score >= 4) {
    return "text-[#FFC96B] bg-[rgba(245,165,36,0.13)] border-[rgba(245,165,36,0.4)]"
  }

  return "text-[#FF6B6B] bg-[rgba(255,107,107,0.14)] border-[rgba(255,107,107,0.25)]"
}

const ACTION_LABELS: Record<string, string> = {
  "user.suspended": "suspended",
  "user.unsuspended": "unsuspended",
  "user.deleted": "deleted",
}

export function ActivityFeed({
  users,
  recentAnalyses,
  adminActions,
}: {
  users: BackstageUserRow[]
  recentAnalyses: BackstageRecentAnalysis[]
  adminActions: AdminAuditRow[]
}) {
  const latestSignups = users.slice(0, FEED_LIMIT)

  return (
    <div className="space-y-6">
      <Bento tone="panel" className="p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <BentoLabel>Latest signups</BentoLabel>
        </div>
        {latestSignups.length === 0 ? (
          <EmptyState>No signups yet.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {latestSignups.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="truncate text-white/80">{user.email}</span>
                <span className="shrink-0 font-mono text-[11px] text-white/40">
                  {formatFeedDate(user.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bento>

      <Bento tone="cyan" className="p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <BentoLabel>Latest analyses</BentoLabel>
        </div>
        {recentAnalyses.length === 0 ? (
          <EmptyState>No analyses recorded yet.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {recentAnalyses.map((analysis) => (
              <li
                key={analysis.id}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="truncate text-white/80">{analysis.email}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold ${scoreTone(
                      analysis.setScore
                    )}`}
                  >
                    {analysis.setScore.toFixed(1)}
                  </span>
                  <span className="font-mono text-[11px] text-white/40">
                    {formatFeedDate(analysis.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bento>

      <Bento tone="panel" className="p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <BentoLabel>Admin actions</BentoLabel>
        </div>
        {adminActions.length === 0 ? (
          <EmptyState>
            No admin actions recorded. If the panel has been used to suspend or
            delete an account, migration 0027 has not been applied here.
          </EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {adminActions.slice(0, FEED_LIMIT).map((action) => (
              <li key={action.id} className="space-y-0.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-white/80">
                    {/* Null once the retention sweep has cleared it: the action
                        outlives the address, deliberately. */}
                    {action.targetEmail ?? "(address removed)"}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-white/40">
                    {formatFeedDate(action.createdAt)}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-white/40">
                  {ACTION_LABELS[action.action] ?? action.action} ·{" "}
                  {action.actorEmail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bento>
    </div>
  )
}
