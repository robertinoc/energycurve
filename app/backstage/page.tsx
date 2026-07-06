import type { Metadata } from "next"

import { Card, CardContent } from "@/components/ui/card"
import { getBackstageUsersSnapshot } from "@/services/backstage-service"

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
  const { users, kpis } = await getBackstageUsersSnapshot()

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
          <Card key={key}>
            <CardContent className="space-y-1 p-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ec-text-dim">
                {label}
              </p>
              <p className="font-heading text-2xl font-bold text-ec-text">
                {kpis[key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <UsersTable users={users} />
    </div>
  )
}
