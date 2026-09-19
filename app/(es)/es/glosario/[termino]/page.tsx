import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { GlossaryTermPage } from "@/components/content/glossary-pages"
import { buildGlossaryTermStructuredData } from "@/lib/content/structured-data"
import { glossaryTermMetadata } from "@/lib/content/entry-metadata"
import { GLOSSARY_TERMS, termBySlug } from "@/lib/content/glossary/terms"
import { serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const

/** Every entry, so each one is a static page rather than a render per request. */
export function generateStaticParams() {
  return GLOSSARY_TERMS.map((term) => ({ termino: term.slug[LOCALE] }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ termino: string }>
}): Promise<Metadata> {
  const { termino: slug } = await params
  const term = termBySlug(slug, LOCALE)

  return term ? glossaryTermMetadata(term, LOCALE) : {}
}

export default async function GlossaryTermRoute({
  params,
}: {
  params: Promise<{ termino: string }>
}) {
  const { termino: slug } = await params
  const term = termBySlug(slug, LOCALE)

  if (!term) {
    // Covers a wrong slug and the other language's slug alike: /glossary/tonalidad
    // is not a page, and answering it with content would put the same entry on
    // two URLs.
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildGlossaryTermStructuredData(term, LOCALE)
          ),
        }}
      />
      <GlossaryTermPage term={term} locale={LOCALE} />
    </>
  )
}
