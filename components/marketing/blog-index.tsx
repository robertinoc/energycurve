import Link from "next/link"

import { BlogShell } from "@/components/marketing/blog-shell"
import { BLOG_COPY, formatPostDate } from "@/lib/content/blog-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { BlogPost } from "@/lib/blog/posts"

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
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={localizedPath(`/blog/${post.slug}`, post.locale)}
                className="block rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                  {formatPostDate(post.publishedAt!, locale)}
                </p>
                <h2 className="mt-1.5 font-heading text-lg font-semibold leading-snug text-white">
                  {post.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-white/60">
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BlogShell>
  )
}
