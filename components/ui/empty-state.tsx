import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Reusable empty-state block (pattern adapted from StageLink). Centered
 * icon + title + optional description + optional CTA, on a soft dashed
 * card — friendlier than raw "no data" text or a bare spinner.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[26px] border border-dashed border-white/14 bg-white/[0.02] px-6 py-14 text-center",
        className
      )}
    >
      {icon ? <div className="text-white/32">{icon}</div> : null}
      <p className="text-base font-medium text-white">{title}</p>
      {description ? (
        <p className="max-w-md text-sm leading-6 text-white/52">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
