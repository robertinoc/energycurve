import { effectivePlan, type Plan, type PlanStatus } from "@/lib/product/plans"

/**
 * Pure aggregation + table rules for the backstage Users dashboard: merges
 * the per-table query results (profiles + playlist owners + analysis rows +
 * PostHog person facts) into one row per user, plus everything the table
 * and the cohort dashboard compute from it (activity status, acquisition
 * channel, sorting, pagination, periods, CSV). Kept free of Supabase/server
 * imports so it stays unit-testable and safe for client bundles. The table
 * rules follow StageLink's behind-users.ts, adapted to this product.
 */

export interface BackstageProfileInput {
  id: string
  email: string
  created_at: string
  updated_at: string
  suspended_at: string | null
  plan: string
  plan_status: string | null
  last_seen_at: string | null
  last_seen_country: string | null
}

export interface BackstageOwnedRowInput {
  user_id: string
}

export interface BackstageAnalysisInput {
  user_id: string
  created_at: string
}

/** Read-side enrichment from PostHog, keyed by profile id. All optional. */
export interface BackstagePersonFacts {
  countryCode: string | null
  utmSource: string | null
  referrerDomain: string | null
}

export interface BackstageUserRow {
  id: string
  email: string
  createdAt: string
  /**
   * profiles.last_seen_at when the presence write has observed the user
   * (migration 0033); otherwise the updated_at proxy carried from before.
   */
  lastSeenAt: string
  /** True once the value comes from a real presence write, not the proxy. */
  lastSeenObserved: boolean
  suspendedAt: string | null
  /** Entitled plan as of today (Stripe status already applied). */
  plan: Plan
  /** profiles.last_seen_country first, PostHog geoip as fallback. */
  countryCode: string | null
  utmSource: string | null
  referrerDomain: string | null
  playlistCount: number
  analysisCount: number
  lastAnalysisAt: string | null
}

export interface BackstageUserKpis {
  totalUsers: number
  newUsers30d: number
  usersWithAnalyses: number
  totalAnalyses: number
  suspendedUsers: number
  /** Active window (30d) over lastSeenAt, suspended excluded. */
  activeUsers30d: number
  dormantUsers: number
  proUsers: number
}

function toPlan(plan: string, status: string | null): Plan {
  const base: Plan =
    plan === "pro" || plan === "pro_plus" ? (plan as Plan) : "free"

  return effectivePlan(base, (status as PlanStatus) ?? null)
}

export function buildBackstageUsers(
  profiles: BackstageProfileInput[],
  playlistOwners: BackstageOwnedRowInput[],
  analyses: BackstageAnalysisInput[],
  personFacts: Map<string, BackstagePersonFacts> = new Map()
): BackstageUserRow[] {
  const playlistCounts = new Map<string, number>()

  for (const row of playlistOwners) {
    playlistCounts.set(row.user_id, (playlistCounts.get(row.user_id) ?? 0) + 1)
  }

  const analysisCounts = new Map<string, number>()
  const lastAnalysisAt = new Map<string, string>()

  for (const row of analyses) {
    analysisCounts.set(row.user_id, (analysisCounts.get(row.user_id) ?? 0) + 1)

    const previous = lastAnalysisAt.get(row.user_id)

    if (!previous || row.created_at > previous) {
      lastAnalysisAt.set(row.user_id, row.created_at)
    }
  }

  return [...profiles]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((profile) => {
      const facts = personFacts.get(profile.id)

      return {
        id: profile.id,
        email: profile.email,
        createdAt: profile.created_at,
        lastSeenAt: profile.last_seen_at ?? profile.updated_at,
        lastSeenObserved: profile.last_seen_at !== null,
        suspendedAt: profile.suspended_at,
        plan: toPlan(profile.plan, profile.plan_status),
        countryCode:
          profile.last_seen_country?.toUpperCase() ??
          facts?.countryCode ??
          null,
        utmSource: facts?.utmSource ?? null,
        referrerDomain: facts?.referrerDomain ?? null,
        playlistCount: playlistCounts.get(profile.id) ?? 0,
        analysisCount: analysisCounts.get(profile.id) ?? 0,
        lastAnalysisAt: lastAnalysisAt.get(profile.id) ?? null,
      }
    })
}

const DAY_MS = 24 * 60 * 60 * 1000
export const ACTIVE_WINDOW_DAYS = 30
const THIRTY_DAYS_MS = ACTIVE_WINDOW_DAYS * DAY_MS

// ---------------------------------------------------------------------------
// Activity status
// ---------------------------------------------------------------------------

export const ACTIVITY_STATUSES = [
  "active",
  "inactive",
  "never",
  "suspended",
] as const

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export const ACTIVITY_STATUS_META: Record<
  ActivityStatus,
  { label: string; description: string; color: string }
> = {
  active: {
    label: "active",
    description: `Used the app in the last ${ACTIVE_WINDOW_DAYS} days`,
    color: "#4ADE80",
  },
  inactive: {
    label: "inactive",
    description: `No visit in the last ${ACTIVE_WINDOW_DAYS} days`,
    color: "#FBBF24",
  },
  never: {
    label: "never used",
    description: "No playlists and no analyses yet",
    color: "#9CA3AF",
  },
  suspended: {
    label: "suspended",
    description: "Logins rejected by an admin",
    color: "#FF6B6B",
  },
}

export function activityStatus(
  user: BackstageUserRow,
  now: Date = new Date()
): ActivityStatus {
  if (user.suspendedAt !== null) {
    return "suspended"
  }

  if (user.playlistCount === 0 && user.analysisCount === 0) {
    return "never"
  }

  const last = new Date(user.lastSeenAt).getTime()

  return now.getTime() - last < THIRTY_DAYS_MS ? "active" : "inactive"
}

// ---------------------------------------------------------------------------
// Acquisition channel (StageLink's acquisitionChannel, same rule shape)
// ---------------------------------------------------------------------------

export type AcquisitionKind = "campaign" | "referrer" | "direct" | "unknown"

export interface AcquisitionChannel {
  kind: AcquisitionKind
  label: string
}

const CHANNEL_RULES: Array<[RegExp, string]> = [
  [
    /chatgpt|openai|perplexity|claude|anthropic|gemini\.google|copilot|bard\.google|^ai$|_ai$/i,
    "AI",
  ],
  [/instagram|^ig$/i, "Instagram"],
  [/linkedin|^li$/i, "LinkedIn"],
  [/youtube|^yt$/i, "YouTube"],
  [/tiktok/i, "TikTok"],
  [/facebook|^fb$/i, "Facebook"],
  [/twitter|^x\.com$|^t\.co$/i, "X"],
  [/reddit/i, "Reddit"],
  [/google/i, "Google"],
  [/bing/i, "Bing"],
  [/duckduckgo/i, "DuckDuckGo"],
]

function channelLabel(raw: string): string {
  for (const [pattern, label] of CHANNEL_RULES) {
    if (pattern.test(raw)) {
      return label
    }
  }

  return raw
}

/**
 * First UTM source wins, then the referring domain, then direct. PostHog
 * reports direct traffic as the literal "$direct".
 */
export function acquisitionChannel(user: {
  utmSource: string | null
  referrerDomain: string | null
}): AcquisitionChannel {
  if (user.utmSource) {
    return { kind: "campaign", label: channelLabel(user.utmSource) }
  }

  if (user.referrerDomain && user.referrerDomain !== "$direct") {
    return { kind: "referrer", label: channelLabel(user.referrerDomain) }
  }

  if (user.referrerDomain === "$direct") {
    return { kind: "direct", label: "Direct" }
  }

  return { kind: "unknown", label: "—" }
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

export function formatRelative(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`

  return `${Math.floor(days / 365)}y`
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export const SORT_KEYS = [
  "email",
  "joined",
  "lastSeen",
  "country",
  "plan",
  "playlists",
  "analyses",
] as const

export type SortKey = (typeof SORT_KEYS)[number]

export interface SortState {
  key: SortKey
  dir: "asc" | "desc"
}

export const DEFAULT_SORT: SortState = { key: "joined", dir: "desc" }

const DEFAULT_DIR_BY_KEY: Record<SortKey, "asc" | "desc"> = {
  email: "asc",
  joined: "desc",
  lastSeen: "desc",
  country: "asc",
  plan: "desc",
  playlists: "desc",
  analyses: "desc",
}

/** Same column flips direction; a new column starts at its natural default. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" }
  }

  return { key, dir: DEFAULT_DIR_BY_KEY[key] }
}

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, pro_plus: 2 }

function sortValue(user: BackstageUserRow, key: SortKey): string | number | null {
  switch (key) {
    case "email":
      return user.email.toLowerCase()
    case "joined":
      return user.createdAt
    case "lastSeen":
      return user.lastSeenAt
    case "country":
      return user.countryCode
    case "plan":
      return PLAN_RANK[user.plan]
    case "playlists":
      return user.playlistCount
    case "analyses":
      return user.analysisCount
  }
}

/** Stable sort; null values go last in either direction. */
export function sortUsers(
  users: BackstageUserRow[],
  sort: SortState
): BackstageUserRow[] {
  const direction = sort.dir === "asc" ? 1 : -1

  return users
    .map((user, index) => ({ user, index }))
    .sort((a, b) => {
      const av = sortValue(a.user, sort.key)
      const bv = sortValue(b.user, sort.key)

      if (av === null && bv === null) return a.index - b.index
      if (av === null) return 1
      if (bv === null) return -1

      if (av < bv) return -direction
      if (av > bv) return direction

      return a.index - b.index
    })
    .map((entry) => entry.user)
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PAGE_SIZES = [25, 50, 100] as const

export interface PaginatedUsers {
  items: BackstageUserRow[]
  page: number
  pageCount: number
  from: number
  to: number
  total: number
}

export function paginate(
  users: BackstageUserRow[],
  page: number,
  pageSize: number
): PaginatedUsers {
  const total = users.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const clamped = Math.min(Math.max(1, page), pageCount)
  const from = total === 0 ? 0 : (clamped - 1) * pageSize + 1
  const to = Math.min(clamped * pageSize, total)

  return {
    items: users.slice(from === 0 ? 0 : from - 1, to),
    page: clamped,
    pageCount,
    from,
    to,
    total,
  }
}

// ---------------------------------------------------------------------------
// Cohort periods (joined-at windows for the dashboard section)
// ---------------------------------------------------------------------------

export const PERIOD_OPTIONS = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "all", label: "All time" },
] as const

export type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"]

export function periodRange(
  period: PeriodId,
  now: Date
): { from: Date | null; to: Date | null } {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  switch (period) {
    case "this_month":
      return { from: startOfMonth, to: null }
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: startOfMonth,
      }
    case "3m":
      return { from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), to: null }
    case "6m":
      return { from: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), to: null }
    case "12m":
      return { from: new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()), to: null }
    case "all":
      return { from: null, to: null }
  }
}

export function joinedInPeriod(
  user: BackstageUserRow,
  period: PeriodId,
  now: Date
): boolean {
  const { from, to } = periodRange(period, now)
  const joined = new Date(user.createdAt).getTime()

  if (from !== null && joined < from.getTime()) return false
  if (to !== null && joined >= to.getTime()) return false

  return true
}

/** Count rows by a key, descending, null keys skipped. */
export function countBy<T>(
  rows: T[],
  keyOf: (row: T) => string | null
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const key = keyOf(row)

    if (key !== null) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1))
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/** Always quoted; a leading = + - @ gets a ' prefix (formula injection). */
function csvCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value)
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw

  return `"${guarded.replace(/"/g, '""')}"`
}

export function buildUsersCsv(
  users: BackstageUserRow[],
  now: Date = new Date()
): string {
  const header = [
    "email",
    "joined",
    "last_seen",
    "country",
    "source",
    "plan",
    "playlists",
    "analyses",
    "status",
  ]

  const lines = users.map((user) =>
    [
      csvCell(user.email),
      csvCell(user.createdAt),
      csvCell(user.lastSeenAt),
      csvCell(user.countryCode),
      csvCell(acquisitionChannel(user).label.replace("—", "")),
      csvCell(user.plan),
      csvCell(user.playlistCount),
      csvCell(user.analysisCount),
      csvCell(ACTIVITY_STATUS_META[activityStatus(user, now)].label),
    ].join(",")
  )

  return [header.map(csvCell).join(","), ...lines].join("\n")
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export function computeUserKpis(
  users: BackstageUserRow[],
  now: Date = new Date()
): BackstageUserKpis {
  const newSince = now.getTime() - THIRTY_DAYS_MS
  const statuses = users.map((user) => activityStatus(user, now))

  return {
    totalUsers: users.length,
    newUsers30d: users.filter(
      (user) => new Date(user.createdAt).getTime() >= newSince
    ).length,
    usersWithAnalyses: users.filter((user) => user.analysisCount > 0).length,
    totalAnalyses: users.reduce((sum, user) => sum + user.analysisCount, 0),
    suspendedUsers: statuses.filter((status) => status === "suspended").length,
    activeUsers30d: statuses.filter((status) => status === "active").length,
    dormantUsers: statuses.filter(
      (status) => status === "inactive" || status === "never"
    ).length,
    proUsers: users.filter((user) => user.plan !== "free").length,
  }
}
