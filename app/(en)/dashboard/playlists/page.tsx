import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { ListMusic } from "lucide-react"
import { redirect } from "next/navigation"

import { PlaylistImportUpload } from "@/components/playlists/playlist-import-upload"
import { PlaylistsBrowser } from "@/components/playlists/playlists-browser"
import { getProfileBilling } from "@/services/billing-service"
import { EmptyState } from "@/components/ui/empty-state"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { can } from "@/lib/product/capabilities"
import { getRequestLocale } from "@/lib/server-locale"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { listPlaylists } from "@/services/playlist-service"
import { listUserContexts, listUserGenres } from "@/services/taxonomy-service"

export const metadata: Metadata = {
  title: "Playlists",
}

export const dynamic = "force-dynamic"

export default async function PlaylistsPage() {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/playlists"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const [playlists, customContexts, customGenres, locale, billing] =
    await Promise.all([
      listPlaylists(profile.id),
      listUserContexts(profile.id),
      listUserGenres(profile.id),
      getRequestLocale(),
      getProfileBilling(profile.id),
    ])
  const copy = DASHBOARD_COPY.playlists

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {copy.title[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/60">
          {copy.subtitle[locale]}
        </p>
      </header>

        {/* Single entry point: the card hosts all three ways in (DJ export /
            audio files / by hand) as tabs. */}
        <PlaylistImportUpload
          locale={locale}
          customContexts={customContexts}
          customGenres={customGenres}
          canAnalyzeAudio={can(billing.plan, billing.status, "audio_analysis")}
        />

        {playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic className="size-8" />}
            title={copy.emptyTitle[locale]}
            description={copy.emptyDescription[locale]}
          />
        ) : (
          <PlaylistsBrowser playlists={playlists} locale={locale} />
        )}
    </div>
  )
}
