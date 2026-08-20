"use client"

import { useEffect, useState } from "react"

/** How often the clock is re-read. */
const TICK_MS = 30_000

/**
 * Wall-clock minutes from local midnight, ticking, or null before mount.
 *
 * Null on the server and through the hydration render on purpose: reading the
 * clock during render would make the server and client markup disagree, and a
 * hydration mismatch on the one screen a DJ opens mid-set is not a trade worth
 * making for half a second of earliness.
 *
 * Local time, with no timezone handling anywhere, because a slot is venue
 * wall-clock — "I play 01:00 to 03:00" — and the device is in the venue. Attaching
 * a timezone would invent a precision the DJ never supplied.
 *
 * Thirty seconds is the tick. A minute would let the displayed drift sit a full
 * minute stale, and anything faster spends a phone's battery to no purpose during
 * a two-hour set.
 */
export function useNowMinutes(): number | null {
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    const read = () => {
      const now = new Date()
      setMinutes(now.getHours() * 60 + now.getMinutes())
    }

    read()
    const timer = window.setInterval(read, TICK_MS)

    return () => window.clearInterval(timer)
  }, [])

  return minutes
}
