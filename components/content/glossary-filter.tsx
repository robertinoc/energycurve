"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"

import { useTypedBeforeHydration } from "@/lib/tools/use-typed-before-hydration"
import type { SiteLocale } from "@/lib/content/site-copy"

export interface GlossaryEntryView {
  id: string
  title: string
  short: string
  href: string
}

export interface GlossaryGroupView {
  letter: string
  terms: GlossaryEntryView[]
}

/**
 * The glossary index, with a filter box.
 *
 * A client component that receives the whole list already grouped, so the
 * server renders every entry into the HTML and the filter only hides rows. A
 * filter that fetched, or that started empty and filled in after hydration,
 * would mean a crawler sees an index of nothing — which is the opposite of what
 * this page is for.
 *
 * The input is controlled, which on this codebase means one specific thing:
 * `useTypedBeforeHydration`. Between the HTML arriving and hydration finishing
 * there is no `onChange`, so anything typed in that window lands in the DOM,
 * React never sees it, and the first render contradicts it — the box shows
 * "camelot" and the list shows everything. That is the #232 bug, and every new
 * controlled input on a public page has to adopt the DOM's answer on mount.
 */
export function GlossaryFilter({
  groups,
  locale,
  label,
  placeholder,
  empty,
  countLabel,
}: {
  groups: GlossaryGroupView[]
  locale: SiteLocale
  label: string
  placeholder: string
  empty: string
  countLabel: string
}) {
  const [query, setQuery] = useState("")
  const inputId = useId()

  useTypedBeforeHydration([[inputId, query, setQuery]])

  const normalized = query.trim().toLocaleLowerCase(locale)

  const filtered = useMemo(() => {
    if (normalized === "") return groups

    return groups
      .map((group) => ({
        letter: group.letter,
        terms: group.terms.filter((term) =>
          `${term.title} ${term.short}`
            .toLocaleLowerCase(locale)
            .includes(normalized)
        ),
      }))
      .filter((group) => group.terms.length > 0)
  }, [groups, normalized, locale])

  const total = filtered.reduce((sum, group) => sum + group.terms.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-[11px] uppercase tracking-[0.16em] text-white/50"
        >
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          data-testid="glossary-filter"
          className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
        />
        <p className="text-xs text-white/50" aria-live="polite">
          {total} {countLabel}
        </p>
      </div>

      {total === 0 ? (
        <p className="text-sm text-white/60" data-testid="glossary-empty">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {filtered.map((group) => (
            <section key={group.letter} className="flex flex-col gap-3">
              <h2
                id={`letra-${group.letter}`}
                className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-white/50"
              >
                {group.letter}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.terms.map((term) => (
                  <li key={term.id}>
                    <Link
                      href={term.href}
                      className="block rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-white/16 hover:bg-white/[0.04]"
                    >
                      <h3 className="font-heading text-base font-semibold text-white">
                        {term.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-white/60">
                        {term.short}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
