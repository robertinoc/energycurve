import { normalizeCampaign, type Medium } from "@/lib/attribution/first-touch"

/**
 * Links that leave the site, tagged by `docs/seo/utm-convention.md`.
 *
 * Outbound is the mirror of the first touch: there, a link pointing *here*
 * says where it was published; here, a link pointing *away* says it came from
 * EnergyCurve, so StageLink — and a vendor whose page we cite — can count us
 * even when `rel="noreferrer"` hides the referrer from them.
 *
 * Three rules the convention fixes, and the tests enforce:
 * - Outbound links always say `utm_source=energycurve`, nothing else.
 * - **Links to our own pages never carry UTM** — including the ones in
 *   `llms.txt`. A model that cites one of them adds its own tag
 *   (`utm_source=chatgpt.com`), and ours would sit in front of it and turn
 *   "ChatGPT" into "a file". The referrer and the assistant's own tag already
 *   say it came from an AI.
 * - **Identifiers never carry UTM**: `sameAs`, `url`, `citation` and every
 *   other schema.org field name a thing; a tagged URL is a different thing.
 *   So this helper is called where a link is rendered, never where an entity is
 *   described.
 */

export const OUTBOUND_SOURCE = "energycurve"

/** The sister product's home, as every outbound link to it is written. */
export const STAGELINK_URL = "https://stagelink.art"

/**
 * `url` with EnergyCurve's tags. `campaign` names the placement (`landing-suite`,
 * `compare-sources`); it has to fit the campaign format, and a typo throws at
 * the first render in development rather than shipping an untagged link.
 */
export function outboundHref(
  url: string,
  { medium, campaign }: { medium: Extract<Medium, "referral" | "crosspromo">; campaign: string }
): string {
  if (normalizeCampaign(campaign) !== campaign) {
    throw new Error(`Campaign "${campaign}" does not fit the UTM convention.`)
  }

  const target = new URL(url)

  target.searchParams.set("utm_source", OUTBOUND_SOURCE)
  target.searchParams.set("utm_medium", medium)
  target.searchParams.set("utm_campaign", campaign)

  return target.toString()
}
