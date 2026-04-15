import Image from "next/image"

import { cn } from "@/lib/utils"

type LogoKind = "horizontal" | "square" | "monochrome"
type LogoTone = "light" | "dark"
type LogoSize = "sm" | "md" | "lg" | "xl"

const logoAssets: Record<LogoKind, { src: string; sizes: Record<LogoSize, { width: number; height: number }> }> = {
  horizontal: {
    src: "/branding/source/energycurve-logo-horizontal.png",
    sizes: {
      sm: { width: 138, height: 28 },
      md: { width: 186, height: 38 },
      lg: { width: 244, height: 50 },
      xl: { width: 324, height: 66 },
    },
  },
  square: {
    src: "/branding/source/energycurve-logo-square.png",
    sizes: {
      sm: { width: 28, height: 28 },
      md: { width: 40, height: 40 },
      lg: { width: 56, height: 56 },
      xl: { width: 88, height: 88 },
    },
  },
  monochrome: {
    src: "/branding/source/energycurve-logo-monochrome.png",
    sizes: {
      sm: { width: 138, height: 31 },
      md: { width: 182, height: 40 },
      lg: { width: 244, height: 54 },
      xl: { width: 312, height: 69 },
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
  const imageClassName =
    kind === "square"
      ? "h-auto max-w-full shrink-0"
      : "h-auto max-w-full shrink-0 mix-blend-screen brightness-[1.06] contrast-[1.03] saturate-[1.05]"

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Image
        src={asset.src}
        alt={kind === "square" ? "EnergyCurve icon" : "EnergyCurve logo"}
        width={dimensions.width}
        height={dimensions.height}
        priority={priority || size === "xl"}
        className={imageClassName}
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
