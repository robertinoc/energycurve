import type { Metadata, Viewport } from "next"

import { SiteHtml } from "@/components/layout/site-html"
import { buildRootMetadata } from "@/lib/seo"
import "../globals.css"

/**
 * Root layout for the `/es` subtree.
 *
 * Identical to its English twin in everything but the two strings it passes, and
 * that is the point: the language a page is served in is now decided by which
 * directory the route file lives in, which is something the server knows before
 * it renders a byte.
 */
export const metadata: Metadata = buildRootMetadata("es")

export const viewport: Viewport = {
  themeColor: "#08050F",
}

export default function SpanishRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <SiteHtml lang="es">{children}</SiteHtml>
}
