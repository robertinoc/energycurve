"use client"

import Link from "next/link"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"
import { useIsClient } from "@/lib/use-is-client"

const STORAGE_KEY = "energycurve:locale"

function ChromeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 8.6h8.4M9.1 13.7 4.9 6.5M14.9 13.7l-4.2 7.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12 3v12M8.5 6.5 12 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function InstallGuide() {
  // Resolve the stored locale only after hydration so SSR output ("en")
  // always matches the first client render.
  const isClient = useIsClient()
  const locale: SiteLocale =
    isClient && window.localStorage.getItem(STORAGE_KEY) === "es" ? "es" : "en"

  const copy = getSiteCopy(locale).install

  const guides = [
    { title: copy.androidTitle, icon: <ChromeIcon />, steps: copy.androidSteps },
    { title: copy.iosTitle, icon: <ShareIcon />, steps: copy.iosSteps },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08050F] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(162,77,224,0.26),transparent_40%),radial-gradient(circle_at_75%_20%,rgba(34,211,238,0.08),transparent_28%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 pb-16 pt-12">
        <Link href="/" className="w-fit">
          <EnergyCurveLogo kind="horizontal" size="md" tone="light" />
        </Link>

        <div>
          <h1 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
            {copy.description}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {guides.map((guide) => (
            <section
              key={guide.title}
              className="rounded-2xl border border-white/10 bg-[#14101F]/80 p-5"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#A24DE0]/30 bg-[#A24DE0]/12 text-[#C08BFF]">
                  {guide.icon}
                </span>
                <h2 className="font-heading text-lg font-semibold">
                  {guide.title}
                </h2>
              </div>
              <ol className="mt-5 grid gap-2.5">
                {guide.steps.map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm leading-6 text-white/85"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A24DE0]/18 text-xs font-semibold text-[#C08BFF]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#14101F]/60 p-5">
          <h2 className="font-heading text-lg font-semibold">
            {copy.noteTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{copy.note}</p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="ec-gradient-bg rounded-full px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)] transition hover:opacity-95"
          >
            {copy.openApp}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            {copy.backHome}
          </Link>
        </div>
      </div>
    </main>
  )
}
