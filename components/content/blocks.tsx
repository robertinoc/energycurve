import { ContentCtaLink } from "@/components/content/cta-link"
import { COMPONENT_COPY, CTA_COPY } from "@/lib/content/content-copy"
import type {
  Bilingual,
  ComparisonRow,
  FaqEntry,
  StepEntry,
} from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The plain building blocks: callout, steps, comparison table, FAQ and CTA.
 *
 * All server components, all rendering their text into the HTML. The FAQ is the
 * one with a rule attached — see below.
 */

export function Callout({
  tone,
  title,
  body,
  locale,
}: {
  tone: "note" | "warning"
  title: Bilingual
  body: Bilingual
  locale: SiteLocale
}) {
  const accent =
    tone === "warning"
      ? "border-l-[3px] border-l-ec-amber"
      : "border-l-[3px] border-l-ec-cyan"

  return (
    <aside
      className={`my-6 flex flex-col gap-1.5 rounded-r-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5 ${accent}`}
    >
      <p className="font-heading text-sm font-semibold text-white">
        {title[locale]}
      </p>
      <p className="text-sm leading-6 text-white/64">{body[locale]}</p>
    </aside>
  )
}

export function Pasos({
  steps,
  locale,
}: {
  steps: StepEntry[]
  locale: SiteLocale
}) {
  return (
    <ol className="my-6 flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <span
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/12 font-mono text-xs text-white/70"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-sm font-semibold text-white">
              <span className="sr-only">
                {COMPONENT_COPY.stepLabel[locale]} {index + 1}:{" "}
              </span>
              {step.title[locale]}
            </p>
            <p className="text-sm leading-6 text-white/64">
              {step.body[locale]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * A two-column comparison.
 *
 * A real `<table>` with a `<caption>` and row headers, not a grid of divs: the
 * thing being compared is tabular, and a screen reader that can announce "row:
 * how long it takes, column: reading the curve" is reading the same table a
 * sighted visitor is.
 */
export function Comparacion({
  caption,
  leftHeading,
  rightHeading,
  rows,
  locale,
}: {
  caption: Bilingual
  leftHeading: Bilingual
  rightHeading: Bilingual
  rows: ComparisonRow[]
  locale: SiteLocale
}) {
  return (
    /*
      A scrollable region has to be a keyboard stop, or the only way to read the
      right-hand column on a narrow screen is to drag it.

      Found by the WCAG sweep the moment the comparison pages joined it:
      mobile-safari flagged `scrollable-region-focusable` (serious) on the
      Lexicon page, in both languages, while chromium, webkit and firefox passed
      — at their widths the table fits and nothing scrolls. Lexicon is the one
      that overflows first because its price row is the longest.

      Same three attributes `key-table.tsx` and the import-formats tables
      already carry, for the same reason. `aria-label` rather than
      `aria-labelledby`: this component is used more than once on a page, so a
      shared id would be a duplicate — and the caption is the table's own name.
    */
    <div
      className="my-6 overflow-x-auto rounded-2xl border border-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/45"
      tabIndex={0}
      role="region"
      aria-label={caption[locale]}
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption className="px-4 pt-4 text-left text-[11px] uppercase tracking-[0.16em] text-white/50">
          {caption[locale]}
        </caption>
        <thead>
          <tr className="border-b border-white/8">
            <th scope="col" className="p-4 font-medium text-white/50">
              <span className="sr-only">{caption[locale]}</span>
            </th>
            <th scope="col" className="p-4 font-heading font-semibold text-white">
              {leftHeading[locale]}
            </th>
            <th scope="col" className="p-4 font-heading font-semibold text-white">
              {rightHeading[locale]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/5 last:border-0">
              <th
                scope="row"
                className="p-4 align-top font-medium text-white/72"
              >
                {row.label[locale]}
              </th>
              <td className="p-4 align-top leading-6 text-white/64">
                {row.left[locale]}
              </td>
              <td className="p-4 align-top leading-6 text-white/64">
                {row.right[locale]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Native `<details>`, for the same reason the landing page's FAQ uses it: every
 * answer ships inside the HTML while collapsed, so a crawler and a reader
 * without JavaScript both get the whole answer.
 *
 * The page's `FAQPage` schema is generated from these same entries — see
 * `lib/content/structured-data.ts`. Markup that is built from the rendered copy
 * cannot contradict it, which is the rule `AGENTS.md` sets for the landing FAQ
 * and the reason this component takes its entries rather than a prerendered
 * blob.
 */
export function FAQ({
  entries,
  locale,
}: {
  entries: FaqEntry[]
  locale: SiteLocale
}) {
  return (
    <div className="my-6 flex flex-col gap-2">
      {entries.map((entry, index) => (
        <details
          key={index}
          className="group rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 sm:px-5"
        >
          <summary className="cursor-pointer list-none font-heading text-sm font-semibold text-white marker:hidden">
            {entry.question[locale]}
          </summary>
          <p className="mt-2 text-sm leading-6 text-white/64">
            {entry.answer[locale]}
          </p>
        </details>
      ))}
    </div>
  )
}

export function CTA({
  variant,
  locale,
  page,
}: {
  variant: "tool" | "signup"
  locale: SiteLocale
  /**
   * The path this CTA sits on. Carried into `content_cta_click` so the funnel
   * can tell a reference page apart from an article (SEO-E28) — the question
   * being which kind of page actually sends people to the tool.
   */
  page: string
}) {
  const copy = CTA_COPY[variant]

  return (
    <section className="my-6 flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
      <h3 className="font-heading text-base font-semibold text-white">
        {copy.title[locale]}
      </h3>
      <p className="max-w-xl text-sm leading-6 text-white/64">
        {copy.body[locale]}
      </p>
      {/* Only the anchor is a client component — see `cta-link.tsx`. The words
          above it stay server-rendered, which is the whole point of this block. */}
      <ContentCtaLink
        variant={variant}
        locale={locale}
        page={page}
        label={copy.action[locale]}
      />
    </section>
  )
}
