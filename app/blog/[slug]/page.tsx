import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BlogArticle } from "@/components/marketing/blog-article"
import { getPost, listPosts } from "@/lib/blog/posts"
import { localizedPath } from "@/lib/content/locale-routing"
import { SITE_URL } from "@/lib/seo"

const LOCALE = "en" as const

/** Every published article, so each one is a static page rather than a render. */
export function generateStaticParams() {
  return listPosts(LOCALE).map((post) => ({ slug: post.slug }))
}

/**
 * Self-canonical, with no `languages` block.
 *
 * An article exists in the language it was written in and no other. Emitting an
 * `hreflang` pair here would advertise a translation that 404s, which is worse for
 * a crawler than offering no alternate at all — see LOCALIZED_PATHS.
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

  const url = `${SITE_URL}${localizedPath(`/blog/${post.slug}`, LOCALE)}`

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      locale: "en_US",
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

  return <BlogArticle post={post} />
}
