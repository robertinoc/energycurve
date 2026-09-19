import type { BlogPost } from "@/lib/blog/posts"
import type { SiteLocale } from "@/lib/content/site-copy"
import { SITE_URL } from "@/lib/seo"

/**
 * Where an article's own social card lives — SEO-E18.
 *
 * One function, because three things have to agree on this URL and they are in
 * three different files: the route that draws the card, the article's
 * `openGraph.images`, and the `image` on its `BlogPosting`. Two of them
 * disagreeing is the bug the site already had in a smaller form — JSON-LD
 * claiming an image no scraper ever saw.
 *
 * A route handler rather than the `opengraph-image` file convention, for the
 * reason written at the top of `app/social-card.tsx`: inside a route group that
 * convention appends a content hash to the URL, and a URL we cannot predict is
 * one we cannot put in JSON-LD.
 *
 * The locale is in the path because a slug is only unique within a language.
 * Today every article is Spanish, so this looks redundant; the day the English
 * cornerstone set lands it stops being redundant, and a card served for the
 * wrong article is not a bug anyone notices quickly.
 */
export function articleCardPath(locale: SiteLocale, slug: string): string {
  return `/opengraph-image/blog/${locale}/${slug}`
}

export function articleCardUrl(post: BlogPost): string {
  return `${SITE_URL}${articleCardPath(post.locale, post.slug)}`
}

/**
 * The image to advertise for an article: its own artwork when the frontmatter
 * names one, otherwise the card drawn from its title and standfirst.
 *
 * One function so `og:image` and `BlogPosting.image` cannot pick differently —
 * the same reason `articleCardUrl` exists. A site-relative `image` is made
 * absolute here, because a scraper reading `og:image` has no base to resolve it
 * against.
 */
export function articleImageUrl(post: BlogPost): string {
  if (!post.image) {
    return articleCardUrl(post)
  }

  return post.image.startsWith("/") ? `${SITE_URL}${post.image}` : post.image
}
