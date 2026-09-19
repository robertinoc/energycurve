import type { Metadata } from "next"

import { GuideIndexPage } from "@/components/content/guide-pages"
import { buildGuideIndexStructuredData } from "@/lib/content/structured-data"
import { publishedGuides } from "@/lib/content/guides/guides"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const
const PATH = "/guide" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function GuideIndexRoute() {
  // Drafts are absent here, in the sitemap and from indexing — the three
  // consequences the flag has to produce on its own.
  const guides = publishedGuides()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildGuideIndexStructuredData(guides, LOCALE)
          ),
        }}
      />
      <GuideIndexPage guides={guides} locale={LOCALE} />
    </>
  )
}
