"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { rememberLocaleAction } from "@/app/dashboard/locale-actions"
import { ANALYSIS_LOCALE_COOKIE } from "@/lib/analysis-locale"
import { ANALYSIS_UI } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

const OPTIONS: { locale: SiteLocale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "es", label: "ES" },
]

function persistLocaleCookie(locale: SiteLocale) {
  document.cookie = `${ANALYSIS_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}

interface LocaleToggleProps {
  current: SiteLocale
}

export function LocaleToggle({ current }: LocaleToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function setLocale(locale: SiteLocale) {
    if (locale === current) {
      return
    }

    persistLocaleCookie(locale)
    startTransition(() => {
      // Fire-and-forget: the cookie already changed the UI, and this only
      // teaches the server which language to write emails in. A signed-out
      // visitor's call returns without doing anything.
      void rememberLocaleAction(locale)
      router.refresh()
    })
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1",
        isPending && "opacity-60"
      )}
      role="group"
      aria-label={ANALYSIS_UI.language[current]}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          onClick={() => setLocale(option.locale)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-[0.14em] transition-colors",
            option.locale === current
              ? "bg-white/12 text-white"
              : "text-white/48 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
