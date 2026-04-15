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
          <linearGradient id="ambient-wave-stroke" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8A39F8" />
            <stop offset="0.42" stopColor="#FF5E8A" />
            <stop offset="0.76" stopColor="#53AFFF" />
            <stop offset="1" stopColor="#00D1FF" />
          </linearGradient>
          <linearGradient id="ambient-wave-fill" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(138,57,248,0.18)" />
            <stop offset="70%" stopColor="rgba(0,209,255,0.05)" />
            <stop offset="100%" stopColor="rgba(11,11,15,0)" />
          </linearGradient>
          <filter id="ambient-wave-glow" x="-10%" y="-35%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M0 172C88 172 104 122 164 122C246 122 226 228 320 228C418 228 408 66 520 66C632 66 618 220 716 220C804 220 814 132 900 132C984 132 998 178 1200 178V280H0V172Z"
          fill="url(#ambient-wave-fill)"
          opacity={emphasis === "hero" ? "0.54" : "0.44"}
          className="energy-wave-fill-breathe"
        />
        <path
          d="M0 170C88 170 104 120 164 120C246 120 226 226 320 226C418 226 408 64 520 64C632 64 618 218 716 218C804 218 814 130 900 130C984 130 998 176 1200 176"
          stroke="url(#ambient-wave-stroke)"
          strokeWidth={emphasis === "hero" ? "4.8" : "4"}
          strokeLinecap="round"
          fill="none"
          filter="url(#ambient-wave-glow)"
          className="energy-wave-line-primary"
        />
        <path
          d="M-20 196C64 196 98 152 158 152C236 152 254 242 324 242C404 242 432 116 520 116C612 116 628 238 710 238C794 238 828 154 904 154C978 154 1022 194 1220 194"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity={emphasis === "hero" ? "0.8" : "0.62"}
          className="energy-wave-line-secondary"
        />
      </svg>
    </div>
  )
}
