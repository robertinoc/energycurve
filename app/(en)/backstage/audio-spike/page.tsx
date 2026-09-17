import type { Metadata } from "next"
import { FlaskConical } from "lucide-react"

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

      {/*
        This screen kept reading as a feature that had been put in the wrong
        place. It isn't one, and saying so beats explaining it again later.
      */}
      <section className="rounded-xl border border-ec-violet/28 bg-ec-violet/8 p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold">
          <FlaskConical aria-hidden className="size-4 text-ec-violet" />
          This is an instrument, not a feature
        </h2>
        <div className="mt-3 max-w-3xl space-y-2.5 text-sm leading-6 text-ec-text-muted">
          <p>
            No EnergyCurve user will ever see this screen, and it isn&apos;t waiting
            to be moved into the dashboard — it gets <strong>deleted</strong>{" "}
            once the decision it exists for is settled. It lives in backstage for
            the same reason Analytics does: it&apos;s evidence for a call you have
            to make, not something the product does.
          </p>
          <p>
            What ships <em>from</em> it is the feature: filling in BPM automatically
            for files that carry no tags.
          </p>
          <p>
            <strong>The verdict so far</strong> — tempo is production-ready (19/19
            against your own tags), key detection is not (3/14, 21%), and the
            interface freezes for around half a second, which has to be fixed before
            anything ships. That&apos;s recorded in{" "}
            <code className="text-ec-text-dim">
              docs/spike-browser-audio-analysis.md
            </code>
            .
          </p>
          <p className="text-ec-text-dim">
            It&apos;s still here for one reason: when the key-detection algorithm
            gets reworked, this is how we find out whether 21% became something
            shippable. After that, it goes.
          </p>
        </div>
      </section>

      <AudioSpikePanel />
    </div>
  )
}
