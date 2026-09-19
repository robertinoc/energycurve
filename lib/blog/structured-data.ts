import type { BlogPost } from "@/lib/blog/posts"
import { articleCardUrl } from "@/lib/blog/social-card"
import { localizedPath } from "@/lib/content/locale-routing"
import { buildOrganization, SITE_URL } from "@/lib/seo"

/**
 * The author of every article on this site.
 *
 * A `Person`, not the `Organization`: the articles are written in one voice, in
 * first person, and an answer engine quoting one should be able to say who wrote
 * it. `url` points at the site rather than a personal profile we don't publish.
 */
const AUTHOR = {
  "@type": "Person",
  name: "ROBERTINOC",
  url: SITE_URL,
} as const

/** "Blog", in the language the article is written in. */
const BLOG_CRUMB: Record<BlogPost["locale"], string> = {
  en: "Blog",
  es: "Blog",
}

/** "Home", same. */
const HOME_CRUMB: Record<BlogPost["locale"], string> = {
  en: "Home",
  es: "Inicio",
}

/**
 * `BlogPosting` + `BreadcrumbList` for one article.
 *
 * The articles shipped with no structured data at all, which meant the one thing
 * on this site written to answer a question was also the one thing a crawler had
 * to infer everything about — including whether it was an article.
 *
 * Both entities go in a single `@graph` so the page emits one `<script>` rather
 * than two, and `mainEntityOfPage` ties the posting to the URL it lives at,
 * which is what stops a syndicated copy from reading as the original.
 *
 * `dateModified` comes from `postUpdatedAt`, so an article that has never been
 * revised reports its publication date rather than today's build.
 */
export function buildArticleStructuredData(post: BlogPost, updatedAt: string) {
  const url = `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: updatedAt,
        inLanguage: post.locale,
        author: AUTHOR,
        publisher: buildOrganization(post.locale),
        // The article's own card (SEO-E18), which is also what
        // `generateMetadata` puts in `og:image`. Those two have to be the same
        // URL: an `image` in JSON-LD that no scraper ever fetches is a claim
        // about a picture nobody sees. Before this they were both the site
        // card, which was accurate and identical for all five articles.
        image: articleCardUrl(post),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: HOME_CRUMB[post.locale],
            item: `${SITE_URL}${localizedPath("/", post.locale)}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: BLOG_CRUMB[post.locale],
            item: `${SITE_URL}${localizedPath("/blog", post.locale)}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: url,
          },
        ],
      },
    ],
  }
}
