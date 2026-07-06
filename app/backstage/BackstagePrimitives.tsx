"use client"

import { cn } from "@/lib/utils"

/**
 * Visual primitives ported from StageLink's design system (components/sl/
 * Bento.tsx + SlPrimitives.tsx and the analytics redesign TrendPill),
 * re-tokenized to the EnergyCurve palette: violet #A24DE0, cyan #22D3EE,
 * background #08050F, cards #14101F. Sparkline/Sparkbars are dependency-free
 * (pure SVG / flex divs) by design — no recharts here.
 */

type BentoTone = "panel" | "accent" | "cyan" | "green"

const BENTO_BG: Record<BentoTone, string> = {
  panel: "bg-[#14101F]/80",
  accent:
    "bg-[linear-gradient(160deg,rgba(162,77,224,0.16)_0%,rgba(162,77,224,0.03)_100%)]",
  cyan: "bg-[linear-gradient(160deg,rgba(34,211,238,0.12)_0%,rgba(34,211,238,0.03)_100%)]",
  green:
    "bg-[linear-gradient(160deg,rgba(74,222,128,0.12)_0%,rgba(74,222,128,0.03)_100%)]",
}

const BENTO_BORDER: Record<BentoTone, string> = {
  panel: "border-white/10",
  accent: "border-[rgba(162,77,224,0.32)]",
  cyan: "border-[rgba(34,211,238,0.25)]",
  green: "border-[rgba(74,222,128,0.25)]",
}

export function Bento({
  tone = "panel",
  glow = false,
  className,
  children,
}: {
  tone?: BentoTone
  glow?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border",
        BENTO_BG[tone],
        BENTO_BORDER[tone],
        glow
          ? "shadow-[0_0_36px_rgba(162,77,224,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function BentoLabel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        "font-heading text-[10px] font-bold uppercase tracking-[2px] text-white/50",
        className
      )}
    >
      {children}
    </p>
  )
}

export function TrendPill({
  value,
  prev,
  className,
}: {
  value: number
  prev: number
  className?: string
}) {
  const direction = prev === 0 ? "flat" : value >= prev ? "up" : "down"
  const percent =
    prev === 0 ? null : Math.round(((value - prev) / prev) * 100)

  const toneClass =
    direction === "up"
      ? "bg-[rgba(74,222,128,0.14)] text-[#4ADE80] border-[rgba(74,222,128,0.25)]"
      : direction === "down"
        ? "bg-[rgba(255,107,107,0.14)] text-[#FF6B6B] border-[rgba(255,107,107,0.25)]"
        : "bg-white/[0.06] text-white/70 border-white/10"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-[10px] py-1 font-mono text-[11px] font-bold tracking-[0.3px]",
        toneClass,
        className
      )}
    >
      {percent === null
        ? "— new"
        : `${percent >= 0 ? "▲" : "▼"} ${Math.abs(percent)}%`}
    </span>
  )
}

/** Pure-SVG line sparkline (StageLink SlPrimitives.Sparkline). */
export function Sparkline({
  data,
  color = "#A24DE0",
  height = 28,
  width = 200,
  fill = true,
}: {
  data: number[]
  color?: string
  height?: number
  width?: number
  fill?: boolean
}) {
  if (data.length < 2) {
    return null
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2

    return `${x},${y}`
  })
  const gradientId = `spark-${color.replace("#", "")}`

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill ? (
        <polygon
          points={`0,${height} ${points.join(" ")} ${width},${height}`}
          fill={`url(#${gradientId})`}
        />
      ) : null}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Dependency-free bar sparkline (StageLink SlPrimitives.Sparkbars). */
export function Sparkbars({
  data,
  color = "#A24DE0",
  height = 36,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const max = Math.max(...data, 1)

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height,
        width: "100%",
      }}
      aria-hidden="true"
    >
      {data.map((value, index) => (
        <div
          key={index}
          title={String(value)}
          style={{
            flex: 1,
            height: `${Math.max(8, (value / max) * 100)}%`,
            background: color,
            opacity: 0.4 + (value / max) * 0.6,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}
