/**
 * Chrome copy for the blog. The articles carry their own words; this is the
 * furniture around them.
 */

import type { SiteLocale } from "@/lib/content/site-copy"

export const BLOG_COPY = {
  heading: { en: "Blog", es: "Blog" },
  intro: {
    en: "Reading a set before you play it: ordering, energy jumps, and what to do when your tracks carry no BPM or key.",
    es: "Leer un set antes de tocarlo: orden, saltos de energía, y qué hacer cuando tus temas no traen BPM ni tonalidad.",
  },
  /**
   * Shown on the English index, which has no articles yet.
   *
   * Says where the writing is instead of pretending the section is coming soon.
   * The Spanish-first order was a measured decision — the AEO baseline found the
   * Spanish queries undefended and the English ones held by four products — so
   * the honest empty state names it.
   */
  emptyEn: {
    en: "The articles are in Spanish for now. That's deliberate: those are the searches nobody has answered yet.",
    es: "Los artículos están en español por ahora.",
  },
  readSpanish: { en: "Read them in Spanish", es: "Leerlos en español" },
  backToIndex: { en: "All articles", es: "Todos los artículos" },
  /** Reading time is not shown: a five-minute estimate on a four-minute read is noise. */
  publishedOn: { en: "Published", es: "Publicado el" },
} as const

const DATE_LOCALES: Record<SiteLocale, string> = { en: "en-GB", es: "es-AR" }

/** A date a person reads, in their language. */
export function formatPostDate(iso: string, locale: SiteLocale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(DATE_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}
