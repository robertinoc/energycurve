"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { countryFlagEmoji, countryName } from "@/lib/backstage/country"
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_META,
  type ActivityStatus,
  type BackstageUserRow,
  type SortKey,
  type SortState,
  DEFAULT_SORT,
  PAGE_SIZES,
  acquisitionChannel,
  activityStatus,
  buildUsersCsv,
  formatRelative,
  nextSort,
  paginate,
  sortUsers,
} from "@/lib/backstage/users"
import type { Plan } from "@/lib/product/plans"
import { cn } from "@/lib/utils"

type PendingAction =
  | { type: "suspend"; user: BackstageUserRow }
  | { type: "reactivate"; user: BackstageUserRow }
  | { type: "delete"; user: BackstageUserRow }

const ACTION_COPY: Record<
  PendingAction["type"],
  { title: string; body: string; confirmLabel: string; destructive: boolean }
> = {
  suspend: {
    title: "Suspend this account?",
    body: "The user keeps their playlists and analyses, but logins are rejected and open sessions are kicked out of the dashboard. You can reactivate at any time.",
    confirmLabel: "Suspend account",
    destructive: false,
  },
  reactivate: {
    title: "Reactivate this account?",
    body: "The user will be able to log in and use the product again immediately.",
    confirmLabel: "Reactivate account",
    destructive: false,
  },
  delete: {
    title: "Delete this account?",
    body: "This removes the user from WorkOS and deletes their profile, playlists, and analysis history. There is no undo.",
    confirmLabel: "Delete forever",
    destructive: true,
  },
}

function formatDate(value: string | null) {
  if (!value) {
    return "—"
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Deterministic avatar gradient per email, StageLink's seeded-avatar idea. */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #A24DE0, #6A5CF0)",
  "linear-gradient(135deg, #22D3EE, #6A5CF0)",
  "linear-gradient(135deg, #F0348A, #A24DE0)",
  "linear-gradient(135deg, #F5A524, #F0348A)",
] as const

function avatarGradient(email: string) {
  let hash = 0

  for (const char of email) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }

  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

const PLAN_FILTERS = ["all", "free", "pro", "pro_plus"] as const
const STATUS_FILTERS = ["all", ...ACTIVITY_STATUSES] as const

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "PRO",
  pro_plus: "PRO+",
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  labelOf,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  labelOf: (option: T) => string
  onChange: (option: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ec-text-dim">
        {label}
      </span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold transition-colors",
            option === value
              ? "ec-gradient-bg border-transparent text-white"
              : "border-ec-border text-ec-text-dim hover:text-ec-text-muted"
          )}
        >
          {labelOf(option)}
        </button>
      ))}
    </div>
  )
}

const COLUMNS: Array<{
  label: string
  key: SortKey | null
  align?: "right"
}> = [
  { label: "Email", key: "email" },
  { label: "Joined", key: "joined" },
  { label: "Last seen", key: "lastSeen" },
  { label: "Country", key: "country" },
  { label: "Source", key: null },
  { label: "Plan", key: "plan" },
  { label: "Playlists", key: "playlists", align: "right" },
  { label: "Analyses", key: "analyses", align: "right" },
  { label: "Status", key: null },
  { label: "", key: null },
]

function SortIndicator({ sort, column }: { sort: SortState; column: SortKey }) {
  if (sort.key !== column) {
    return <span className="text-ec-text-dim/50">⇅</span>
  }

  return <span className="text-ec-cyan">{sort.dir === "asc" ? "▲" : "▼"}</span>
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  const meta = ACTIVITY_STATUS_META[status]

  return (
    <span
      title={meta.description}
      className="inline-flex items-center gap-1.5 rounded-full border border-ec-border px-2.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap"
      style={{ color: meta.color }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  )
}

export function UsersTable({ users }: { users: BackstageUserRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [planFilter, setPlanFilter] =
    useState<(typeof PLAN_FILTERS)[number]>("all")
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("all")
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])
  // StageLink's viewKey trick: the page number is remembered together with
  // the view it belonged to, so any filter/sort/size change snaps back to
  // page 1 without a useEffect.
  const [pageState, setPageState] = useState<{ view: string; page: number }>({
    view: "",
    page: 1,
  })
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The 30-day activity line must not move between renders of one visit.
  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    if (menuOpenId === null) {
      return
    }

    const close = () => setMenuOpenId(null)

    document.addEventListener("click", close)

    return () => document.removeEventListener("click", close)
  }, [menuOpenId])

  const viewKey = JSON.stringify([
    query,
    planFilter,
    statusFilter,
    sort,
    pageSize,
  ])
  const page = pageState.view === viewKey ? pageState.page : 1

  const sortedUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = users.filter((user) => {
      if (planFilter !== "all" && user.plan !== planFilter) {
        return false
      }

      if (
        statusFilter !== "all" &&
        activityStatus(user, now) !== statusFilter
      ) {
        return false
      }

      if (!needle) {
        return true
      }

      const channel = acquisitionChannel(user).label.toLowerCase()

      return (
        user.email.toLowerCase().includes(needle) ||
        channel.includes(needle) ||
        (user.countryCode !== null &&
          countryName(user.countryCode).toLowerCase().includes(needle))
      )
    })

    return sortUsers(filtered, sort)
  }, [users, query, planFilter, statusFilter, sort, now])

  const paged = paginate(sortedUsers, page, pageSize)

  function setPage(next: number) {
    setPageState({ view: viewKey, page: next })
  }

  function exportCsv() {
    const blob = new Blob([buildUsersCsv(sortedUsers, now)], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = `energycurve-users-${now.toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function executePending() {
    if (!pending) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      const response =
        pending.type === "delete"
          ? await fetch(`/api/backstage/users/${pending.user.id}`, {
              method: "DELETE",
            })
          : await fetch(`/api/backstage/users/${pending.user.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ suspended: pending.type === "suspend" }),
            })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        throw new Error(payload?.error ?? `Request failed (${response.status})`)
      }

      setPending(null)
      router.refresh()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The action failed. Try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>
          {query || planFilter !== "all" || statusFilter !== "all"
            ? `${sortedUsers.length} of ${users.length} users`
            : `${users.length} users`}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email, source or country…"
            className="w-full sm:w-72"
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <FilterGroup
            label="Plan"
            options={PLAN_FILTERS}
            value={planFilter}
            labelOf={(option) =>
              option === "all" ? "All" : PLAN_LABELS[option as Plan]
            }
            onChange={setPlanFilter}
          />
          <FilterGroup
            label="Status"
            options={STATUS_FILTERS}
            value={statusFilter}
            labelOf={(option) =>
              option === "all"
                ? "All"
                : ACTIVITY_STATUS_META[option as ActivityStatus].label
            }
            onChange={setStatusFilter}
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-ec-border font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ec-text-dim">
                {COLUMNS.map((column) => (
                  <th
                    key={column.label || "actions"}
                    className={cn(
                      "px-2.5 py-2.5",
                      column.align === "right" && "text-right"
                    )}
                    aria-sort={
                      column.key && sort.key === column.key
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.key ? (
                      <button
                        type="button"
                        onClick={() => setSort(nextSort(sort, column.key!))}
                        className="inline-flex items-center gap-1 uppercase hover:text-ec-text-muted"
                      >
                        {column.label}{" "}
                        <SortIndicator sort={sort} column={column.key} />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.items.map((user) => {
                const status = activityStatus(user, now)
                const suspended = status === "suspended"
                const channel = acquisitionChannel(user)

                return (
                  <tr
                    key={user.id}
                    className="border-b border-ec-border/60 last:border-b-0"
                  >
                    <td className="max-w-[280px] px-2.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                          style={{ background: avatarGradient(user.email) }}
                        >
                          {user.email[0]?.toUpperCase()}
                        </span>
                        <span className="truncate font-medium text-ec-text">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-ec-text-muted">
                      {formatDate(user.createdAt)}
                    </td>
                    <td
                      className="px-2.5 py-2.5 font-mono text-[12.5px] whitespace-nowrap"
                      title={`${formatDate(user.lastSeenAt)}${user.lastSeenObserved ? "" : " (profile activity proxy)"}`}
                    >
                      <span
                        className={
                          status === "active"
                            ? "text-[#4ADE80]"
                            : "text-ec-text-muted"
                        }
                      >
                        {formatRelative(user.lastSeenAt, now)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5">
                      {user.countryCode ? (
                        <span
                          title={countryName(user.countryCode)}
                          className="text-[17px]"
                        >
                          {countryFlagEmoji(user.countryCode)}
                        </span>
                      ) : (
                        <span
                          className="text-ec-text-dim"
                          title="No country recorded yet — it fills in on their next visit."
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5">
                      {channel.kind === "unknown" ? (
                        <span className="text-ec-text-dim">—</span>
                      ) : (
                        <span
                          title={[
                            user.utmSource && `utm_source: ${user.utmSource}`,
                            user.referrerDomain &&
                              `referrer: ${user.referrerDomain}`,
                          ]
                            .filter(Boolean)
                            .join("\n")}
                          className={cn(
                            "inline-flex max-w-[120px] truncate rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold",
                            channel.kind === "campaign"
                              ? "border-ec-violet/40 bg-ec-violet/[0.13] text-[#CDA2F1]"
                              : "border-ec-border bg-white/[0.04] text-ec-text-muted"
                          )}
                        >
                          {channel.label}
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5">
                      <Badge
                        variant={user.plan === "free" ? "outline" : "default"}
                      >
                        {PLAN_LABELS[user.plan]}
                      </Badge>
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-ec-text-muted">
                      {user.playlistCount}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-ec-text-muted">
                      {user.analysisCount}
                    </td>
                    <td className="px-2.5 py-2.5">
                      <StatusBadge status={status} />
                    </td>
                    <td className="relative px-2.5 py-2.5 text-right">
                      <button
                        type="button"
                        aria-label={`Actions for ${user.email}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setMenuOpenId(menuOpenId === user.id ? null : user.id)
                        }}
                        className="rounded-lg border border-ec-border p-1.5 text-ec-text-dim hover:text-ec-text"
                      >
                        <MoreVertical className="size-3.5" />
                      </button>
                      {menuOpenId === user.id ? (
                        <div
                          onClick={(event) => event.stopPropagation()}
                          className="absolute top-10 right-2.5 z-40 w-44 rounded-xl border border-ec-border bg-ec-surface p-1.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null)
                              setPending({
                                type: suspended ? "reactivate" : "suspend",
                                user,
                              })
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-[13px] text-ec-text hover:bg-white/[0.06]"
                          >
                            {suspended
                              ? "Reactivate account"
                              : "Suspend account"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null)
                              setPending({ type: "delete", user })
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-[13px] text-ec-error hover:bg-ec-error/10"
                          >
                            Delete user
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {paged.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-10 text-center text-ec-text-dim"
                  >
                    No users match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ec-border pt-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ec-text-dim">
              Per page
            </span>
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPageSize(size)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold",
                  size === pageSize
                    ? "ec-gradient-bg border-transparent text-white"
                    : "border-ec-border text-ec-text-dim hover:text-ec-text-muted"
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 font-mono text-[12px] text-ec-text-dim">
            <span>
              {paged.from}–{paged.to} of {paged.total}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={paged.page <= 1}
              onClick={() => setPage(1)}
              aria-label="First page"
            >
              «
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={paged.page <= 1}
              onClick={() => setPage(paged.page - 1)}
              aria-label="Previous page"
            >
              ‹
            </Button>
            <span>
              {paged.page} / {paged.pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={paged.page >= paged.pageCount}
              onClick={() => setPage(paged.page + 1)}
              aria-label="Next page"
            >
              ›
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={paged.page >= paged.pageCount}
              onClick={() => setPage(paged.pageCount)}
              aria-label="Last page"
            >
              »
            </Button>
          </div>
        </div>
      </CardContent>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{ACTION_COPY[pending.type].title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ec-text-muted">
                <span className="font-bold text-ec-text">
                  {pending.user.email}
                </span>{" "}
                — {pending.user.playlistCount} playlists,{" "}
                {pending.user.analysisCount} analyses.
              </p>
              <p className="text-sm text-ec-text-muted">
                {ACTION_COPY[pending.type].body}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setPending(null)
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    ACTION_COPY[pending.type].destructive
                      ? "destructive"
                      : "secondary"
                  }
                  size="sm"
                  disabled={busy}
                  onClick={executePending}
                >
                  {busy ? "Working…" : ACTION_COPY[pending.type].confirmLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Card>
  )
}
