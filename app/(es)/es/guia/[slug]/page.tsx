import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { GuidePage } from "@/components/content/guide-pages"
import { buildGuideStructuredData } from "@/lib/content/structured-data"
import { guideMetadata } from "@/lib/content/entry-metadata"
import { GUIDES, guideBySlug } from "@/lib/content/guides/guides"
import { serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const

/**
 * Drafts included: a draft is reachable by URL on purpose, so it can be
 * reviewed. What it is not is indexable, listed, or in the sitemap.
 */
export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug[LOCALE] }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = guideBySlug(slug, LOCALE)

  return guide ? guideMetadata(guide, LOCALE) : {}
}

export default async function GuideRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const guide = guideBySlug(slug, LOCALE)

  if (!guide) {
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildGuideStructuredData(guide, LOCALE)
          ),
        }}
      />
      <GuidePage guide={guide} locale={LOCALE} />
    </>
  )
}
