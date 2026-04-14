import Image from "next/image"

import { cn } from "@/lib/utils"

type LogoVariant = "gradient" | "mono"
type LogoTone = "light" | "dark"
type LogoSize = "sm" | "md" | "lg" | "xl"

const logoSources: Record<LogoVariant, string> = {
  gradient: "/brand/energycurve-iso-gradient.svg",
  mono: "/brand/energycurve-iso-mono.svg",
}

const sizeMap: Record<LogoSize, number> = {
  sm: 28,
  md: 40,
  lg: 56,
  xl: 88,
}

interface EnergyCurveLogoProps {
  variant?: LogoVariant
  tone?: LogoTone
  size?: LogoSize
  withWordmark?: boolean
  caption?: string
  className?: string
}

export function EnergyCurveLogo({
  variant = "gradient",
  tone = "dark",
  size = "md",
  withWordmark = true,
  caption,
  className,
}: EnergyCurveLogoProps) {
  const iconSize = sizeMap[size]

  const titleClassName =
    tone === "light" ? "text-white" : "text-[#0B0B0F]"
  const captionClassName =
    tone === "light" ? "text-white/65" : "text-slate-500"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src={logoSources[variant]}
        alt="EnergyCurve logo"
        width={iconSize}
        height={iconSize}
        priority={size === "xl"}
        className="shrink-0"
      />

      {withWordmark ? (
        <div className="space-y-0.5">
          <p
            className={cn(
              "font-heading text-lg font-semibold tracking-[0.02em]",
              titleClassName
            )}
          >
            EnergyCurve
          </p>
          {caption ? (
            <p
              className={cn(
                "text-xs uppercase tracking-[0.24em]",
                captionClassName
              )}
            >
              {caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
