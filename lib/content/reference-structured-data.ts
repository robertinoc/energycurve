import type { FaqEntry } from "@/lib/content/content-nodes"
import { ENERGY_TAGS_FAQ } from "@/lib/content/energy-tags-copy"
import { IMPORT_FORMATS_FAQ } from "@/lib/content/import-formats-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import {
  PAGE_LAST_MODIFIED,
  pageMetadata,
} from "@/lib/content/page-metadata"
import type { SiteLocale } from "@/lib/content/site-copy"
import { buildOrganization, SITE_URL, SOCIAL_IMAGE_URL } from "@/lib/seo"

/**
 * schema.org for the two reference pages — `/energy-tags` and
 * `/import-formats`.
 *
 * SEO-E19. Both pages are specifications: "which tag do we read energy from and
 * in what format", and "what does each playlist format carry". `TechArticle` is
 * the entity for exactly that, and it is a different claim from the
 * `SoftwareApplication` on the landing or the `WebApplication` on the tools —
 * those describe things you use, these describe documentation about how a thing
 * behaves.
 *
 * The `FAQPage` is generated from `ENERGY_TAGS_FAQ` / `IMPORT_FORMATS_FAQ`,
 * which are the same arrays the pages render through the shared `<FAQ>` block.
 * A question that is not on the page cannot reach the markup, which is the
 * property `AGENTS.md` requires and the one that makes this safe to ship without
 * a human re-reading both copies.
 *
 * `dateModified` comes from `PAGE_LAST_MODIFIED` rather than the build clock,
 * for the same reason the sitemap stopped using it — see SEO-E09.
 */

type ReferencePath = "/energy-tags" | "/import-formats"

const FAQS: Record<ReferencePath, FaqEntry[]> = {
  "/energy-tags": ENERGY_TAGS_FAQ,
  "/import-formats": IMPORT_FORMATS_FAQ,
}

const HOME_CRUMB: Record<SiteLocale, string> = { en: "Home", es: "Inicio" }

export function buildReferenceStructuredData(
  path: ReferencePath,
  locale: SiteLocale
) {
  const url = `${SITE_URL}${localizedPath(path, locale)}`
  const { title, description } = pageMetadata(path, locale)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: title,
        description,
        url,
        inLanguage: locale,
        dateModified: PAGE_LAST_MODIFIED[path],
        publisher: buildOrganization(locale),
        image: SOCIAL_IMAGE_URL,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        /**
         * Who this is written for, stated because a spec page is quoted out of
         * context more often than it is read in place: an answer engine lifting
         * "a bare number is only accepted in a field named ENERGY" should be
         * able to say who that applies to.
         */
        audience: {
          "@type": "Audience",
          audienceType: "DJs preparing a set",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: locale,
        mainEntity: FAQS[path].map((item) => ({
          "@type": "Question",
          name: item.question[locale],
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer[locale],
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: HOME_CRUMB[locale],
            item: `${SITE_URL}${localizedPath("/", locale)}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: url,
          },
        ],
      },
    ],
  }
}
