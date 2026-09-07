"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Info, Minus, TriangleAlert, X } from "lucide-react"

import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  COVERAGE_METRICS,
  coverageStatus,
  formatIsLimited,
  type CoverageMetric,
  type ImportCoverage,
} from "@/lib/playlists/import-coverage"

const COPY = DASHBOARD_COPY.importSummary

/** Human names for the tag fields the energy reader looks at. */
const FIELD_LABELS: Record<string, string> = {
  energy_frame: "ENERGY",
  comment: "comment",
  comment2: "comment 2",
  grouping: "grouping",
  lyrics: "lyrics",
  producer: "producer",
  composer: "composer",
  label: "label",
}

/**
 * Said once, right after an import: what came through and what didn't.
 *
 * The distinction that matters is between "your library doesn't have this" and
 * "this file format cannot express this". An alpha user hit the second case
 * with an M3U8, was told nothing, and concluded the reader was broken. A zero
 * with no explanation is the defect; a zero with a reason is information.
 */
export function ImportSummary({
  coverage,
  importSource,
  locale,
}: {
  coverage: ImportCoverage
  importSource: string | null
  locale: SiteLocale
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || coverage.tracks === 0) {
    return null
  }

  const noEnergy = coverage.counts.energy === 0
  const energyUnsupported =
    coverageStatus(coverage, "energy", importSource) === "unsupported"

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-2">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-white/40" />
        <h2 className="text-[12.5px] font-medium text-white/82">
          {COPY.title[locale]}
        </h2>
        <span className="text-[12.5px] text-white/44">
          {formatTemplate(COPY.tracks[locale], { count: coverage.tracks })}
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={COPY.dismiss[locale]}
          className="ml-auto rounded-md p-0.5 text-white/38 transition hover:bg-white/[0.06] hover:text-white/70"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {COVERAGE_METRICS.map((metric) => (
          <MetricPill
            key={metric}
            metric={metric}
            coverage={coverage}
            importSource={importSource}
            locale={locale}
          />
        ))}
      </dl>

      {formatIsLimited(importSource) ? (
        <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11.5px] leading-5 text-white/56">
          {COPY.m3u8Note[locale]}
        </p>
      ) : null}

      {coverage.energyFields.length > 0 ? (
        <p className="mt-3 text-[11.5px] leading-5 text-white/56">
          {coverage.energyFields.length === 1
            ? formatTemplate(COPY.energyFrom[locale], {
                field:
                  FIELD_LABELS[coverage.energyFields[0].field] ??
                  coverage.energyFields[0].field,
              })
            : formatTemplate(COPY.energyFromMixed[locale], {
                fields: coverage.energyFields
                  .map(
                    (entry) =>
                      `${FIELD_LABELS[entry.field] ?? entry.field} (${entry.count})`
                  )
                  .join(", "),
              })}
        </p>
      ) : null}

      {noEnergy && !energyUnsupported ? (
        <div className="mt-3 border-t border-white/[0.07] pt-3">
          <p className="flex items-start gap-1.5 text-[11.5px] font-medium leading-5 text-[#F5C15E]">
            <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
            {COPY.noEnergyTitle[locale]}
          </p>
          <p className="mt-1 text-[11.5px] leading-5 text-white/56">
            {COPY.noEnergyBody[locale]}
          </p>
        </div>
      ) : null}

      {noEnergy ? (
        <Link
          href={localizedPath("/energy-tags", locale)}
          className="mt-2 inline-block text-[11.5px] font-medium text-[#C79BF0] underline decoration-white/20 underline-offset-2 transition hover:text-white"
        >
          {COPY.energyDocsLink[locale]} →
        </Link>
      ) : null}
    </section>
  )
}

function MetricPill({
  metric,
  coverage,
  importSource,
  locale,
}: {
  metric: CoverageMetric
  coverage: ImportCoverage
  importSource: string | null
  locale: SiteLocale
}) {
  const status = coverageStatus(coverage, metric, importSource)
  const count = coverage.counts[metric]

  const value =
    status === "unsupported"
      ? COPY.unsupported[locale]
      : status === "full"
        ? formatTemplate(COPY.all[locale], { total: coverage.tracks })
        : status === "none"
          ? COPY.none[locale]
          : formatTemplate(COPY.ofTracks[locale], {
              count,
              total: coverage.tracks,
            })

  return (
    <div className="flex items-center gap-1.5">
      {status === "full" ? (
        <Check aria-hidden className="size-3 shrink-0 text-[#86EFAC]" />
      ) : (
        <Minus aria-hidden className="size-3 shrink-0 text-white/26" />
      )}
      <dt className="text-[11.5px] text-white/54">{COPY[metric][locale]}</dt>
      <dd
        className={
          status === "full"
            ? "font-mono text-[11.5px] text-white/82"
            : status === "unsupported"
              ? "text-[11.5px] italic text-white/40"
              : "font-mono text-[11.5px] text-white/60"
        }
      >
        {value}
      </dd>
    </div>
  )
}
