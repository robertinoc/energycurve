"use client"

import { useEffect } from "react"

/**
 * Keeps what a visitor typed before React hydrated.
 *
 * The tool pages render their inputs as controlled components: the DOM value
 * comes from state, and state only changes through `onChange`. Between the
 * server's HTML arriving and hydration finishing, those handlers do not exist
 * yet — so anything typed in that window lands in the DOM, is never seen by
 * React, and is then contradicted by the first render: the box still shows the
 * text, the state says empty, and anything derived from the state (a disabled
 * "Analyze" button, a tempo computed from a BPM) behaves as if nothing was
 * entered. The visitor sees their input sitting right there and a product that
 * denies it exists.
 *
 * That window is short on a laptop and not short on a phone on mobile data,
 * which is the device these pages were built for: someone arriving from a
 * search result, pasting a tracklist immediately, on whatever they have in
 * their hand.
 *
 * Found by CI, not by reasoning — mobile-safari lost this race twice on the
 * same branch with a different test each time (#232), because a longer suite
 * made hydration late enough to expose it. The e2e specs that failed are the
 * regression test: they type into a field and then use what it produced.
 *
 * Each entry is a field's element id, what React currently believes is in it,
 * and how to adopt a different answer. Mount only — after hydration React owns
 * the value, and re-reading the DOM on later renders would fight the person
 * mid-keystroke.
 */
export type TypedField = readonly [
  id: string,
  rendered: string,
  adopt: (value: string) => void,
]

export function useTypedBeforeHydration(fields: readonly TypedField[]): void {
  useEffect(() => {
    for (const [id, rendered, adopt] of fields) {
      const element = document.getElementById(id)

      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          // A `<select>` loses a pre-hydration choice exactly the way a text
          // box loses a pre-hydration keystroke, and more easily: picking from
          // a native dropdown is one gesture, so it lands inside the window
          // rather than spanning it. Added for the blog index's tag filter
          // (SEO-E16) rather than reimplemented beside it — the bug is the
          // same bug, and two copies of this fix would drift.
          element instanceof HTMLSelectElement
        )
      ) {
        continue
      }

      // Adopt the DOM's answer whenever it differs, including an empty one:
      // clearing a prefilled BPM before hydration is as real an edit as typing
      // into an empty box, and restoring the default would undo it.
      if (element.value !== rendered) {
        adopt(element.value)
      }
    }
    // Deliberately once, on mount. `fields` is rebuilt every render and the
    // values inside it are exactly what this must not react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
