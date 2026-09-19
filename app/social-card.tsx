import { ImageResponse } from "next/og"

/**
 * The social card, drawn rather than shipped as a PNG so it stays in sync with
 * the brand tokens and needs no design round-trip.
 *
 * Parameterised by its two lines because there are two cards now: the site's,
 * and the free tool's — a link to a page that promises "no sign-up" should not
 * preview as a pitch for the product you sign up for.
 *
 * Route handlers rather than the `opengraph-image` file convention. That
 * convention derives its URL from the segment it sits in, and inside a route
 * group it appends a content hash — a URL that changes with the drawing, under
 * a tag `lib/seo.ts` hard-codes into every page. As handlers the URL is the
 * directory name and nothing else decides it.
 */
export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 }

/**
 * Type sizes, and why they are a parameter now.
 *
 * The four hand-written cards each carry one short line, sized to fill the card.
 * An article card carries the article's own title and standfirst — up to about
 * 60 and 155 characters — and at the original 68/34 that is roughly four
 * hundred pixels of text in three hundred pixels of space. The block does not
 * clip, it pushes the curve off the bottom of the card, which is only visible
 * once somebody shares the link.
 *
 * So the sizes come from the caller, defaulting to exactly what the existing
 * cards already use. `renderSocialCard` stays the one place the card is drawn.
 */
export function renderSocialCard({
  headline,
  subhead,
  headlineSize = 68,
  subheadSize = 34,
}: {
  headline: string
  subhead: string
  headlineSize?: number
  subheadSize?: number
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #08050F 0%, #14101F 55%, #1C1730 100%)",
          padding: "72px 80px",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background:
                "linear-gradient(96deg, #A24DE0, #6A5CF0 46%, #22D3EE)",
            }}
          />
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: -1,
            }}
          >
            EnergyCurve
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: headlineSize,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: subheadSize,
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            {subhead}
          </div>
        </div>

        {/* Curve */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <svg width="1040" height="130" viewBox="0 0 1040 130">
            <defs>
              <linearGradient id="ec-og-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#A24DE0" />
                <stop offset="46%" stopColor="#6A5CF0" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <path
              d="M0 112 C 120 104, 190 74, 280 80 C 372 86, 420 34, 520 30 C 618 26, 660 68, 752 58 C 846 48, 900 16, 1040 22"
              fill="none"
              stroke="url(#ec-og-line)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="520" cy="30" r="14" fill="#F0348A" />
          </svg>
        </div>
      </div>
    ),
    SOCIAL_CARD_SIZE
  )
}
