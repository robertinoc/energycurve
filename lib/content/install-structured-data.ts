import { localizedPath } from "@/lib/content/locale-routing"
import { PAGE_LAST_MODIFIED, pageMetadata } from "@/lib/content/page-metadata"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"
import { buildOrganization, SITE_URL } from "@/lib/seo"

/**
 * schema.org for `/install` — SEO-E20.
 *
 * **Two `HowTo` entities, not one.** The page shows two routes to the same
 * outcome: Android via Chrome's menu, iOS via Safari's share sheet. A single
 * `HowTo` holding all eight steps would read, to anything consuming `step` in
 * order, as one eight-step procedure — telling a reader to open Chrome's menu
 * and then tap Safari's Share button. Two entities say the true thing: there are
 * two procedures and you follow the one for your phone.
 *
 * Both are built from `getSiteCopy(locale).install.androidSteps` / `iosSteps`,
 * which is the same array the page renders as a numbered list. A step that is
 * not on the page cannot reach the markup.
 *
 * The `FAQPage` comes from the same object's `faq`, rendered through the shared
 * native-`<details>` block. Same contract.
 */

const HOME_CRUMB: Record<SiteLocale, string> = { en: "Home", es: "Inicio" }

function howTo(
  id: string,
  name: string,
  steps: string[],
  locale: SiteLocale,
  url: string
) {
  return {
    "@type": "HowTo",
    "@id": `${url}#${id}`,
    name,
    inLanguage: locale,
    // Stated because the alternative is a reader assuming there is one: no
    // account, no download, no purchase is needed to add the app to a phone.
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "0",
    },
    step: steps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      // `name` and `text` are the same sentence on purpose: these steps are one
      // instruction each, and inventing a shorter heading for them would be
      // writing copy that appears nowhere on the page.
      name: text,
      text,
      url: `${url}#${id}-${index + 1}`,
    })),
  }
}

export function buildInstallStructuredData(locale: SiteLocale) {
  const url = `${SITE_URL}${localizedPath("/install", locale)}`
  const { title, description } = pageMetadata("/install", locale)
  const copy = getSiteCopy(locale).install

  return {
    "@context": "https://schema.org",
    "@graph": [
      howTo("android", copy.androidTitle, copy.androidSteps, locale, url),
      howTo("ios", copy.iosTitle, copy.iosSteps, locale, url),
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: locale,
        mainEntity: copy.faq.map((item) => ({
          "@type": "Question",
          name: item.question[locale],
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer[locale],
          },
        })),
      },
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        name: title,
        description,
        url,
        inLanguage: locale,
        dateModified: PAGE_LAST_MODIFIED["/install"],
        publisher: buildOrganization(locale),
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
          { "@type": "ListItem", position: 2, name: title, item: url },
        ],
      },
    ],
  }
}
