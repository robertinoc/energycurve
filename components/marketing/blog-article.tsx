import Link from "next/link"

import { BlogShell } from "@/components/marketing/blog-shell"
import { BLOG_COPY, formatPostDate } from "@/lib/content/blog-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { BlogPost } from "@/lib/blog/posts"

/**
 * One article.
 *
 * `dangerouslySetInnerHTML` is load-bearing and safe here for a specific reason:
 * the HTML comes from `renderMarkdown` over a file in this repository, which
 * escapes its input and refuses every construct outside a small subset. There is
 * no path from a user to this string. If that ever changes — a CMS, user
 * submissions — this is the line that has to change with it.
 */
export function BlogArticle({ post }: { post: BlogPost }) {
  return (
    <BlogShell locale={post.locale}>
      <article className="flex flex-col gap-5">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            {BLOG_COPY.publishedOn[post.locale]}{" "}
            {formatPostDate(post.publishedAt!, post.locale)}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
            {post.title}
          </h1>
        </header>

        <div
          className="ec-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        <nav className="border-t border-white/8 pt-6">
          <Link
            href={localizedPath("/blog", post.locale)}
            className="text-sm text-white/60 transition hover:text-white"
          >
            ← {BLOG_COPY.backToIndex[post.locale]}
          </Link>
        </nav>
      </article>
    </BlogShell>
  )
}
