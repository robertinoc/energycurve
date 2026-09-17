import type { Metadata, Viewport } from "next"

import { SiteHtml } from "@/components/layout/site-html"
import { buildRootMetadata } from "@/lib/seo"
import "../globals.css"

/**
 * Root layout for every English route — the marketing pages, the auth screens,
 * the dashboard and backstage.
 *
 * Its Spanish twin is `app/(es)/layout.tsx`. The pair, and why the app has two
 * root layouts at all, is explained in components/layout/site-html.tsx.
 */
export const metadata: Metadata = buildRootMetadata("en")

export const viewport: Viewport = {
  themeColor: "#08050F",
}

export default function EnglishRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <SiteHtml lang="en">{children}</SiteHtml>
}
