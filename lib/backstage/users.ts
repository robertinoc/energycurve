/**
 * Pure aggregation for the backstage Users dashboard: merges the per-table
 * query results (profiles + playlist owners + analysis rows) into one row
 * per user, plus the KPI strip numbers. Kept free of Supabase imports so it
 * stays unit-testable and safe for client bundles.
 */

export interface BackstageProfileInput {
  id: string
  email: string
  created_at: string
  updated_at: string
  suspended_at: string | null
}

export interface BackstageOwnedRowInput {
  user_id: string
}

export interface BackstageAnalysisInput {
  user_id: string
  created_at: string
}

export interface BackstageUserRow {
  id: string
  email: string
  createdAt: string
  /**
   * profiles.updated_at doubles as a last-access proxy: the dashboard
   * re-upserts the profile on every visit, which bumps the trigger.
   */
  lastSeenAt: string
  suspendedAt: string | null
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
}

export function buildBackstageUsers(
  profiles: BackstageProfileInput[],
  playlistOwners: BackstageOwnedRowInput[],
  analyses: BackstageAnalysisInput[]
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
    .map((profile) => ({
      id: profile.id,
      email: profile.email,
      createdAt: profile.created_at,
      lastSeenAt: profile.updated_at,
      suspendedAt: profile.suspended_at,
      playlistCount: playlistCounts.get(profile.id) ?? 0,
      analysisCount: analysisCounts.get(profile.id) ?? 0,
      lastAnalysisAt: lastAnalysisAt.get(profile.id) ?? null,
    }))
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function computeUserKpis(
  users: BackstageUserRow[],
  now: Date = new Date()
): BackstageUserKpis {
  const newSince = now.getTime() - THIRTY_DAYS_MS

  return {
    totalUsers: users.length,
    newUsers30d: users.filter(
      (user) => new Date(user.createdAt).getTime() >= newSince
    ).length,
    usersWithAnalyses: users.filter((user) => user.analysisCount > 0).length,
    totalAnalyses: users.reduce((sum, user) => sum + user.analysisCount, 0),
    suspendedUsers: users.filter((user) => user.suspendedAt !== null).length,
  }
}
