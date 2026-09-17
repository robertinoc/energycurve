"use client"

import { useMemo, useState } from "react"

import { WHEEL_COPY } from "@/lib/content/harmonic-tools-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

export interface KeyTableRow {
  camelot: string
  openKey: string
  abbreviation: string
  spoken: string
}

/**
 * The 24 keys in all four notations, filterable.
 *
 * A client component, and still **entirely present in the server's HTML** —
 * which is the requirement, and is worth stating because it looks like a
 * contradiction. Next renders client components on the server for the first
 * paint, so all 24 rows are in the document a crawler (or a browser with no JS,
 * or a phone on a dead connection in a booth) receives. The filter is the only
 * thing that needs the client, and it degrades to "no filter", not to "no
 * table".
 *
 * The rows are computed on the server from the engine's own converters and
 * passed in, so this file holds no key data to fall out of sync.
 */
export function KeyTable({
  locale,
  rows,
}: {
  locale: SiteLocale
  rows: KeyTableRow[]
}) {
  const copy = WHEEL_COPY.ui
  const [query, setQuery] = useState("")

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return rows
    }

    return rows.filter((row) =>
      [row.camelot, row.openKey, row.abbreviation, row.spoken].some((value) =>
        value.toLowerCase().includes(needle)
      )
    )
  }, [query, rows])

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold text-white">
          {copy.tableTitle[locale]}
        </h2>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="key-filter"
            className="text-xs font-semibold text-white/60"
          >
            {copy.search[locale]}
          </label>
          <input
            id="key-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder[locale]}
            className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-ec-cyan focus:outline-none"
            data-testid="key-filter"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.14em] text-white/55">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.colCamelot[locale]}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.colMusical[locale]}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.colShort[locale]}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.colOpenKey[locale]}
              </th>
            </tr>
          </thead>
          <tbody data-testid="key-table-body">
            {visible.map((row) => (
              <tr key={row.camelot} className="border-t border-white/6">
                <th
                  scope="row"
                  className="px-3 py-2 font-mono font-bold text-white"
                >
                  {row.camelot}
                </th>
                <td className="px-3 py-2 text-white/70">{row.spoken}</td>
                <td className="px-3 py-2 font-mono text-white/70">
                  {row.abbreviation}
                </td>
                <td className="px-3 py-2 font-mono text-white/70">
                  {row.openKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-white/50">{copy.noMatches[locale]}</p>
      )}
    </section>
  )
}
