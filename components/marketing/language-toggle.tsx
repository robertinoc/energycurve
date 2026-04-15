"use client"

import { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

interface LanguageToggleProps {
  locale: SiteLocale
  onChange: (locale: SiteLocale) => void
  compact?: boolean
}

export function LanguageToggle({
  locale,
  onChange,
  compact = false,
}: LanguageToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1",
        compact ? "w-full justify-between" : "gap-1"
      )}
      aria-label="Language toggle"
    >
      {(["en", "es"] as const).map((value) => {
        const active = locale === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7E8A]/40",
              active
                ? "bg-linear-to-r from-[#FFB08A] via-[#FF867B] to-[#FF5E8A] text-[#190A13] shadow-[0_8px_24px_rgba(255,94,138,0.18)]"
                : "text-white/62 hover:text-white"
            )}
            aria-pressed={active}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}
