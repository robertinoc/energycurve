import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"
import { buildLandingStructuredData, SITE_URL } from "@/lib/seo"
import { getRequestLocale } from "@/lib/server-locale"

const TITLE = "EnergyCurve — DJ Set Energy Analysis & Track Order"
const DESCRIPTION =
  "Analyze your DJ set's energy curve, score it 1–10, and get the exact track moves that fix it. Imports Rekordbox, Traktor, M3U8, and your own audio files — exports the corrected order back."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/`,
    siteName: "EnergyCurve",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default async function HomePage() {
  // Cookie rather than a hardcoded default, so the structured data agrees with
  // what this same browser sees on every other server-rendered surface (the
  // dashboard, transactional emails). It does NOT fix Spanish SEO — a
  // first-time visitor or Googlebot carries no cookie and still gets English,
  // because the page's own visible copy is chosen client-side from
  // localStorage (components/marketing/landing-page.tsx), not from this
  // cookie. That gap needs real locale routing (see docs/qa-handoff-2026-08.md);
  // this fix only removes the *returning-user* inconsistency where the JSON-LD
  // language disagreed with the language two other clues on the same visit
  // (the flipped toggle and the dashboard) already agreed on.
  const locale = await getRequestLocale()
  const structuredData = buildLandingStructuredData({ locale })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  )
}
