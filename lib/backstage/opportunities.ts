import {
  MIN_SAMPLE_FOR_RATE,
  conversionBySource,
  firstAnalysisTiming,
  paidConversion,
  type AcquisitionUserInput,
} from "@/lib/backstage/acquisition"
import { CHANNEL_META, type ChannelId } from "@/lib/backstage/channels"
import {
  countBy,
  type BackstageUserKpis,
  type BackstageUserRow,
} from "@/lib/backstage/users"

/**
 * The decision layer: what the data is saying, next to what to do about it.
 *
 * Every opportunity is computed live from the same rows the rest of the panel
 * shows — no stored state, no stale advice — and follows the house rules:
 * the evidence names its numbers and denominators, a rule below its minimum
 * sample says nothing instead of guessing, and a suggestion is only worth
 * showing when there is an action within reach (an email template that already
 * exists, a table filter one click away, a decision with a name).
 *
 * These rules exist because the two findings that mattered most this year —
 * StageLink's broken onboarding, EnergyCurve's too-generous free tier — were
 * both sitting in plain sight in data nobody was reading.
 */

export const OPPORTUNITY_SEVERITIES = ["high", "medium", "info"] as const

export type OpportunitySeverity = (typeof OPPORTUNITY_SEVERITIES)[number]

export interface Opportunity {
  id: string
  severity: OpportunitySeverity
  title: string
  /** The numbers, with denominators. What makes this claim checkable. */
  evidence: string
  /** What to do about it, concretely. */
  suggestion: string
  /** A click that acts on it, when one exists. */
  action?: { label: string; href: string }
}

/** Cohort comparisons below this many signups per side say nothing. */
export const MIN_COHORT_FOR_TREND = 10

/** A country needs this many users before its zero-paid reads as a signal. */
export const MIN_COUNTRY_FOR_SIGNAL = 10

const DAY_MS = 24 * 60 * 60 * 1000
const FREE_PLAYLIST_LIMIT = 3

function toInput(user: BackstageUserRow): AcquisitionUserInput {
  return {
    id: user.id,
    createdAt: user.createdAt,
    plan: user.plan,
    firstTouchSource: user.firstTouchSource,
    firstTouchMedium: user.firstTouchMedium,
    firstTouchLanding: user.firstTouchLanding,
    firstAnalysisAt: user.firstAnalysisAt,
    paidAt: user.paidAt,
  }
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function channelLabel(id: string): string {
  return CHANNEL_META[id as ChannelId]?.label ?? id
}

export function buildOpportunities(
  users: BackstageUserRow[],
  kpis: BackstageUserKpis,
  now: Date = new Date()
): Opportunity[] {
  const out: Opportunity[] = []
  const inputs = users.map(toInput)
  const active = users.filter((user) => user.suspendedAt === null)

  // 1 — Activation, this month's cohort against the previous one.
  const windowStart = now.getTime() - 28 * DAY_MS
  const previousStart = now.getTime() - 56 * DAY_MS
  const recent = active.filter(
    (user) => new Date(user.createdAt).getTime() >= windowStart
  )
  const previous = active.filter((user) => {
    const joined = new Date(user.createdAt).getTime()

    return joined >= previousStart && joined < windowStart
  })

  if (recent.length >= MIN_COHORT_FOR_TREND && previous.length >= MIN_COHORT_FOR_TREND) {
    const activated = (cohort: BackstageUserRow[]) =>
      cohort.filter((user) => user.analysisCount > 0).length
    const recentRate = activated(recent) / recent.length
    const previousRate = activated(previous) / previous.length
    const delta = recentRate - previousRate
    const direction =
      delta <= -0.1 ? "falling" : delta >= 0.1 ? "improving" : "flat"

    out.push({
      id: "activation-trend",
      severity: direction === "falling" ? "high" : "info",
      title:
        direction === "falling"
          ? "Activation of new signups is falling"
          : direction === "improving"
            ? "Activation of new signups is improving"
            : "Activation of new signups is flat",
      evidence: `Last 4 weeks: ${activated(recent)} of ${recent.length} ran an analysis (${percent(recentRate)}). Previous 4: ${activated(previous)} of ${previous.length} (${percent(previousRate)}).`,
      suggestion:
        direction === "falling"
          ? "Something between signup and the first analysis got worse — check what changed in onboarding in the last month, and lean on the example set, which exists exactly for this."
          : direction === "improving"
            ? "Whatever changed in the last month is working — find it before changing anything else."
            : "Holding steady. The lever that moves it is the first-session experience (example set, import friction).",
    })
  }

  // 2 — Signed up, waited two weeks, never ran anything.
  const earlyDrop = active.filter(
    (user) =>
      user.analysisCount === 0 &&
      now.getTime() - new Date(user.createdAt).getTime() > 14 * DAY_MS
  )

  if (earlyDrop.length > 0) {
    out.push({
      id: "early-drop",
      severity:
        kpis.totalUsers > 0 && earlyDrop.length / kpis.totalUsers >= 0.3
          ? "high"
          : "medium",
      title: `${earlyDrop.length} signed up over two weeks ago and never ran an analysis`,
      evidence: `${earlyDrop.length} of ${kpis.totalUsers} accounts (${percent(earlyDrop.length / Math.max(kpis.totalUsers, 1))}). They created an account for a reason and the product never showed them what it does.`,
      suggestion:
        "Reach out while the reason is still warm: the «Getting started» email template (⋮ menu on any user) asks what stopped them, and replies land in your inbox.",
      action: { label: "See them in the table", href: "/backstage?status=never#users-table" },
    })
  }

  // 3 — Power users gone quiet: found value, then left. Cheapest to recover.
  const dormantPower = active
    .filter(
      (user) =>
        user.analysisCount >= 3 &&
        now.getTime() - new Date(user.lastSeenAt).getTime() > 30 * DAY_MS
    )
    .sort((a, b) => b.analysisCount - a.analysisCount)

  if (dormantPower.length > 0) {
    const names = dormantPower
      .slice(0, 3)
      .map((user) => user.name ?? user.email)
      .join(", ")

    out.push({
      id: "dormant-power-users",
      severity: "high",
      title: `${dormantPower.length} power ${dormantPower.length === 1 ? "user" : "users"} went quiet`,
      evidence: `${dormantPower.length} with 3+ analyses and no visit in 30 days — ${names}${dormantPower.length > 3 ? "…" : ""}. They already found the value once.`,
      suggestion:
        "The cheapest win-back there is: the «Check-in» template asks how the product worked for them — even one reply tells you why people leave.",
      action: { label: "See inactive users", href: "/backstage?status=inactive#users-table" },
    })
  }

  // 4 — Free users sitting at the playlist wall: the upgrade shortlist.
  const atWall = active.filter(
    (user) => user.plan === "free" && user.playlistCount >= FREE_PLAYLIST_LIMIT
  )
  const paid = paidConversion(inputs)

  if (atWall.length > 0) {
    out.push({
      id: "stuck-at-wall",
      severity: "medium",
      title: `${atWall.length} free ${atWall.length === 1 ? "user is" : "users are"} at the playlist limit`,
      evidence: `${atWall.length} on free with ${FREE_PLAYLIST_LIMIT}+ playlists — the wall already told them. Paid conversions to date: ${paid.paid.count} of ${paid.signups} signups.`,
      suggestion:
        "This is the upgrade shortlist. If they hit the wall and still don't convert, the question moves from marketing to pricing: what does PRO offer that these specific users need? (The known finding: free may simply be enough.)",
      action: { label: "See free users", href: "/backstage?plan=free#users-table" },
    })
  }

  // 5 — The channel that activates vs the one that doesn't.
  const conversion = conversionBySource(inputs)
  const rated = conversion.rows.filter(
    (row) => row.source !== "unknown" && row.analysed.rate !== null
  )

  if (rated.length >= 1) {
    const sorted = [...rated].sort(
      (a, b) => (b.analysed.rate ?? 0) - (a.analysed.rate ?? 0)
    )
    const best = sorted[0]!
    const worst = sorted.length >= 2 ? sorted[sorted.length - 1]! : null

    out.push({
      id: "channel-contrast",
      severity: "info",
      title: `${channelLabel(best.source)} is the channel that activates best`,
      evidence:
        `${channelLabel(best.source)}: ${best.analysed.count} of ${best.analysed.of} signups ran an analysis (${percent(best.analysed.rate!)})` +
        (worst
          ? `; ${channelLabel(worst.source)}: ${worst.analysed.count} of ${worst.analysed.of} (${percent(worst.analysed.rate!)}).`
          : `. No other channel has reached the ${MIN_SAMPLE_FOR_RATE}-signup sample yet.`),
      suggestion: worst
        ? `Put the next content/outreach push where it activates: ${channelLabel(best.source)}. For ${channelLabel(worst.source)}, the question is whether the promise upstream matches what the product does.`
        : `Worth feeding: more of what brings ${channelLabel(best.source)} traffic. The UTM links in docs/marketing/utm-sociales.md make the next channels measurable.`,
    })
  }

  // 6 — Time to value.
  const timing = firstAnalysisTiming(users, now)

  if (timing.medianHours !== null && timing.medianHours > 48) {
    out.push({
      id: "slow-time-to-value",
      severity: "medium",
      title: "The first analysis takes days, not minutes",
      evidence: `Median time from signup to first analysis: ${Math.round(timing.medianHours / 24)} days, over ${timing.reached.count} users who got there.`,
      suggestion:
        "Whoever doesn't analyse in the first session rarely comes back for it. Shorten the path: example set on the empty dashboard, import front and center, nothing else asking for attention.",
    })
  }

  // 7 — Where users exist but money doesn't (needs a real sample).
  const paidCountries = new Set(
    users
      .filter((user) => user.paidAt && user.countryCode)
      .map((user) => user.countryCode!)
  )
  const topUnpaidCountry = countBy(active, (user) => user.countryCode).find(
    (row) => row.count >= MIN_COUNTRY_FOR_SIGNAL && !paidCountries.has(row.key)
  )

  if (topUnpaidCountry && paid.paid.count > 0) {
    out.push({
      id: "country-no-paid",
      severity: "info",
      title: `${topUnpaidCountry.count} users in ${topUnpaidCountry.key} and not one payment`,
      evidence: `${topUnpaidCountry.key} is a top country by users (${topUnpaidCountry.count}) with zero paid conversions, while ${paid.paid.count} exist elsewhere.`,
      suggestion:
        "Could be price-to-income, could be the payment method, could be nothing yet. Worth one look before it becomes a pattern across countries.",
    })
  }

  const order: Record<OpportunitySeverity, number> = { high: 0, medium: 1, info: 2 }

  return out.sort((a, b) => order[a.severity] - order[b.severity])
}
