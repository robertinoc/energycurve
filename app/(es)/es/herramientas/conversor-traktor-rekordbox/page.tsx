import type { Metadata } from "next"

import { PlaylistConverterPage } from "@/components/tools/playlist-converter-page"
import { buildPlaylistConverterStructuredData } from "@/lib/tools/structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const
const PATH = "/tools/traktor-rekordbox-converter" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function PlaylistConverterRouteEs() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildPlaylistConverterStructuredData(LOCALE)
          ),
        }}
      />
      <PlaylistConverterPage locale={LOCALE} />
    </>
  )
}
