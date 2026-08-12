import { ImageResponse } from "next/og"

/**
 * Social card for energycurve.app. Drawn here rather than shipped as a PNG so
 * it stays in sync with the brand tokens and needs no design round-trip.
 */
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt =
  "EnergyCurve — analyze your DJ set's energy curve and fix the order before you play"

export default function OpengraphImage() {
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
              fontSize: 68,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            Analyze your DJ set&apos;s energy curve
          </div>
          <div
            style={{
              fontSize: 34,
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            Score the set, find the weak moves, fix the order, export back to
            Rekordbox or Traktor.
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
    size
  )
}
