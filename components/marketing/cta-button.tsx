import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CTAButtonProps {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary"
  className?: string
  /**
   * Fired as the visitor leaves. Optional, and only used where the click is
   * itself the thing worth knowing — the free tool's signup CTA, which is the
   * conversion the page exists to produce.
   */
  onClick?: () => void
}

export function CTAButton({
  href,
  children,
  variant = "primary",
  className,
  onClick,
}: CTAButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        buttonVariants({ size: "lg", variant: variant === "primary" ? "default" : "outline" }),
        variant === "primary"
          ? "ec-gradient-bg justify-between text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)]"
          : "border-white/20 bg-transparent text-ec-text",
        className
      )}
    >
      {children}
    </Link>
  )
}
