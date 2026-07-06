import type { Metadata } from "next"

import {
  getBackstageUsersSnapshot,
  getRecentAnalyses,
} from "@/services/backstage-service"

import { ActivityFeed } from "./ActivityFeed"
import { Bento, BentoLabel } from "./BackstagePrimitives"
import { UsersTable } from "./UsersTable"

export const metadata: Metadata = {
  title: "Users",
}

const KPI_LABELS: Array<{
  key: "totalUsers" | "newUsers30d" | "usersWithAnalyses" | "totalAnalyses" | "suspendedUsers"
  label: string
}> = [
  { key: "totalUsers", label: "Total users" },
  { key: "newUsers30d", label: "New · 30d" },
  { key: "usersWithAnalyses", label: "Ran ≥1 analysis" },
  { key: "totalAnalyses", label: "Analyses total" },
  { key: "suspendedUsers", label: "Suspended" },
]

export default async function BackstageUsersPage() {
  const [{ users, kpis }, recentAnalyses] = await Promise.all([
    getBackstageUsersSnapshot(),
    getRecentAnalyses(),
  ])

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Users</h1>
        <p className="text-sm text-ec-text-dim">
          Every registered profile, with product activity and account controls.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_LABELS.map(({ key, label }) => (
          <Bento key={key} tone="panel" className="space-y-1.5 p-4">
            <BentoLabel>{label}</BentoLabel>
            <p className="font-heading text-2xl font-bold text-white">
              {kpis[key]}
            </p>
          </Bento>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <UsersTable users={users} />
        </div>
        <ActivityFeed users={users} recentAnalyses={recentAnalyses} />
      </div>
    </div>
  )
}
