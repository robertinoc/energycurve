"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"

import { BLOG_COPY, formatPostDate } from "@/lib/content/blog-copy"
import { useTypedBeforeHydration } from "@/lib/tools/use-typed-before-hydration"
import type { SiteLocale } from "@/lib/content/site-copy"

export interface BlogCardView {
  slug: string
  href: string
  title: string
  description: string
  publishedAt: string
  /** Lower-cased, for comparison. `tagLabels` is what a reader sees. */
  tags: string[]
  tagLabels: string[]
}

/**
 * The article list with a topic filter — SEO-E16.
 *
 * Every article is rendered into the HTML by the server and the filter only
 * hides rows, the same arrangement `GlossaryFilter` uses and for the same
 * reason: a filter that fetched, or that started empty and filled in after
 * hydration, would leave a crawler reading an index of nothing on the page whose
 * whole job is to list what exists.
 *
 * A native `<select>` rather than a row of buttons. Buttons carry no value in
 * the DOM, so a click before hydration is simply lost with nothing to recover;
 * a `<select>` keeps the visitor's answer where `useTypedBeforeHydration` can
 * find it. That hook is the #232 fix and it now covers selects — see the note
 * there. One gesture opens and picks from a native dropdown, so this control is
 * *more* likely than a text box to be used inside the pre-hydration window, not
 * less.
 */
export function BlogTagFilter({
  posts,
  tags,
  locale,
}: {
  posts: BlogCardView[]
  /** Reader-facing labels, most used first. */
  tags: string[]
  locale: SiteLocale
}) {
  const [tag, setTag] = useState("")
  const selectId = useId()

  useTypedBeforeHydration([[selectId, tag, setTag]])

  const filtered = useMemo(() => {
    if (tag === "") return posts

    return posts.filter((post) => post.tags.includes(tag))
  }, [posts, tag])

  return (
    <div className="flex flex-col gap-6">
      {tags.length > 0 ? (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor={selectId}
              className="text-[11px] uppercase tracking-[0.16em] text-white/50"
            >
              {BLOG_COPY.filterLabel[locale]}
            </label>
            <select
              id={selectId}
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              data-testid="blog-tag-filter"
              className="rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="">{BLOG_COPY.filterAll[locale]}</option>
              {tags.map((label) => (
                <option key={label} value={label.toLocaleLowerCase()}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <p className="pb-3 text-xs text-white/50" aria-live="polite">
            {filtered.length} {BLOG_COPY.filterCount[locale]}
          </p>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-white/60" data-testid="blog-filter-empty">
          {BLOG_COPY.filterEmpty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((post) => (
            <li key={post.slug}>
              <Link
                href={post.href}
                className="block rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  {formatPostDate(post.publishedAt, locale)}
                </p>
                <h2 className="mt-1.5 font-heading text-lg font-semibold leading-snug text-white">
                  {post.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-white/60">
                  {post.description}
                </p>
                {post.tagLabels.length > 0 ? (
                  <p className="mt-2.5 flex flex-wrap gap-1.5">
                    {post.tagLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-white/55"
                      >
                        {label}
                      </span>
                    ))}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
