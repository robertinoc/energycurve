import { describe, expect, it } from "vitest"

import {
  EDIT_LOCK_MINUTES,
  mayTake,
  mayWrite,
  resolveLock,
} from "@/lib/playlists/edit-lock"

const NOW = new Date("2026-08-20T22:00:00Z")
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000)

const ME = "dj-a"
const THEM = "dj-b"

describe("resolveLock", () => {
  it("is free when nobody holds it", () => {
    expect(resolveLock({ holderId: null, takenAt: null }, ME, NOW)).toEqual({
      kind: "free",
    })
  })

  it("lets the holder write", () => {
    const state = resolveLock({ holderId: ME, takenAt: minutesAgo(1) }, ME, NOW)

    expect(state.kind).toBe("held_by_viewer")
    expect(mayWrite(state)).toBe(true)
  })

  it("blocks everyone else while the turn is live", () => {
    const state = resolveLock({ holderId: THEM, takenAt: minutesAgo(1) }, ME, NOW)

    expect(state.kind).toBe("held_by_other")
    expect(mayWrite(state)).toBe(false)
    expect(mayTake(state)).toBe(false)
  })

  it("expires a turn nobody renewed", () => {
    // The failure this exists to prevent: someone takes the pen, closes the
    // laptop, and the other DJ is frozen out of their own collaboration with no
    // way to recover — worse than no locking at all.
    const state = resolveLock(
      { holderId: THEM, takenAt: minutesAgo(EDIT_LOCK_MINUTES + 1) },
      ME,
      NOW
    )

    expect(state.kind).toBe("expired")
    expect(mayTake(state)).toBe(true)
  })

  it("expires exactly at the boundary, not a minute later", () => {
    expect(
      resolveLock({ holderId: THEM, takenAt: minutesAgo(EDIT_LOCK_MINUTES) }, ME, NOW)
        .kind
    ).toBe("expired")
    expect(
      resolveLock(
        { holderId: THEM, takenAt: minutesAgo(EDIT_LOCK_MINUTES - 1) },
        ME,
        NOW
      ).kind
    ).toBe("held_by_other")
  })

  it("expires the viewer's own stale turn too", () => {
    // No special case for "it's mine": if it lapsed, it has to be re-taken, so
    // both sides see the same state and neither can write on a dead turn.
    const state = resolveLock(
      { holderId: ME, takenAt: minutesAgo(EDIT_LOCK_MINUTES + 5) },
      ME,
      NOW
    )

    expect(state.kind).toBe("expired")
    expect(mayWrite(state)).toBe(false)
  })

  it("treats half a lock as no lock", () => {
    // A holder with no timestamp, or a timestamp with no holder, would otherwise
    // freeze a set forever with nobody able to clear it.
    for (const half of [
      { holderId: THEM, takenAt: null },
      { holderId: null, takenAt: minutesAgo(1) },
    ]) {
      expect(resolveLock(half, ME, NOW).kind).toBe("free")
    }
  })
})

describe("mayWrite", () => {
  it("refuses on an expired turn until it is claimed", () => {
    // Letting a write silently steal an expired turn would mean two people
    // editing the moment both their clocks agree it lapsed — the exact race this
    // design exists to avoid.
    expect(mayWrite({ kind: "expired", holderId: THEM })).toBe(false)
    expect(mayWrite({ kind: "free" })).toBe(false)
  })
})
