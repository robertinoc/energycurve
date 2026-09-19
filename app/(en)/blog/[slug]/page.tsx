import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BlogArticle } from "@/components/marketing/blog-article"
import { buildArticleStructuredData } from "@/lib/blog/structured-data"
import {
  getPost,
  listPosts,
  postAlternates,
  postUpdatedAt,
  relatedPosts,
} from "@/lib/blog/posts"
import { articleImageUrl } from "@/lib/blog/social-card"
import { localizedPath } from "@/lib/content/locale-routing"
import {
  openGraphLocale,
  serializeStructuredData,
  SITE_URL,
} from "@/lib/seo"

const LOCALE = "en" as const

/**
 * No `generateStaticParams` here, unlike the Spanish route — and the asymmetry is
 * temporary, not a preference.
 *
 * There are no English articles yet, so it would return an empty array, and Next
 * reads that as "prerender this route's shell" rather than "there is nothing to
 * prerender". The shell is static, and a statically prerendered 404 that reaches
 * a not-found which reads the request fails with "page changed from static to
 * dynamic" — a 500 where a 404 belongs. With no params to prerender, rendering on
 * demand costs nothing and the 404 works.
 *
 * `tests/blog.test.ts` fails the moment `content/blog/en/` has an article and
 * says to put this back, because at that point the array is non-empty, the shell
 * is a real page, and prerendering is what you want.
 */

/**
 * Self-canonical, and an `hreflang` set naming exactly one language: this one.
 *
 * An article exists in the language it was written in and no other, so there is
 * no pair to declare. It used to carry no `alternates.languages` at all, on the
 * reasoning that advertising a translation that 404s is worse than advertising
 * none — true, and it threw out the half that was safe to say. A self-referencing
 * `hreflang` is the documented way to state "this page is in en, and that is
 * the whole set": a crawler that sees one entry knows the set is closed, where a
 * page with no entries only knows nothing was declared.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(LOCALE, slug)

  if (!post) {
    return {}
  }

  const path = localizedPath(`/blog/${post.slug}`, LOCALE)
  const url = `${SITE_URL}${path}`
  /**
   * The article's own card (SEO-E18) rather than the site's. Same URL as
   * the `image` on its `BlogPosting`, because a preview and a claim about
   * a preview that disagree are worse than either alone.
   */
  const card = [
    {
      url: articleImageUrl(post),
      width: 1200,
      height: 630,
      type: "image/png",
      alt: post.title,
    },
  ]

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: url,
      /**
       * The translated pair when `translationOf` resolves on both sides,
       * and this article alone when it does not. Never a declared
       * translation that 404s — see `resolveTranslation`.
       */
      languages: postAlternates(post),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: postUpdatedAt(post),
      locale: openGraphLocale(LOCALE),
      images: card,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: card,
    },
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(LOCALE, slug)

  if (!post) {
    // Covers both a wrong slug and a draft: an unpublished article is absent
    // rather than viewable-if-you-know-the-URL.
    notFound()
  }

  // Ranked by shared tags and topped up with recent articles, so the block
  // is never empty. Same language only: sending a reader from an article to
  // one they can't read is worse than showing them two.
  const related = relatedPosts(post, listPosts(LOCALE))

  const structuredData = buildArticleStructuredData(post, postUpdatedAt(post))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }}
      />
      <BlogArticle post={post} related={related} />
    </>
  )
}
