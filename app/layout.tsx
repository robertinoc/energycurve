import type { Metadata, Viewport } from "next"
import { Manrope, Space_Grotesk, Space_Mono } from "next/font/google"

import { AnalyticsTracker } from "@/components/analytics/analytics-tracker"
import { AuthProvider } from "@/components/providers/auth-provider"
import { OPERATING_COMPANY, SEO_KEYWORDS, SITE_URL } from "@/lib/seo"
import "./globals.css"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "EnergyCurve — DJ Set Energy Analysis & Track Order",
    template: "%s | EnergyCurve",
  },
  description:
    "Analyze your DJ set's energy curve, score it 1–10, and get the exact track moves that fix it. Imports Rekordbox, Traktor, M3U8, and your own audio files — exports the corrected order back.",
  keywords: SEO_KEYWORDS,
  applicationName: "EnergyCurve",
  category: "music",
  // The company on the receipt, stated in the metadata too.
  publisher: OPERATING_COMPANY.name,
  creator: OPERATING_COMPANY.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/brand-kit/app-icon.png",
        type: "image/png",
      },
    ],
    shortcut: ["/brand-kit/app-icon.png"],
    apple: ["/apple-touch-icon.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EnergyCurve",
  },
}

export const viewport: Viewport = {
  themeColor: "#08050F",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground selection:bg-[#A24DE0]/30 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
        <AnalyticsTracker />
      </body>
    </html>
  )
}
