import type { Metadata } from "next"
import Link from "next/link"
import { FlaskConical } from "lucide-react"

import { CueSpikePanel } from "./CueSpikePanel"

export const metadata: Metadata = {
  title: "CUE spike",
}

export default function BackstageCueSpikePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">CUE points, phase A</h1>
        <p className="max-w-3xl text-sm text-ec-text-dim">
          Can we suggest where to put CUEs well enough that they survive a CDJ?
          This measures it on your own tracks: the whole-track energy, the beat
          grid the browser finds, and three suggested CUEs per track.
        </p>
      </div>

      {/* Same honesty as the audio spike: a measuring instrument, not a feature
          that ended up in the wrong place. */}
      <section className="rounded-xl border border-ec-violet/28 bg-ec-violet/8 p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold">
          <FlaskConical aria-hidden className="size-4 text-ec-violet" />
          This is an instrument, not a feature
        </h2>
        <div className="mt-3 max-w-3xl space-y-2.5 text-sm leading-6 text-ec-text-muted">
          <p>
            Nothing here is saved and nothing reaches the product. The suggestions
            are never exported to Rekordbox or Traktor from this screen — whether
            that should exist at all is the question this answers.
          </p>
          <p>
            What it can&apos;t know: which beat starts the bar. A suggestion can sit
            exactly on a beat and still be a beat early for the phrase.
          </p>
          <p className="text-ec-text-dim">
            Sibling of the{" "}
            <Link href="/backstage/audio-spike" className="text-ec-cyan hover:underline">
              audio spike
            </Link>
            , and deleted with it once the decision is made.
          </p>
        </div>
      </section>

      <CueSpikePanel />
    </div>
  )
}
