import type { Metadata } from "next"

import { listPendingDeletions } from "@/services/account-deletion-service"
import { getRecentAdminActions } from "@/services/admin-audit-service"
import { listOpenPrivacyRequests } from "@/services/privacy-request-service"
import {
  getBackstageUsersSnapshot,
  getRecentAnalyses,
} from "@/services/backstage-service"

import { ActivityFeed } from "./ActivityFeed"
import { Bento, BentoLabel } from "./BackstagePrimitives"
import { PendingDeletions } from "./PendingDeletions"
import { PrivacyRequestQueue } from "./PrivacyRequestQueue"
import { UsersDashboard } from "./UsersDashboard"
import { UsersTable } from "./UsersTable"

export const metadata: Metadata = {
  title: "Users",
}

import type { BackstageUserKpis } from "@/lib/backstage/users"
import { isPostHogReportingConfigured } from "@/lib/backstage/posthog-reporting"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** StageLink-style KPI cards: big number, colored, with a one-line footnote. */
function kpiCards(kpis: BackstageUserKpis): Array<{
  label: string
  value: number
  sub: string
  valueClass: string
}> {
  return [
    {
      label: "Total users",
      value: kpis.totalUsers,
      sub: `${kpis.suspendedUsers} suspended`,
      valueClass: "ec-gradient-text",
    },
    {
      label: "Active · 30 days",
      value: kpis.activeUsers30d,
      sub: `${kpis.dormantUsers} dormant`,
      valueClass: "text-[#4ADE80]",
    },
    {
      label: "Paid plans",
      value: kpis.proUsers,
      sub: "entitled today (Stripe)",
      valueClass: "text-ec-violet",
    },
    {
      label: "Never used",
      value: kpis.neverUsedUsers,
      sub: `${kpis.totalUsers > 0 ? Math.round((kpis.neverUsedUsers / kpis.totalUsers) * 100) : 0}% of all signups — watch it in "By status" per cohort`,
      valueClass: "text-[#9CA3AF]",
    },
    {
      label: "New · 30 days",
      value: kpis.newUsers30d,
      sub: `${kpis.usersWithAnalyses} of all users ran ≥1 analysis`,
      valueClass: "text-ec-cyan",
    },
  ]
}

export default async function BackstageUsersPage() {
  const [
    { users, kpis },
    recentAnalyses,
    adminActions,
    privacyRequests,
    pendingDeletions,
  ] = await Promise.all([
    getBackstageUsersSnapshot(),
    getRecentAnalyses(),
    getRecentAdminActions(),
    listOpenPrivacyRequests(),
    listPendingDeletions(),
  ])

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Users</h1>
        <p className="text-sm text-ec-text-dim">
          Every registered profile, with product activity and account controls.
        </p>
      </div>

      {!isPostHogReportingConfigured() ? (
        <Alert>
          <AlertTitle>Country &amp; Source are running blind</AlertTitle>
          <AlertDescription>
            Both columns fill from PostHog, and POSTHOG_PERSONAL_API_KEY /
            POSTHOG_PROJECT_ID are not set in this environment — so they only
            show countries recorded by visits since migration 0033. The
            Analytics tab needs the same two variables.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpiCards(kpis).map(({ label, value, sub, valueClass }) => (
          <Bento key={label} tone="panel" className="space-y-1.5 p-4">
            <BentoLabel>{label}</BentoLabel>
            <p
              className={`font-heading text-3xl font-bold leading-none ${valueClass}`}
            >
              {value}
            </p>
            <p className="font-mono text-[10.5px] text-ec-text-dim">{sub}</p>
          </Bento>
        ))}
      </div>

      {/* Full width on purpose: with a side column the 8-column table forced
          horizontal scroll at desktop widths. */}
      <UsersTable users={users} />

      <UsersDashboard users={users} />

      {/* Feed first by request: what just happened is what gets checked daily;
          the compliance queues below carry their own deadlines and alarms. */}
      <ActivityFeed
        users={users}
        recentAnalyses={recentAnalyses}
        adminActions={adminActions}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PrivacyRequestQueue requests={privacyRequests} />
        <PendingDeletions deletions={pendingDeletions} />
      </div>
    </div>
  )
}
