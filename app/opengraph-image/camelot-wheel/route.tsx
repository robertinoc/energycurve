import { renderSocialCard } from "@/app/social-card"

/** The wheel's card: what it answers, not what the product sells. */
export function GET() {
  return renderSocialCard({
    headline: "Which keys mix with yours",
    subhead:
      "An interactive Camelot wheel, and every key in Camelot, Open Key and musical notation. Free, no account.",
  })
}
