"use client"

import { useEffect, useId, useState } from "react"

import { cn } from "@/lib/utils"

type AmbientTone = "violet" | "cyan" | "magenta" | "blend"

const toneClasses: Record<AmbientTone, string> = {
  violet:
    "bg-[radial-gradient(circle,rgba(138,57,248,0.42)_0%,rgba(138,57,248,0.14)_36%,transparent_74%)]",
  cyan:
    "bg-[radial-gradient(circle,rgba(0,209,255,0.32)_0%,rgba(0,209,255,0.12)_36%,transparent_74%)]",
  magenta:
    "bg-[radial-gradient(circle,rgba(255,94,138,0.28)_0%,rgba(255,94,138,0.1)_36%,transparent_74%)]",
  blend:
    "bg-[radial-gradient(circle,rgba(138,57,248,0.24)_0%,rgba(83,175,255,0.12)_36%,rgba(255,94,138,0.08)_54%,transparent_78%)]",
}

const PRIMARY_WAVE_PATHS = [
  "M0 170C88 170 104 120 164 120C246 120 226 226 320 226C418 226 408 64 520 64C632 64 618 218 716 218C804 218 814 130 900 130C984 130 998 176 1200 176",
  "M0 164C92 164 118 104 178 104C264 104 238 234 332 234C428 234 430 48 532 48C638 48 632 224 730 224C820 224 822 118 906 118C994 118 1012 168 1200 168",
  "M0 178C74 178 102 138 160 138C242 138 248 204 320 204C412 204 404 82 514 82C620 82 620 196 714 196C806 196 834 146 920 146C1006 146 1044 180 1200 180",
  "M0 170C88 170 104 120 164 120C246 120 226 226 320 226C418 226 408 64 520 64C632 64 618 218 716 218C804 218 814 130 900 130C984 130 998 176 1200 176",
] as const

const SECONDARY_WAVE_PATHS = [
  "M-20 196C64 196 98 152 158 152C236 152 254 242 324 242C404 242 432 116 520 116C612 116 628 238 710 238C794 238 828 154 904 154C978 154 1022 194 1220 194",
  "M-20 202C58 202 104 168 164 168C236 168 270 236 332 236C410 236 448 134 530 134C612 134 648 224 722 224C804 224 850 170 922 170C1002 170 1046 204 1220 204",
  "M-20 188C70 188 110 140 170 140C242 140 248 222 326 222C404 222 424 96 512 96C600 96 630 220 716 220C804 220 832 140 910 140C992 140 1034 182 1220 182",
  "M-20 196C64 196 98 152 158 152C236 152 254 242 324 242C404 242 432 116 520 116C612 116 628 238 710 238C794 238 828 154 904 154C978 154 1022 194 1220 194",
] as const

const FILL_WAVE_PATHS = [
  "M0 172C88 172 104 122 164 122C246 122 226 228 320 228C418 228 408 66 520 66C632 66 618 220 716 220C804 220 814 132 900 132C984 132 998 178 1200 178V280H0V172Z",
  "M0 166C92 166 118 106 178 106C264 106 238 236 332 236C428 236 430 50 532 50C638 50 632 226 730 226C820 226 822 120 906 120C994 120 1012 170 1200 170V280H0V166Z",
  "M0 180C74 180 102 140 160 140C242 140 248 206 320 206C412 206 404 84 514 84C620 84 620 198 714 198C806 198 834 148 920 148C1006 148 1044 182 1200 182V280H0V180Z",
  "M0 172C88 172 104 122 164 122C246 122 226 228 320 228C418 228 408 66 520 66C632 66 618 220 716 220C804 220 814 132 900 132C984 132 998 178 1200 178V280H0V172Z",
] as const

export function AmbientGlow({
  tone = "blend",
  className,
}: {
  tone?: AmbientTone
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        toneClasses[tone],
        className
      )}
    />
  )
}

export function EnergyWaveBackdrop({
  className,
  emphasis = "subtle",
}: {
  className?: string
  emphasis?: "subtle" | "hero"
}) {
  const id = useId().replace(/:/g, "-")
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    const applyPreference = () => setShouldAnimate(!mediaQuery.matches)

    applyPreference()
    mediaQuery.addEventListener("change", applyPreference)

    return () => mediaQuery.removeEventListener("change", applyPreference)
  }, [])

  const strokeId = `ambient-wave-stroke-${id}`
  const fillId = `ambient-wave-fill-${id}`
  const glowId = `ambient-wave-glow-${id}`

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute overflow-hidden motion-reduce:opacity-40",
        emphasis === "hero" ? "opacity-85" : "opacity-70",
        className
      )}
    >
      <svg
        viewBox="0 0 1200 280"
        className={cn(
          "h-full w-full energy-wave-glide motion-reduce:animate-none",
          emphasis === "hero" ? "scale-[1.02]" : ""
        )}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8A39F8" />
            <stop offset="0.42" stopColor="#FF5E8A" />
            <stop offset="0.76" stopColor="#53AFFF" />
            <stop offset="1" stopColor="#00D1FF" />
          </linearGradient>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(138,57,248,0.18)" />
            <stop offset="70%" stopColor="rgba(0,209,255,0.05)" />
            <stop offset="100%" stopColor="rgba(11,11,15,0)" />
          </linearGradient>
          <filter id={glowId} x="-10%" y="-35%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={FILL_WAVE_PATHS[0]}
          fill={`url(#${fillId})`}
          opacity={emphasis === "hero" ? "0.54" : "0.44"}
          className="energy-wave-fill-breathe"
        >
          {shouldAnimate ? (
            <animate
              attributeName="d"
              dur={emphasis === "hero" ? "9.5s" : "11.5s"}
              repeatCount="indefinite"
              values={FILL_WAVE_PATHS.join(";")}
              calcMode="spline"
              keyTimes="0;0.33;0.66;1"
              keySplines="0.45 0 0.2 1;0.45 0 0.2 1;0.45 0 0.2 1"
            />
          ) : null}
        </path>

        <path
          d={PRIMARY_WAVE_PATHS[0]}
          stroke={`url(#${strokeId})`}
          strokeWidth={emphasis === "hero" ? "4.8" : "4"}
          strokeLinecap="round"
          fill="none"
          filter={`url(#${glowId})`}
          className="energy-wave-line-primary"
        >
          {shouldAnimate ? (
            <animate
              attributeName="d"
              dur={emphasis === "hero" ? "8.4s" : "10.2s"}
              repeatCount="indefinite"
              values={PRIMARY_WAVE_PATHS.join(";")}
              calcMode="spline"
              keyTimes="0;0.33;0.66;1"
              keySplines="0.45 0 0.2 1;0.45 0 0.2 1;0.45 0 0.2 1"
            />
          ) : null}
        </path>

        <path
          d={SECONDARY_WAVE_PATHS[0]}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity={emphasis === "hero" ? "0.8" : "0.62"}
          className="energy-wave-line-secondary"
        >
          {shouldAnimate ? (
            <animate
              attributeName="d"
              dur={emphasis === "hero" ? "10.8s" : "12.6s"}
              repeatCount="indefinite"
              values={SECONDARY_WAVE_PATHS.join(";")}
              calcMode="spline"
              keyTimes="0;0.33;0.66;1"
              keySplines="0.45 0 0.2 1;0.45 0 0.2 1;0.45 0 0.2 1"
            />
          ) : null}
        </path>
      </svg>
    </div>
  )
}
