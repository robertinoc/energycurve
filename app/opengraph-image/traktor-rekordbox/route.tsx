import { renderSocialCard } from "@/app/social-card"

/** The converter's card. Leads with the two names a DJ types into the search. */
export function GET() {
  return renderSocialCard({
    headline: "Traktor ↔ Rekordbox playlists",
    subhead:
      "Convert .nml to .m3u8 and back, order and paths intact. Free, in your browser, nothing uploaded.",
  })
}
