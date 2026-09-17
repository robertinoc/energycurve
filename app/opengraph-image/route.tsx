import { renderSocialCard } from "@/app/social-card"

/** The site's card: what a link to any page but the tool previews as. */
export function GET() {
  return renderSocialCard({
    headline: "Analyze your DJ set's energy curve",
    subhead:
      "Score the set, find the weak moves, fix the order, export back to Rekordbox or Traktor.",
  })
}
