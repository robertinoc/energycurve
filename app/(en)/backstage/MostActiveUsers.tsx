"use client"

import { useMemo, useState } from "react"

import {
  formatRelative,
  mostActiveUsers,
  type ActivityWindow,
  type BackstageUserRow,
} from "@/lib/backstage/users"
import { cn } from "@/lib/utils"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * Who is actually using the product, ranked by analyses run in a window.
 * 30 days by default — "who is active NOW" — because all-time mixes the
 * people who left long ago with the ones carrying the product today.
 */

const WINDOWS: Array<{ id: ActivityWindow; label: string }> = [
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "all", label: "All time" },
]

const PLAN_TEXT: Record<BackstageUserRow["plan"], { label: string; color: string }> = {
  free: { label: "Free", color: "#F5A524" },
  pro: { label: "PRO", color: "#22D3EE" },
  pro_plus: { label: "PRO+", color: "#A24DE0" },
}

export function MostActiveUsers({ users }: { users: BackstageUserRow[] }) {
  const [window, setWindow] = useState<ActivityWindow>("30d")
  const now = useMemo(() => new Date(), [])
  const top = useMemo(() => mostActiveUsers(users, window), [users, window])

  return (
    <Bento tone="cyan" className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BentoLabel>Most active users</BentoLabel>
        <div role="radiogroup" aria-label="Activity window" className="flex gap-1.5">
          {WINDOWS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === window}
              onClick={() => setWindow(option.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold transition-colors",
                option.id === window
                  ? "ec-gradient-bg border-transparent text-white"
                  : "border-ec-border text-ec-text-dim hover:text-ec-text-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-white/50">
        Ranked by analyses run{" "}
        {window === "all" ? "ever" : `in the last ${window === "30d" ? 30 : 90} days`}
        ; ties go to more playlists, then most recently seen.
      </p>
      {top.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-white/40">
          Nobody ran an analysis in this window.
        </p>
      ) : (
        <ol className="grid gap-x-8 gap-y-2.5 xl:grid-cols-2">
          {top.map((user, index) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 text-[13px]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="w-5 shrink-0 text-right font-mono text-[11px] text-white/40">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-white/85">
                    {user.name ?? user.email}
                  </span>
                  {user.name ? (
                    <span className="block truncate text-[11px] text-white/40">
                      {user.email}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3 font-mono text-[11.5px] text-white/60">
                <span title={`${user.analysisCount} analyses all-time`}>
                  <strong className="text-white">
                    {window === "30d"
                      ? user.analysisCount30d
                      : window === "90d"
                        ? user.analysisCount90d
                        : user.analysisCount}
                  </strong>{" "}
                  analyses
                </span>
                <span>{user.playlistCount} sets</span>
                <span style={{ color: PLAN_TEXT[user.plan].color }}>
                  {PLAN_TEXT[user.plan].label}
                </span>
                <span className="text-white/40" title={user.lastSeenAt}>
                  {formatRelative(user.lastSeenAt, now)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Bento>
  )
}
