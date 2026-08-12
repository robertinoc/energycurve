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
          Measures browser-side audio analysis on real files: decode, BPM, and the
          framewise feature pass, plus how far the detected BPM and key land from
          the tags those files already carry. Audio never leaves this machine.
        </p>
      </div>

      <AudioSpikePanel />
    </div>
  )
}
