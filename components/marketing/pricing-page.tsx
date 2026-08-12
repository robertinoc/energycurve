"use client"

import Link from "next/link"
import { Check, CreditCard, Minus } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import {
  getSiteCopy,
  type ResolvedPlanCell,
  type SiteLocale,
} from "@/lib/content/site-copy"
import { useIsClient } from "@/lib/use-is-client"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "energycurve:locale"

interface CellLabels {
  soon: string
  included: string
  notIncluded: string
}

function PlanCellValue({
  cell,
  labels,
}: {
  cell: ResolvedPlanCell
  labels: CellLabels
}) {
  // Icons carry a text label for screen readers — a bare check in a table
  // cell reads as nothing at all.
  if (cell.kind === "yes") {
    return (
      <>
        <Check aria-hidden className="mx-auto size-4 text-[#5EE9B5]" />
        <span className="sr-only">{labels.included}</span>
      </>
    )
  }

  if (cell.kind === "no") {
    return (
      <>
        <Minus aria-hidden className="mx-auto size-4 text-white/22" />
        <span className="sr-only">{labels.notIncluded}</span>
      </>
    )
  }

  if (cell.kind === "soon") {
    return (
      <span className="inline-flex rounded-full border border-[#F5A524]/34 bg-[#F5A524]/12 px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#F5C15E]">
        {labels.soon}
      </span>
    )
  }

  return <span className="text-white/78">{cell.text}</span>
}

export function PricingPage() {
  // Resolve the stored locale only after hydration so the SSR output ("en")
  // always matches the first client render.
  const isClient = useIsClient()
  const locale: SiteLocale =
    isClient && window.localStorage.getItem(STORAGE_KEY) === "es" ? "es" : "en"

  const copy = getSiteCopy(locale).pricing
  const cellLabels = {
    soon: copy.soonBadge,
    included: copy.included,
    notIncluded: copy.notIncluded,
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08050F] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_50%_0%,rgba(162,77,224,0.26),transparent_40%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.09),transparent_28%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-16 pt-12">
        <Link href="/" className="w-fit">
          <EnergyCurveLogo kind="horizontal" size="md" tone="light" />
        </Link>

        <header className="max-w-3xl">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-semibold leading-tight sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/68">{copy.subtitle}</p>
        </header>

        {/* Plan cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {copy.plans.map((plan) => (
            <section
              key={plan.id}
              className={cn(
                "flex flex-col rounded-3xl border p-6",
                plan.live
                  ? "border-[#A24DE0]/34 bg-[linear-gradient(165deg,rgba(162,77,224,0.14),rgba(20,16,31,0.9))]"
                  : "border-white/10 bg-[#14101F]/80"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-xl font-semibold">{plan.name}</h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[0.66rem] font-medium uppercase tracking-[0.12em]",
                    plan.live
                      ? "border border-[#5EE9B5]/34 bg-[#5EE9B5]/12 text-[#7DF0C4]"
                      : "border border-[#F5A524]/34 bg-[#F5A524]/12 text-[#F5C15E]"
                  )}
                >
                  {plan.live ? copy.liveBadge : copy.soonBadge}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-heading text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                {plan.annual ? (
                  <span className="text-sm text-white/50">{copy.perMonth}</span>
                ) : null}
              </div>
              {plan.annual ? (
                <p className="mt-1.5 text-sm text-white/50">
                  {copy.annualPrefix} {plan.annual}
                </p>
              ) : null}

              <p className="mt-4 text-sm leading-6 text-white/62">{plan.tagline}</p>

              <ul className="mt-5 grid flex-1 gap-2.5">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-sm leading-6 text-white/78">
                    <Check
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-[#5EE9B5]"
                    />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={cn(
                  "mt-6 rounded-full px-6 py-3 text-center text-sm font-semibold transition",
                  plan.live
                    ? "ec-gradient-bg text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)] hover:opacity-95"
                    : "border border-white/20 text-white/82 hover:border-white/40 hover:text-white"
                )}
              >
                {plan.cta}
              </Link>
            </section>
          ))}
        </div>

        {/* Comparison matrix */}
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold">{copy.matrixTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-white/54">{copy.matrixLegend}</p>
          </div>

          {/* Wide table scrolls inside itself rather than the page. */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#14101F]/60">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th scope="col" className="px-4 py-3 font-medium text-white/54">
                    {copy.columnCapability}
                  </th>
                  {copy.plans.map((plan) => (
                    <th
                      key={plan.id}
                      scope="col"
                      className="px-4 py-3 text-center font-heading font-semibold text-white"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {copy.rows.map((row) => (
                  <tr
                    key={row.capability}
                    className="border-b border-white/6 last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 text-left font-normal text-white/72"
                    >
                      {row.capability}
                    </th>
                    <td className="px-4 py-3 text-center">
                      <PlanCellValue cell={row.free} labels={cellLabels} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PlanCellValue cell={row.pro} labels={cellLabels} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PlanCellValue cell={row.proPlus} labels={cellLabels} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Billing transparency — said before Stripe says it. */}
        <section className="rounded-3xl border border-white/12 bg-black/24 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
              <CreditCard aria-hidden className="size-5 text-white/66" />
            </div>
            <h2 className="font-heading text-lg font-semibold">{copy.billingTitle}</h2>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/64">
            {copy.billingBody}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#14101F]/60 p-6">
          <h2 className="font-heading text-lg font-semibold">{copy.questionsTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/64">
            {copy.questionsBody}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#faq"
              className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white/82 transition hover:border-white/40 hover:text-white"
            >
              {copy.questionsCta}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/12 px-6 py-3 text-center text-sm font-semibold text-white/62 transition hover:border-white/30 hover:text-white"
            >
              {copy.backHome}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
