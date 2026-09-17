import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BlogArticle } from "@/components/marketing/blog-article"
import { buildArticleStructuredData } from "@/lib/blog/structured-data"
import { getPost, listPosts, postUpdatedAt } from "@/lib/blog/posts"
import { localizedPath } from "@/lib/content/locale-routing"
import {
  openGraphLocale,
  serializeStructuredData,
  SITE_URL,
  SOCIAL_IMAGES,
} from "@/lib/seo"

const LOCALE = "es" as const

/** Every published article, so each one is a static page rather than a render. */
export function generateStaticParams() {
  return listPosts(LOCALE).map((post) => ({ slug: post.slug }))
}

/**
 * Self-canonical, and an `hreflang` set naming exactly one language: this one.
 *
 * An article exists in the language it was written in and no other, so there is
 * no pair to declare. It used to carry no `alternates.languages` at all, on the
 * reasoning that advertising a translation that 404s is worse than advertising
 * none — true, and it threw out the half that was safe to say. A self-referencing
 * `hreflang` is the documented way to state "this page is in es, and that is
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

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: url,
      languages: { es: path },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: postUpdatedAt(post),
      locale: openGraphLocale(LOCALE),
      images: SOCIAL_IMAGES,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: SOCIAL_IMAGES,
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

  // Newest first already, so "the three most recent others" is a filter and a
  // slice. Same language only: sending a reader from an article to one they
  // can't read is worse than showing them two.
  const related = listPosts(LOCALE)
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3)

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
