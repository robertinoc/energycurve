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
          ? "ec-gradient-bg justify-between text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)]"
          : "border-white/20 bg-transparent text-ec-text",
        className
      )}
    >
      {children}
    </Link>
  )
}
