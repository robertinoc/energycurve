import Link from "next/link"

import { Block } from "@/components/content/prose"
import { linkGlossaryTerms } from "@/lib/blog/link-terms"
import { BlogShell } from "@/components/marketing/blog-shell"
import { CTAButton } from "@/components/marketing/cta-button"
import { BLOG_COPY, formatPostDate } from "@/lib/content/blog-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { BlogPost } from "@/lib/blog/posts"

/**
 * The three other articles offered at the end of one.
 *
 * Same card treatment as the index — same border, same radius, same hover — so
 * the two places a reader picks an article look like the same place. Rendered
 * from whatever the page passes, which is already filtered to the same language
 * and capped at three.
 */
function KeepReading({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) {
    return null
  }

  const locale = posts[0].locale

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold text-white">
        {BLOG_COPY.keepReading[locale]}
      </h2>

      <ul className="flex flex-col gap-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={localizedPath(`/blog/${post.slug}`, post.locale)}
              className="block rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                {formatPostDate(post.publishedAt!, post.locale)}
              </p>
              <h3 className="mt-1.5 font-heading text-base font-semibold leading-snug text-white">
                {post.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-white/60">
                {post.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The one thing to do after reading.
 *
 * No heading above the button: the button already says "Analizá tu set gratis",
 * and a heading repeating it word for word is the same sentence twice in a card
 * six lines tall.
 */
function ArticleCta({ locale }: { locale: BlogPost["locale"] }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <p className="max-w-xl text-sm leading-7 text-white/64">
        {BLOG_COPY.ctaBody[locale]}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <CTAButton href="/signup">{BLOG_COPY.ctaTitle[locale]}</CTAButton>
        <Link
          href={localizedPath("/tools/energy-curve", locale)}
          className="text-sm text-ec-cyan underline-offset-4 hover:underline"
        >
          {BLOG_COPY.ctaTool[locale]}
        </Link>
      </div>
    </section>
  )
}

export function BlogArticle({
  post,
  related = [],
}: {
  post: BlogPost
  /** Other articles in the same language, newest first, current one excluded. */
  related?: BlogPost[]
}) {
  return (
    <BlogShell locale={post.locale}>
      <article className="flex flex-col gap-5">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {BLOG_COPY.publishedOn[post.locale]}{" "}
            {formatPostDate(post.publishedAt!, post.locale)}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
            {post.title}
          </h1>
        </header>

        {/* .ec-prose styles the bare elements the blocks render into, so the
            parser stays free of presentation and the CSS stays in one place.

            The glossary links are added here rather than in the `.md`: the
            articles are not edited, and the first mention of each term is
            turned into a link on the parsed nodes. See lib/blog/link-terms.ts. */}
        <div className="ec-prose">
          {linkGlossaryTerms(post.blocks, post.locale).map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>

        <div className="flex flex-col gap-8 border-t border-white/8 pt-8">
          <KeepReading posts={related} />
          <ArticleCta locale={post.locale} />

          <nav>
            <Link
              href={localizedPath("/blog", post.locale)}
              className="text-sm text-white/60 transition hover:text-white"
            >
              ← {BLOG_COPY.backToIndex[post.locale]}
            </Link>
          </nav>
        </div>
      </article>
    </BlogShell>
  )
}
