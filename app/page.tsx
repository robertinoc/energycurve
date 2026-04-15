import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: "EnergyCurve | Performance intelligence for DJs",
  description:
    "EnergyCurve analyzes mixes, tracks, and transitions to reveal the hidden energy flow behind every great set.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EnergyCurve | Performance intelligence for DJs",
    description:
      "Design better performances with better energy. Analyze your sets, understand transitions, and shape the dancefloor with confidence.",
    url: "https://energycurve.vercel.app/",
    siteName: "EnergyCurve",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EnergyCurve | Performance intelligence for DJs",
    description:
      "Analyze your mixes, tracks, and transitions to reveal the hidden energy flow behind every great set.",
  },
}

export default function HomePage() {
  return <LandingPage />
}
