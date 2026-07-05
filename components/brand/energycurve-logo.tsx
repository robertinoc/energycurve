import { useId } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

type LogoKind = "horizontal" | "square" | "monochrome"
type LogoTone = "light" | "dark"
type LogoSize = "sm" | "md" | "lg" | "xl"

interface EnergyCurveLogoProps {
  kind?: LogoKind
  tone?: LogoTone
  size?: LogoSize
  caption?: string
  className?: string
  priority?: boolean
}

/* Mark height per size — brand minimum is 24px for the icon */
const markHeights: Record<LogoSize, number> = {
  sm: 24,
  md: 30,
  lg: 38,
  xl: 52,
}

const wordmarkTextSizes: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
}

/**
 * Official EnergyCurve mark — waveform inside a circle (brand kit §3).
 * `mono` renders the monochrome fallback (single light stroke on dark).
 */
function EnergyCurveMark({
  height,
  mono = false,
  className,
}: {
  height: number
  mono?: boolean
  className?: string
}) {
  const gradientId = useId()
  const stroke = mono ? "#F5F2FC" : `url(#${gradientId})`
  const width = Math.round(height * (228 / 172))

  return (
    <svg
      viewBox="0 0 228 172"
      width={width}
      height={height}
      className={cn("ec-mark-glow shrink-0", className)}
      role="img"
      aria-label="EnergyCurve mark"
    >
      {!mono ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#A24DE0" />
            <stop offset=".5" stopColor="#5468E8" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      ) : null}
      <circle
        cx="114"
        cy="86"
        r="82"
        fill="none"
        stroke={stroke}
        strokeWidth="7"
        opacity="0.9"
      />
      <path
        d="M 24 86 C 28.7 86, 43.7 83, 52 86 C 60.3 89, 66 112.3, 74 104 C 82 95.7, 91.3 34, 100 36 C 108.7 38, 117 111.7, 126 116 C 135 120.3, 145.3 67, 154 62 C 162.7 57, 169.7 82, 178 86 C 186.3 90, 199.7 86, 204 86"
        fill="none"
        stroke={stroke}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Wordmark: ENERGY bold 700 with the signature gradient + CURVE weight 300.
 * Never break this weight contrast (brand kit §2).
 */
function EnergyCurveWordmark({ size }: { size: LogoSize }) {
  return (
    <span
      className={cn(
        "font-heading tracking-[-0.02em] whitespace-nowrap leading-none",
        wordmarkTextSizes[size]
      )}
    >
      <span className="ec-gradient-text font-bold">ENERGY</span>
      <span className="font-light text-[#DCD7EC]">CURVE</span>
    </span>
  )
}

export function EnergyCurveLogo({
  kind = "horizontal",
  tone = "light",
  size = "md",
  caption,
  className,
  priority = false,
}: EnergyCurveLogoProps) {
  const captionClassName =
    tone === "light" ? "text-[#ACA4C4]" : "text-[#6E6788]"
  const markHeight = markHeights[size]

  let logo: React.ReactNode

  if (kind === "square") {
    logo = <EnergyCurveMark height={markHeight} />
  } else if (kind === "monochrome") {
    logo = (
      <span className="flex items-center gap-2.5">
        <EnergyCurveMark height={markHeight} mono />
        <EnergyCurveWordmark size={size} />
      </span>
    )
  } else if (size === "xl") {
    /* Marketing / hero surfaces use the official PNG lockup */
    logo = (
      <Image
        src="/brand-kit/logo-horizontal-trans.png"
        alt="EnergyCurve logo"
        width={324}
        height={90}
        priority={priority}
        className="h-auto max-w-full shrink-0"
      />
    )
  } else {
    logo = (
      <span className="flex items-center gap-2.5">
        <EnergyCurveMark height={markHeight} />
        <EnergyCurveWordmark size={size} />
      </span>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {logo}
      {caption ? (
        <p
          className={cn(
            "font-mono text-[11px] font-bold uppercase tracking-[0.2em]",
            captionClassName
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}
