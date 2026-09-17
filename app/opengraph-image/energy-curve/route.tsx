import { renderSocialCard } from "@/app/social-card"

/**
 * The free tool's card.
 *
 * Leads with what the page actually offers a stranger, because that is what a
 * shared link has to carry: no account, nothing uploaded. The product pitch is
 * on every other page's card and would be the wrong promise on this one.
 */
export function GET() {
  return renderSocialCard({
    headline: "Your set's energy curve, free",
    subhead:
      "Drop in a Rekordbox, Traktor or M3U8 playlist. No sign-up, and nothing leaves your browser.",
  })
}
