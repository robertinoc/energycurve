import Link from "next/link"

import { BlogShell } from "@/components/marketing/blog-shell"
import { BlogTagFilter } from "@/components/marketing/blog-tag-filter"
import { BLOG_COPY } from "@/lib/content/blog-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import { normalizeTag, tagsInUse, type BlogPost } from "@/lib/blog/posts"

/**
 * The article list for one language.
 *
 * A server component holding a client shell: the posts are read from disk, and
 * the only interactive thing on the page is the language toggle inside the shell.
 */
export function BlogIndex({
  posts,
  locale,
}: {
  posts: BlogPost[]
  locale: SiteLocale
}) {
  return (
    <BlogShell locale={locale}>
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {BLOG_COPY.heading[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">
          {BLOG_COPY.intro[locale]}
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <p className="max-w-2xl text-sm leading-7 text-white/64">
            {BLOG_COPY.emptyEn[locale]}
          </p>
          <Link
            href={localizedPath("/blog", "es")}
            className="inline-flex text-sm font-semibold text-ec-cyan underline-offset-4 hover:underline"
          >
            {BLOG_COPY.readSpanish[locale]}
          </Link>
        </div>
      ) : (
        /* The cards are built here, on the server, and handed to the filter as
           data. The client component decides what to hide; it never decides
           what exists. */
        <BlogTagFilter
          locale={locale}
          tags={tagsInUse(posts)}
          posts={posts.map((post) => ({
            slug: post.slug,
            href: localizedPath(`/blog/${post.slug}`, post.locale),
            title: post.title,
            description: post.description,
            publishedAt: post.publishedAt!,
            tags: post.tags.map(normalizeTag),
            tagLabels: post.tags,
          }))}
        />
      )}
    </BlogShell>
  )
}
