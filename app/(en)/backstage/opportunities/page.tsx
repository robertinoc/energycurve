import type { Metadata } from "next"

import { buildOpportunities } from "@/lib/backstage/opportunities"
import { getBackstageUsersSnapshot } from "@/services/backstage-service"

import { OpportunitiesPanel } from "../OpportunitiesPanel"

export const metadata: Metadata = {
  title: "Opportunities",
}

/**
 * The decision layer as its own tab. It lived at the top of Users first and
 * crowded the page it was reading from — the person it is for asked for it
 * here, next to Analytics and Audio spike. Same snapshot, same live rules:
 * nothing is stored, so this page is never stale.
 */
export default async function BackstageOpportunitiesPage() {
  const { users, kpis } = await getBackstageUsersSnapshot()

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Opportunities</h1>
        <p className="text-sm text-ec-text-dim">
          What the data says, next to what to do about it — computed live from
          the same snapshot the Users tab reads, nothing stored or stale.
        </p>
      </div>

      <OpportunitiesPanel opportunities={buildOpportunities(users, kpis)} />
    </div>
  )
}
