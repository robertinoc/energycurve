import type { Metadata, Viewport } from "next"
import { Manrope, Space_Grotesk, Space_Mono } from "next/font/google"

import { AnalyticsTracker } from "@/components/analytics/analytics-tracker"
import { AuthProvider } from "@/components/providers/auth-provider"
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
  title: {
    default: "EnergyCurve",
    template: "%s | EnergyCurve",
  },
  description:
    "EnergyCurve is a performance intelligence layer for DJs, producers, and performers shaping better sets through energy-aware insights.",
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
