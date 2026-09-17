import { Manrope, Space_Grotesk, Space_Mono } from "next/font/google"

import { AnalyticsTracker } from "@/components/analytics/analytics-tracker"
import { ConsentBanner } from "@/components/privacy/consent-banner"
import type { SiteLocale } from "@/lib/content/site-copy"

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

/**
 * The `<html>` and `<body>` shell, shared by both root layouts.
 *
 * There are two root layouts — `app/(en)/layout.tsx` and `app/(es)/layout.tsx` —
 * and they exist for exactly one attribute: `lang`. A single root layout cannot
 * know which language the route below it renders in, so `/es` used to serve
 * `<html lang="en">` and correct it from an effect after hydration. That fixed
 * the value a screen reader announces and nothing else: the HTML a crawler,
 * a translator, or a browser's "translate this page" prompt reads is the one
 * that arrived from the server, and it said English on every Spanish page.
 *
 * Route groups do not appear in the URL, so `/`, `/pricing` and `/es/pricing`
 * are unchanged; only the file paths moved. Everything else about the shell —
 * fonts, body classes, the tracker, the consent banner — lives here so the two
 * layouts cannot drift into rendering different pages in different languages.
 */
export function SiteHtml({
  lang,
  children,
}: {
  lang: SiteLocale
  children: React.ReactNode
}) {
  return (
    <html
      lang={lang}
      className={`${manrope.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground selection:bg-[#A24DE0]/30 selection:text-white">
        {/*
          No AuthProvider here on purpose: it mounts only under /dashboard and
          /backstage. See components/providers/auth-provider.tsx.
        */}
        {children}
        <AnalyticsTracker />
        {/*
          Below the tracker on purpose: the tracker no longer initialises
          anything until this banner has been answered, so the order reads the
          way the dependency runs.
        */}
        <ConsentBanner />
      </body>
    </html>
  )
}
