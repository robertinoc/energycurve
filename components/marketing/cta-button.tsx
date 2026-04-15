import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CTAButtonProps {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary"
  className?: string
}

export function CTAButton({
  href,
  children,
  variant = "primary",
  className,
}: CTAButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ size: "lg", variant: variant === "primary" ? "default" : "outline" }),
        variant === "primary"
          ? "justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] text-[#071018]"
          : "border-white/10 bg-white/[0.03] text-white",
        className
      )}
    >
      {children}
    </Link>
  )
}
