import { renderSocialCard } from "@/app/social-card"
import { allPublishedPosts, getPost } from "@/lib/blog/posts"
import { supportedLocales, type SiteLocale } from "@/lib/content/site-copy"

/**
 * One social card per article — SEO-E18.
 *
 * Until now the five articles shared the site card, so five different pieces of
 * writing previewed as the same picture with the same sentence on it. The card
 * is the only part of an article most people ever see.
 *
 * Drawn from the article's own title and standfirst, at smaller type than the
 * hand-written cards: see the note on `renderSocialCard`. Nothing is invented
 * here — an article with no description would get a card with no second line
 * rather than a line we made up, and the parser already rejects an article
 * without one.
 *
 * `force-static` plus `generateStaticParams` makes these five PNGs build
 * artifacts rather than five renders per crawl.
 */
export const dynamic = "force-static"

export function generateStaticParams() {
  return allPublishedPosts().map((post) => ({
    locale: post.locale,
    slug: post.slug,
  }))
}

function isSiteLocale(value: string): value is SiteLocale {
  return (supportedLocales as readonly string[]).includes(value)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params

  if (!isSiteLocale(locale)) {
    return new Response("Not found", { status: 404 })
  }

  const post = getPost(locale, slug)

  // A draft or a wrong slug gets a 404, not the site card. Falling back would
  // mean a URL that always answers, which is how a broken reference survives
  // long enough to ship.
  if (!post) {
    return new Response("Not found", { status: 404 })
  }

  return renderSocialCard({
    headline: post.title,
    subhead: post.description,
    // Sized for an article's own words rather than a written-to-fit line.
    headlineSize: 54,
    subheadSize: 27,
  })
}
