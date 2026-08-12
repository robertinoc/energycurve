import type { Metadata } from "next"

import { AudioSpikePanel } from "./AudioSpikePanel"

export const metadata: Metadata = {
  title: "Audio spike",
}

export default function BackstageAudioSpikePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Audio analysis spike</h1>
        <p className="max-w-3xl text-sm text-ec-text-dim">
          Should we analyse audio in the browser? Point this at your own tracks and
          it answers three things: whether it&apos;s fast enough, whether the app
          stays usable while it runs, and whether the tempo and key it finds agree
          with the tags your files already carry.
        </p>
      </div>

      <AudioSpikePanel />
    </div>
  )
}
