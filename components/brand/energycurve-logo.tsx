import Image from "next/image"

import { cn } from "@/lib/utils"

type LogoKind = "horizontal" | "square" | "monochrome"
type LogoTone = "light" | "dark"
type LogoSize = "sm" | "md" | "lg" | "xl"

const logoAssets: Record<LogoKind, { src: string; sizes: Record<LogoSize, { width: number; height: number }> }> = {
  horizontal: {
    src: "/branding/logos/energycurve-logo-horizontal.svg",
    sizes: {
      sm: { width: 132, height: 26 },
      md: { width: 172, height: 34 },
      lg: { width: 214, height: 42 },
      xl: { width: 282, height: 54 },
    },
  },
  square: {
    src: "/branding/logos/energycurve-logo-square.svg",
    sizes: {
      sm: { width: 28, height: 28 },
      md: { width: 40, height: 40 },
      lg: { width: 56, height: 56 },
      xl: { width: 88, height: 88 },
    },
  },
  monochrome: {
    src: "/branding/logos/energycurve-logo-monochrome.svg",
    sizes: {
      sm: { width: 138, height: 31 },
      md: { width: 182, height: 40 },
      lg: { width: 224, height: 50 },
      xl: { width: 292, height: 65 },
    },
  },
}

interface EnergyCurveLogoProps {
  kind?: LogoKind
  tone?: LogoTone
  size?: LogoSize
  caption?: string
  className?: string
  priority?: boolean
}

export function EnergyCurveLogo({
  kind = "horizontal",
  tone = "dark",
  size = "md",
  caption,
  className,
  priority = false,
}: EnergyCurveLogoProps) {
  const asset = logoAssets[kind]
  const dimensions = asset.sizes[size]

  const captionClassName =
    tone === "light" ? "text-white/65" : "text-slate-500"

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Image
        src={asset.src}
        alt={kind === "square" ? "EnergyCurve icon" : "EnergyCurve logo"}
        width={dimensions.width}
        height={dimensions.height}
        priority={priority || size === "xl"}
        className="h-auto max-w-full shrink-0"
      />

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
  )
}
