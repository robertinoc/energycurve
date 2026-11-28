import Link from "next/link"

import type {
  Opportunity,
  OpportunitySeverity,
} from "@/lib/backstage/opportunities"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * The decision layer, right under the KPIs: what the data says, what to do.
 * Server component on purpose — everything is computed from the same snapshot
 * the page already loaded, and the only interaction is a link.
 */

const SEVERITY_META: Record<
  OpportunitySeverity,
  { label: string; dot: string; border: string }
> = {
  high: { label: "act on it", dot: "#FBBF24", border: "border-[#FBBF24]/35" },
  medium: { label: "worth a look", dot: "#22D3EE", border: "border-[#22D3EE]/30" },
  info: { label: "good to know", dot: "#9CA3AF", border: "border-white/10" },
}

export function OpportunitiesPanel({
  opportunities,
}: {
  opportunities: Opportunity[]
}) {
  return (
    <section className="space-y-3" aria-label="Opportunities">
      {opportunities.length === 0 ? (
        <Bento tone="panel" className="p-5">
          <p className="text-[13px] text-white/50">
            Nothing to flag yet: every rule either looks fine or lacks the
            sample to say otherwise. That is an answer, not an absence.
          </p>
        </Bento>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {opportunities.map((opportunity) => {
            const meta = SEVERITY_META[opportunity.severity]

            return (
              <Bento
                key={opportunity.id}
                tone="panel"
                className={`space-y-2.5 border p-5 ${meta.border}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <BentoLabel className="text-white/85">
                    {opportunity.title}
                  </BentoLabel>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase"
                    style={{ color: meta.dot }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: meta.dot }}
                    />
                    {meta.label}
                  </span>
                </div>
                <p className="font-mono text-[12px] leading-5 text-white/60">
                  {opportunity.evidence}
                </p>
                <p className="text-[13px] leading-6 text-white/80">
                  {opportunity.suggestion}
                </p>
                {opportunity.action ? (
                  <Link
                    href={opportunity.action.href}
                    className="inline-block text-[12.5px] font-bold text-ec-cyan hover:underline"
                  >
                    {opportunity.action.label} →
                  </Link>
                ) : null}
              </Bento>
            )
          })}
        </div>
      )}
    </section>
  )
}
