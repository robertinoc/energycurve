import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google"

import { AuthProvider } from "@/components/providers/auth-provider"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        url: "/branding/icons/energycurve-icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: ["/branding/icons/energycurve-icon.svg"],
    apple: ["/branding/icons/energycurve-icon.svg"],
  },
}

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground selection:bg-[#7B3FE4]/30 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
