import { KNOWN_SOURCES } from "@/lib/attribution/first-touch"

/**
 * One vocabulary of acquisition channels for the whole backstage, whatever
 * the data source. Two different records answer "where did this user come
 * from" — the profile's own first touch (closed source list, consent-gated)
 * and PostHog's person facts (free-form utm/referrer) — and before this file
 * each spoke its own dialect: the table said "AI" while the acquisition
 * panels said "chatgpt". A dashboard where the same user reads differently
 * in two panels is a dashboard that teaches you to distrust it.
 *
 * Pure and client-safe; colors come from the same families the rest of the
 * panel already uses (plan colors, status colors, ec-* palette).
 */

export const CHANNEL_IDS = [
  "ai",
  "google",
  "search",
  "instagram",
  "linkedin",
  "youtube",
  "tiktok",
  "social",
  "directories",
  "stagelink",
  "referral",
  "direct",
  "unknown",
] as const

export type ChannelId = (typeof CHANNEL_IDS)[number]

export const CHANNEL_META: Record<ChannelId, { label: string; color: string }> = {
  ai: { label: "AI", color: "#A24DE0" }, // --ec-violet: the channel of the era
  google: { label: "Google", color: "#4ADE80" },
  search: { label: "Other search", color: "#86EFAC" },
  instagram: { label: "Instagram", color: "#F0348A" }, // --ec-magenta
  linkedin: { label: "LinkedIn", color: "#38BDF8" },
  youtube: { label: "YouTube", color: "#FF6B6B" },
  tiktok: { label: "TikTok", color: "#5EEAD4" },
  social: { label: "Other social", color: "#FDA4AF" },
  directories: { label: "Directories", color: "#FBBF24" },
  stagelink: { label: "StageLink", color: "#6A5CF0" }, // --ec-indigo
  referral: { label: "Referral", color: "#F5A524" }, // --ec-amber
  direct: { label: "Direct", color: "#9CA3AF" },
  unknown: { label: "Unknown", color: "#5C6070" },
}

/**
 * The closed first-touch source list, folded into channels. Sources the
 * closed list does not know fall through to their medium, then to unknown —
 * never silently to "direct", which is a claim, not a default.
 */
const CHANNEL_BY_SOURCE: Record<string, ChannelId> = {
  chatgpt: "ai",
  perplexity: "ai",
  claude: "ai",
  gemini: "ai",
  copilot: "ai",
  google: "google",
  bing: "search",
  duckduckgo: "search",
  yahoo: "search",
  ecosia: "search",
  brave: "search",
  instagram: "instagram",
  linkedin: "linkedin",
  youtube: "youtube",
  tiktok: "tiktok",
  facebook: "social",
  x: "social",
  reddit: "social",
  threads: "social",
  producthunt: "directories",
  alternativeto: "directories",
  crunchbase: "directories",
  stagelink: "stagelink",
  direct: "direct",
}

const CHANNEL_BY_MEDIUM: Partial<Record<string, ChannelId>> = {
  ai: "ai",
  organic: "search",
  social: "social",
  directory: "directories",
  crosspromo: "stagelink",
  referral: "referral",
}

/** Channel of a first-touch pair (source + medium), `unknown` when neither says. */
export function channelOfFirstTouch(
  source: string | null,
  medium: string | null
): ChannelId {
  if (source) {
    const bySource = CHANNEL_BY_SOURCE[source.toLowerCase()]

    if (bySource) {
      return bySource
    }
  }

  if (medium) {
    const byMedium = CHANNEL_BY_MEDIUM[medium.toLowerCase()]

    if (byMedium) {
      return byMedium
    }
  }

  return "unknown"
}

/**
 * The same folding for PostHog's free-form utm/referrer values (the table's
 * Source column). Order matters: the first rule that matches wins. Matches
 * that fall outside every rule return null so the caller can keep showing the
 * raw value — a new referrer is information, not noise.
 */
const FREEFORM_RULES: Array<[RegExp, ChannelId]> = [
  [
    /chatgpt|openai|perplexity|claude|anthropic|gemini\.google|copilot|bard\.google|^ai$|_ai$/i,
    "ai",
  ],
  [/instagram|^ig$/i, "instagram"],
  [/linkedin|^li$/i, "linkedin"],
  [/youtube|^yt$/i, "youtube"],
  [/tiktok/i, "tiktok"],
  [/facebook|^fb$|reddit|threads|twitter|^x\.com$|^t\.co$/i, "social"],
  [/producthunt|alternativeto|crunchbase/i, "directories"],
  [/stagelink/i, "stagelink"],
  [/google/i, "google"],
  [/bing|duckduckgo|yahoo|ecosia|brave/i, "search"],
]

export function channelOfFreeform(raw: string): ChannelId | null {
  for (const [pattern, channel] of FREEFORM_RULES) {
    if (pattern.test(raw)) {
      return channel
    }
  }

  return null
}

/** Display label for a freeform value: the channel's label, or the raw value. */
export function freeformLabel(raw: string): string {
  const channel = channelOfFreeform(raw)

  return channel ? CHANNEL_META[channel].label : raw
}

// The closed source list and this mapping must not drift: a source added to
// KNOWN_SOURCES without a channel here would silently read as unknown.
// tests/backstage-channels.test.ts walks KNOWN_SOURCES and asserts coverage.
export const KNOWN_SOURCE_NAMES = Object.keys(KNOWN_SOURCES)
