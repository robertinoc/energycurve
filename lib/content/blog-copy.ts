/**
 * Chrome copy for the blog. The articles carry their own words; this is the
 * furniture around them.
 */

import type { SiteLocale } from "@/lib/content/site-copy"

export const BLOG_COPY = {
  heading: { en: "Blog", es: "Blog" },
  /**
   * What the blog covers and who it is for, in the server-rendered HTML.
   *
   * Says who as well as what since SEO-E16: an index that only lists topics
   * leaves a reader — and an answer engine — to guess whether the writing is for
   * someone opening their first set or someone running a label. Naming the
   * warm-up DJ is the positioning the plan asks the whole site to hold.
   */
  intro: {
    en: "For DJs planning a set before they play it — especially warm-up and opening sets. Ordering, energy jumps, and what to do when your tracks carry no BPM or key.",
    es: "Para DJs que preparan un set antes de tocarlo, sobre todo en warm-up y apertura. Orden, saltos de energía, y qué hacer cuando tus temas no traen BPM ni tonalidad.",
  },
  /**
   * The empty state, which since 22/09/2026 no locale reaches.
   *
   * It said "the articles are in Spanish for now", which was true and measured —
   * the AEO baseline found the Spanish queries undefended and the English ones
   * held by four products — and stopped being true the moment SEO-E14 shipped
   * the five English translations.
   *
   * Kept rather than deleted, and rewritten to say nothing about which language
   * is ahead. The branch is unreachable while both directories have articles,
   * and a copy string that asserts a fact about the corpus is exactly the kind
   * of claim that goes stale unnoticed — this version cannot, because it makes
   * no claim.
   */
  emptyEn: {
    en: "Nothing here yet. The other language may have more — the articles are written where the questions are being asked.",
    es: "Todavía no hay nada acá. Puede que el otro idioma tenga más — los artículos se escriben donde se hacen las preguntas.",
  },
  readSpanish: { en: "Read them in Spanish", es: "Leerlos en español" },
  backToIndex: { en: "All articles", es: "Todos los artículos" },
  /**
   * The end of an article used to be a single "all articles" link, which asks a
   * reader who just finished something to go back to a list and choose again.
   * Three named articles and one thing to do are a better answer to "what now",
   * and they are also the only internal links these pages had.
   */
  keepReading: { en: "Keep reading", es: "Seguir leyendo" },
  ctaTitle: {
    en: "Analyze your set for free",
    es: "Analizá tu set gratis",
  },
  /** The no-account alternative, beside the signup CTA rather than instead of it. */
  ctaTool: {
    en: "Or try the free tool, no account →",
    es: "O probá la herramienta gratis, sin cuenta →",
  },
  ctaBody: {
    en: "Paste a tracklist or import from Rekordbox, Traktor or M3U8, and see the curve before you play.",
    es: "Pegá una lista de temas o importá de Rekordbox, Traktor o M3U8, y mirá la curva antes de tocar.",
  },
  /**
   * The reference page, offered where it is actually needed.
   *
   * Every article names an export format at some point, and the question that
   * follows one — "will it read mine?" — has a page that answers it. Sending a
   * reader to sign up before they know whether their files import is the wrong
   * order of operations, so this sits beside the signup rather than after it.
   */
  ctaFormats: {
    en: "Which playlist formats we read →",
    es: "Qué formatos de playlist leemos →",
  },
  /** The heading above the tag filter on the index. */
  filterLabel: { en: "Filter by topic", es: "Filtrar por tema" },
  filterAll: { en: "Every topic", es: "Todos los temas" },
  /** Counts the list under the filter, so a narrowed list says how narrow. */
  filterCount: { en: "articles", es: "artículos" },
  filterEmpty: {
    en: "No article carries that tag yet.",
    es: "Todavía no hay ningún artículo con ese tema.",
  },
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
