import { AlertTriangle, Sparkles } from "lucide-react"

import type {
  SmartOrderHealth,
  SmartOrderSummary,
  StructuralReason,
} from "@/lib/backstage/smart-order-health"
import type { SmartOrderFallbackReason } from "@/lib/smart-order/stream"

/**
 * Is smart ordering working? The first thing on the Users page.
 *
 * Smart ordering fell back to the heuristic for weeks because the Anthropic
 * account had no credit, and nothing here said so. An outage reason that won't
 * clear on its own is rendered as an alarm, not as a row in a table: it is the
 * feature that carries the paid plans.
 *
 * Server component, no state: everything comes from `smartOrderHealth`.
 */

/** What to do, per outage. Read by the operator, so it can name the invoice. */
const DOWN_COPY: Record<StructuralReason, { title: string; action: string }> = {
  unfunded: {
    title: "Smart ordering is down: the Anthropic account has no credit",
    action:
      "Top up the account in the Anthropic console (Plans & Billing). Nothing in the code needs to change.",
  },
  not_configured: {
    title: "Smart ordering is down: ANTHROPIC_API_KEY isn't set",
    action: "Set ANTHROPIC_API_KEY for this environment in Vercel and redeploy.",
  },
  not_authorized: {
    title: "Smart ordering is down: Anthropic rejects the API key",
    action:
      "The key was revoked or belongs to another workspace. Create a new one and replace ANTHROPIC_API_KEY in Vercel.",
  },
  model_unavailable: {
    title: "Smart ordering is down: the model isn't available on the account",
    action:
      "Check SMART_ORDER_MODEL (default claude-opus-5) against the models the Anthropic account can use.",
  },
}

/** Short, operator-facing names for every fallback reason. */
const REASON_LABEL: Record<SmartOrderFallbackReason, string> = {
  unfunded: "No credit",
  not_configured: "Key not set",
  not_authorized: "Key rejected",
  model_unavailable: "Model unavailable",
  rate_limited: "Rate-limited",
  bad_request: "Request rejected",
  upstream_down: "Anthropic down",
  timeout: "Timed out",
  invalid_answer: "Invalid answer",
  truncated: "Answer cut off",
  refusal: "Refused",
  error: "Other error",
}

/** UTC, minute precision: the panel is read from more than one timezone. */
function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
}

function Breakdown({
  summary,
  windowDays,
}: {
  summary: SmartOrderSummary
  windowDays: number
}) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-ec-text-muted">
        Last {windowDays} days:{" "}
        <span className="font-semibold text-ec-text">
          AI made {summary.claude} of {summary.total}
        </span>
        {" · "}
        <span className={summary.fallback > 0 ? "text-ec-amber" : undefined}>
          {summary.fallback} fell back to the heuristic
        </span>
      </p>
      {summary.byReason.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Fallbacks by reason">
          {summary.byReason.map(({ reason, count }) => (
            <li
              key={reason}
              className="rounded-full border border-ec-border px-2.5 py-0.5 font-mono text-[11px] text-ec-text-muted"
            >
              {REASON_LABEL[reason]} · {count}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="font-mono text-[11px] text-ec-text-dim">
        {summary.lastClaudeAt
          ? `Last AI-made order: ${formatWhen(summary.lastClaudeAt)}`
          : `No AI-made order in the last ${windowDays} days`}
      </p>
    </div>
  )
}

export function SmartOrderHealthPanel({ health }: { health: SmartOrderHealth }) {
  if (health.state === "down") {
    const copy = DOWN_COPY[health.reason]

    return (
      <section
        role="alert"
        aria-labelledby="smart-order-down-title"
        className="space-y-3 rounded-[20px] border-2 border-ec-error/50 bg-ec-error/[0.07] p-5"
      >
        <h2
          id="smart-order-down-title"
          className="flex items-start gap-2.5 font-heading text-lg font-bold leading-snug text-ec-error"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          {copy.title}
        </h2>
        <p className="text-sm text-ec-text">
          The last {health.streak === 1 ? "smart ordering" : `${health.streak} smart orderings`}{" "}
          fell back to the heuristic for this reason, since {formatWhen(health.since)}.
          Every DJ who presses the button gets the non-AI order. No AI quota is
          charged on a fallback, so usage data for this feature reads as zero
          demand while this lasts.
        </p>
        <p className="text-sm font-semibold text-ec-text">{copy.action}</p>
        <Breakdown summary={health.summary} windowDays={health.windowDays} />
      </section>
    )
  }

  if (health.state === "unknown") {
    return (
      <section
        aria-labelledby="smart-order-unknown-title"
        className="space-y-1.5 rounded-[20px] border border-ec-amber/35 bg-ec-amber/[0.06] p-4"
      >
        <h2
          id="smart-order-unknown-title"
          className="flex items-center gap-2 font-heading text-sm font-bold text-ec-amber"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Smart ordering: can&apos;t tell whether it works
        </h2>
        <p className="text-sm text-ec-text-muted">
          {health.cause === "not_migrated"
            ? "Migration 0035 (smart_order_runs) isn't applied in this environment, so there is nothing to count."
            : "Reading smart_order_runs failed (see the backstage.smart_order_runs_unavailable log)."}{" "}
          This is not the same as zero failures: it means this panel has no way to know.
        </p>
      </section>
    )
  }

  if (health.state === "idle") {
    return (
      <section
        aria-labelledby="smart-order-idle-title"
        className="space-y-1 rounded-[20px] border border-ec-border bg-ec-surface/80 p-4"
      >
        <h2
          id="smart-order-idle-title"
          className="flex items-center gap-2 font-heading text-sm font-bold text-ec-text"
        >
          <Sparkles className="size-4 shrink-0 text-ec-text-dim" aria-hidden />
          Smart ordering: nothing to report
        </h2>
        <p className="text-sm text-ec-text-muted">
          Nobody asked for a smart ordering in the last {health.windowDays} days. The
          record was read fine, so this means no requests, not missing data.
        </p>
      </section>
    )
  }

  const degraded = health.state === "degraded"

  return (
    <section
      aria-labelledby="smart-order-health-title"
      className={
        degraded
          ? "space-y-2 rounded-[20px] border border-ec-amber/35 bg-ec-amber/[0.06] p-4"
          : "space-y-2 rounded-[20px] border border-ec-border bg-ec-surface/80 p-4"
      }
    >
      <h2
        id="smart-order-health-title"
        className={`flex items-center gap-2 font-heading text-sm font-bold ${degraded ? "text-ec-amber" : "text-ec-text"}`}
      >
        {degraded ? (
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
        ) : (
          <Sparkles className="size-4 shrink-0 text-ec-cyan" aria-hidden />
        )}
        {degraded
          ? "Smart ordering: most requests are falling back"
          : "Smart ordering: working"}
      </h2>
      <Breakdown summary={health.summary} windowDays={health.windowDays} />
    </section>
  )
}
