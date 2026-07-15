import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Tinted-chip pattern from the brand kit: rgba(color, 0.12–0.15) background,
 * 1px border at rgba(color, 0.4), lightened text of the same hue.
 * Data chips are always Space Mono 700 uppercase.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[20px] border px-3 py-1.5 font-mono text-[11.5px] font-bold whitespace-nowrap uppercase tracking-[0.08em] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-[#A24DE0]/40 bg-[#A24DE0]/[0.13] text-[#CDA2F1]",
        outline: "border-ec-border-strong bg-white/[0.04] text-ec-text-muted",
        accent: "border-[#22D3EE]/40 bg-[#22D3EE]/[0.13] text-[#7DE6F7]",
        peak: "border-[#F0348A]/40 bg-[#F0348A]/[0.13] text-[#FF87BE]",
        warning: "border-[#F5A524]/40 bg-[#F5A524]/[0.13] text-[#FFC96B]",
        positive: "border-[#4ADE80]/40 bg-[#4ADE80]/[0.13] text-[#86EFAC]",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
)

function Badge({
  className,
  variant = "outline",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
