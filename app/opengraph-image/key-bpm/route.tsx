import { renderSocialCard } from "@/app/social-card"

/** The checker's card. Leads with the question a DJ actually types. */
export function GET() {
  return renderSocialCard({
    headline: "Do these two tracks mix?",
    subhead:
      "Key compatibility, BPM difference, half-time, and what pitching does to the key. Free, no account.",
  })
}
