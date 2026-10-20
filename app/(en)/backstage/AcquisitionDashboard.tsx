"use client"

import { useMemo } from "react"

import {
  MIN_PAID_FOR_SOURCE_SPLIT,
  MIN_SAMPLE_FOR_MEDIAN,
  MIN_SAMPLE_FOR_RATE,
  TOOL_LABELS,
  UNKNOWN_SOURCE,
  cohortsBySource,
  conversionBySource,
  firstAnalysisTiming,
  paidConversion,
  signupsByToolLanding,
  type BackstageAcquisitionStatus,
  type Ratio,
  type ToolUsage,
  type UnknownReason,
} from "@/lib/backstage/acquisition"
import type { BackstageUserRow } from "@/lib/backstage/users"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * Where users come from and what they do next (lote 20, tasks 4–8).
 *
 * The rules are in lib/backstage/acquisition.ts and they show here: every
 * number names what it is out of, "Unknown" is the first column and the first
 * row and is split by why, and below the declared minimum a rate reads "too
 * few" instead of a percentage. The measurement is partial by design — the
 * consent banner and Do Not Track decide who is measured — and the header says
 * so before any number does.
 */

/** Columns before the rest are folded into "other sources". */
const VISIBLE_SOURCES = 7

const UNKNOWN_REASON_LABELS: Record<UnknownReason, string> = {
  not_measured: "not measured in this environment",
  before_measurement: "signed up before the measurement started",
  no_touch: "signed up after, with no first touch (no analytics consent, or lost on the way)",
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function sourceLabel(source: string): string {
  return source === UNKNOWN_SOURCE ? "Unknown" : source
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

/** "12 of 40 · 30%", or "3 of 4 · too few for a rate (needs 20)". */
function RatioText({ value }: { value: Ratio }) {
  return (
    <span className="font-mono text-[12px]">
      <strong className="text-white">{value.count}</strong>
      <span className="text-white/60"> of {value.of}</span>
      {value.rate === null ? (
        <span className="text-white/45">
          {" "}
          · too few for a rate (needs {MIN_SAMPLE_FOR_RATE})
        </span>
      ) : (
        <span className="text-white/80"> · {percent(value.rate)}</span>
      )}
    </span>
  )
}

function duration(hours: number | null, n: number): string {
  if (hours === null) {
    return `too few to say (${n} of the ${MIN_SAMPLE_FOR_MEDIAN} needed)`
  }

  return hours < 48 ? `${Math.round(hours)} h` : `${Math.round(hours / 24)} days`
}

function MeasurementHeader({
  acquisition,
}: {
  acquisition: BackstageAcquisitionStatus
}) {
  const { measurement, counts } = acquisition

  if (!measurement.available) {
    return (
      <p className="rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/[0.06] p-4 text-[13px] leading-6 text-white/80">
        <strong className="text-white">Not measured in this environment.</strong>{" "}
        Migration 0034 (<code>profiles.first_touch_*</code>) is not applied here,
        so every signup below is <strong>Unknown</strong> — not &ldquo;direct&rdquo;.
        What does not need a source (first analysis, Free → Pro) still counts.
      </p>
    )
  }

  return (
    <p className="text-[13px] leading-6 text-white/70">
      {measurement.since ? (
        <>
          First touch measured since{" "}
          <strong className="text-white">
            {dateFormat.format(new Date(measurement.since))}
          </strong>{" "}
          (the first one recorded).{" "}
        </>
      ) : (
        <>Ready to measure; no first touch recorded yet. </>
      )}
      {counts.recordedTouches !== null && counts.profiles !== null ? (
        <>
          <strong className="text-white">{counts.recordedTouches}</strong> of{" "}
          {counts.profiles} signups have one, counted by the database.{" "}
        </>
      ) : null}
      Partial by design: only visitors who accept analytics are measured, Do
      Not Track counts as no, and everyone else is <strong>Unknown</strong>.
    </p>
  )
}

function CohortPanel({ table }: { table: ReturnType<typeof cohortsBySource> }) {
  const shown = table.sources.slice(0, VISIBLE_SOURCES)
  const folded = table.sources.slice(VISIBLE_SOURCES)

  return (
    <Bento tone="panel" className="space-y-3 p-5">
      <BentoLabel>Signups by source · weekly cohorts</BentoLabel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
          <caption className="sr-only">
            Users by first-touch source, per week of signup
          </caption>
          <thead>
            <tr className="text-white/55">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Week of
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                Signups
              </th>
              {shown.map((source) => (
                <th key={source} scope="col" className="py-1.5 pr-3 text-right font-medium">
                  {sourceLabel(source)}
                </th>
              ))}
              {folded.length > 0 ? (
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                  {folded.length} other sources
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.week} className="border-t border-white/[0.06]">
                <th scope="row" className="py-1.5 pr-3 font-mono font-normal text-white/75">
                  {row.week === "earlier" ? "Earlier" : row.week}
                </th>
                <td className="py-1.5 pr-3 text-right font-mono text-white">{row.total}</td>
                {shown.map((source) => (
                  <td key={source} className="py-1.5 pr-3 text-right font-mono text-white/80">
                    {row.bySource[source] ?? 0}
                  </td>
                ))}
                {folded.length > 0 ? (
                  <td className="py-1.5 pr-3 text-right font-mono text-white/80">
                    {folded.reduce((sum, source) => sum + (row.bySource[source] ?? 0), 0)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-0.5 text-[12px] text-white/55">
        {(Object.keys(UNKNOWN_REASON_LABELS) as UnknownReason[])
          .filter((reason) => table.unknownByReason[reason] > 0)
          .map((reason) => (
            <li key={reason}>
              Unknown ·{" "}
              <strong className="text-white/85">{table.unknownByReason[reason]}</strong> of{" "}
              {table.total}: {UNKNOWN_REASON_LABELS[reason]}
            </li>
          ))}
      </ul>
    </Bento>
  )
}

function ConversionPanel({ data }: { data: ReturnType<typeof conversionBySource> }) {
  return (
    <Bento tone="panel" className="space-y-3 p-5">
      <BentoLabel>Signup → first analysis, by source</BentoLabel>
      <p className="text-[12px] text-white/50">
        Users who ran at least one analysis, out of the signups from that
        source. No rate under {MIN_SAMPLE_FOR_RATE} signups.
      </p>
      <ul className="space-y-1.5">
        {data.rows.map((row) => (
          <li key={row.source} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-white/80">{sourceLabel(row.source)}</span>
            <RatioText value={row.analysed} />
          </li>
        ))}
      </ul>
      <p className="border-t border-white/[0.06] pt-2 text-[12.5px] text-white/70">
        All signups: <RatioText value={data.overall} />
      </p>
    </Bento>
  )
}

function ToolsPanel({
  landings,
  usage,
}: {
  landings: ReturnType<typeof signupsByToolLanding>
  usage: ToolUsage | null
}) {
  const usageByTool = new Map(usage?.rows.map((row) => [row.tool, row]))

  return (
    <Bento tone="panel" className="space-y-3 p-5">
      <BentoLabel>The free tools as a bridge</BentoLabel>
      <p className="text-[12px] leading-5 text-white/50">
        Two different counts, side by side and never divided into each other.{" "}
        <strong className="text-white/70">Used</strong> comes from PostHog
        {usage ? `, last ${usage.windowDays} days,` : ""} and covers only visitors
        who accepted analytics. <strong className="text-white/70">Landed first</strong>{" "}
        is our own first touch: the signup&rsquo;s first page was that tool, which
        is not the same as using it. &ldquo;After&rdquo; means after, not because of.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
          <caption className="sr-only">Free tool use and signups</caption>
          <thead>
            <tr className="text-white/55">
              <th scope="col" className="py-1.5 pr-3 font-medium">Tool</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Used</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                Signed up after
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                Landed first, signed up
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                …and analysed
              </th>
            </tr>
          </thead>
          <tbody>
            {landings.rows.map((row) => {
              const used = usageByTool.get(row.tool)

              return (
                <tr key={row.tool} className="border-t border-white/[0.06]">
                  <th scope="row" className="py-1.5 pr-3 font-normal text-white/80">
                    {TOOL_LABELS[row.tool]}
                  </th>
                  <td className="py-1.5 pr-3 text-right font-mono text-white/80">
                    {used ? used.users : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-white/80">
                    {used ? `${used.signedUpAfter} of ${used.users}` : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-white/80">
                    {row.signups} of {landings.withLanding}
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    <RatioText value={row.analysed} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {usage ? null : (
        <p className="text-[12px] text-white/45">
          &ldquo;Used&rdquo; is empty because PostHog reporting is not configured
          here (POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID) or the query
          failed — not because nobody used a tool.
        </p>
      )}
    </Bento>
  )
}

function PaidPanel({ data }: { data: ReturnType<typeof paidConversion> }) {
  return (
    <Bento tone="accent" className="space-y-3 p-5">
      <BentoLabel>Free → Pro</BentoLabel>
      <p className="text-[13px] text-white/80">
        With a completed checkout: <RatioText value={data.paid} />
      </p>
      <p className="text-[13px] text-white/80">
        Median time to convert:{" "}
        <strong className="font-mono text-white">
          {data.medianDays === null
            ? `too few to say (${data.paid.count} of the ${MIN_SAMPLE_FOR_MEDIAN} needed)`
            : `${Math.round(data.medianDays)} days`}
        </strong>
        {data.medianDays === null ? null : (
          <span className="text-white/55"> · over {data.paid.count} conversions</span>
        )}
      </p>
      {data.paidWithoutCheckout > 0 ? (
        <p className="text-[12px] text-white/55">
          {data.paidWithoutCheckout} more on a paid plan with no checkout on
          record (granted by hand, or paid before the event log) — not counted
          above.
        </p>
      ) : null}
      {data.bySource ? (
        <ul className="space-y-1 border-t border-white/[0.06] pt-2 text-[12.5px]">
          {data.bySource.map((row) => (
            <li key={row.source} className="flex justify-between gap-3">
              <span className="text-white/80">{sourceLabel(row.source)}</span>
              <span className="font-mono text-white/70">
                {row.paid} · {row.medianDays === null ? "median: too few" : `median ${Math.round(row.medianDays)} days`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-white/[0.06] pt-2 text-[12px] text-white/55">
          Not split by source: {data.paidWithKnownSource} paid conversions have a
          known source, and a split needs {MIN_PAID_FOR_SOURCE_SPLIT}.
        </p>
      )}
    </Bento>
  )
}

function FirstAnalysisPanel({ data }: { data: ReturnType<typeof firstAnalysisTiming> }) {
  return (
    <Bento tone="panel" className="space-y-3 p-5">
      <BentoLabel>Time to first analysis</BentoLabel>
      <p className="text-[13px] text-white/80">
        Reached one: <RatioText value={data.reached} />
      </p>
      <p className="text-[13px] text-white/80">
        Median after signup:{" "}
        <strong className="font-mono text-white">
          {duration(data.medianHours, data.reached.count)}
        </strong>
      </p>
      <p className="text-[12.5px] leading-5 text-white/65">
        <strong className="text-white">{data.never}</strong> never got there:{" "}
        {data.neverUsed} are the &ldquo;Never used&rdquo; card above (no
        playlist, no analysis), {data.importedOnly} imported a set and stopped
        {data.suspended > 0 ? `, ${data.suspended} are suspended` : ""}.
      </p>
      <p className="text-[11.5px] text-white/45">
        Counted from the analyses that exist today: deleting a set deletes its
        analyses, so someone who analysed and then deleted everything reads as
        never.
      </p>
    </Bento>
  )
}

export function AcquisitionDashboard({
  users,
  acquisition,
  toolUsage,
}: {
  users: BackstageUserRow[]
  acquisition: BackstageAcquisitionStatus
  toolUsage: ToolUsage | null
}) {
  // Fixed at mount, like the cohort dashboard above it.
  const now = useMemo(() => new Date(), [])
  const inputs = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        createdAt: user.createdAt,
        plan: user.plan,
        firstTouchSource: user.firstTouchSource,
        firstTouchMedium: user.firstTouchMedium,
        firstTouchLanding: user.firstTouchLanding,
        firstAnalysisAt: user.firstAnalysisAt,
        paidAt: user.paidAt,
      })),
    [users]
  )

  const cohorts = useMemo(
    () => cohortsBySource(inputs, acquisition.measurement, now),
    [inputs, acquisition.measurement, now]
  )
  const conversion = useMemo(() => conversionBySource(inputs), [inputs])
  const landings = useMemo(() => signupsByToolLanding(inputs), [inputs])
  const paid = useMemo(() => paidConversion(inputs), [inputs])
  const timing = useMemo(() => firstAnalysisTiming(users, now), [users, now])

  return (
    <section className="space-y-5" aria-labelledby="acquisition-heading">
      <div className="space-y-1">
        <h2 id="acquisition-heading" className="font-heading text-xl font-bold">
          Where they come from, and what they do next
        </h2>
        <MeasurementHeader acquisition={acquisition} />
      </div>

      <CohortPanel table={cohorts} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ConversionPanel data={conversion} />
        <FirstAnalysisPanel data={timing} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ToolsPanel landings={landings} usage={toolUsage} />
        {acquisition.paidLogAvailable ? (
          <PaidPanel data={paid} />
        ) : (
          <Bento tone="panel" className="p-5 text-[13px] text-white/70">
            <BentoLabel>Free → Pro</BentoLabel>
            <p className="mt-2">
              The checkout log (billing_events) could not be read, so there is
              no conversion count — which is not the same as zero.
            </p>
          </Bento>
        )}
      </div>
    </section>
  )
}
