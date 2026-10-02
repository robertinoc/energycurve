"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { IMPORT_ARRIVAL_WINDOW_MS } from "@/lib/playlists/import-arrival"

const COPY = DASHBOARD_COPY.importArriving

/** How often the server page is asked again while the tracks are arriving. */
const REFRESH_EVERY_MS = 1_000

/**
 * The detail page's state for an import whose tracks are still being written
 * (IMP.1), in place of an empty table and a disabled Export.
 *
 * It asks the server page to render again every second. The page decides, each
 * time, whether the import is still arriving; the moment the tracks are there it
 * renders the set instead and this component is gone. It stops on its own after
 * the arrival window even if nothing changed, so a broken import cannot keep a
 * tab polling forever.
 */
export function ImportArriving({ locale }: { locale: SiteLocale }) {
  const router = useRouter()

  useEffect(() => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      if (Date.now() - started > IMPORT_ARRIVAL_WINDOW_MS) {
        window.clearInterval(timer)
        return
      }
      router.refresh()
    }, REFRESH_EVERY_MS)

    return () => window.clearInterval(timer)
  }, [router])

  return (
    <section
      role="status"
      aria-live="polite"
      data-testid="import-arriving"
      className="flex items-start gap-3 rounded-xl border border-ec-cyan/30 bg-ec-cyan/5 p-4"
    >
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-ec-cyan motion-reduce:animate-none" aria-hidden />
      <div>
        <h2 className="font-heading text-sm font-bold text-ec-text">{COPY.title[locale]}</h2>
        <p className="mt-1 text-sm text-ec-text-muted">{COPY.body[locale]}</p>
      </div>
    </section>
  )
}
