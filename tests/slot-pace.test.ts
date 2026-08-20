import { describe, expect, it } from "vitest"

import {
  PACE_TOLERANCE_MINUTES,
  assessPace,
  locateInSlot,
  resolveSlot,
} from "@/lib/engine/slot"

const at = (hours: number, minutes = 0) => hours * 60 + minutes

/** 23:00 → 01:00. The common case: most club slots cross midnight. */
const crossing = resolveSlot(at(23), at(1))!
/** 21:00 → 23:00. Same-evening slot, no wrap. */
const simple = resolveSlot(at(21), at(23))!

describe("locateInSlot", () => {
  it("locates a time inside a same-evening slot", () => {
    expect(locateInSlot(at(22), simple)).toEqual({ phase: "inside", minutes: 60 })
  })

  it("locates a time inside a slot that crosses midnight", () => {
    // The bug this function exists for: now − start is −1350 here, which reads as
    // twenty-two hours early when the truth is ninety minutes in.
    expect(locateInSlot(at(0, 30), crossing)).toEqual({
      phase: "inside",
      minutes: 90,
    })
  })

  it("counts both edges as inside", () => {
    expect(locateInSlot(at(23), crossing).phase).toBe("inside")
    expect(locateInSlot(at(1), crossing)).toEqual({ phase: "inside", minutes: 120 })
  })

  it("resolves the modular ambiguity toward the nearer edge", () => {
    // Every instant is simultaneously a little before the slot and a lot after it.
    // 22:30 is 30 minutes early, not 22.5 hours late.
    expect(locateInSlot(at(22, 30), crossing)).toEqual({
      phase: "before",
      minutes: 30,
    })
    // 01:30 is 30 minutes late, not 21.5 hours early.
    expect(locateInSlot(at(1, 30), crossing)).toEqual({
      phase: "after",
      minutes: 30,
    })
  })

  it("keeps minutes non-negative in every phase", () => {
    for (const now of [at(9), at(15), at(20), at(23, 59), at(0, 1), at(4)]) {
      expect(locateInSlot(now, crossing).minutes).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("assessPace", () => {
  // 20 tracks across a 120-minute slot: 6 minutes of slot per track, so track
  // index 10 is scheduled 60 minutes in — 00:00 on a 23:00 start.
  const track = (index: number, now: number) =>
    assessPace(now, index, 20, crossing)

  it("says on time when the DJ is where the plan put them", () => {
    const pace = track(10, at(0, 0))

    expect(pace!.status).toBe("on_time")
    expect(pace!.driftMinutes).toBe(0)
  })

  it("says behind, with the drift, when the set is running long", () => {
    const pace = track(10, at(0, 20))

    expect(pace!.status).toBe("behind")
    expect(pace!.driftMinutes).toBe(20)
  })

  it("says ahead when the DJ is burning through the set", () => {
    const pace = track(10, at(23, 40))

    expect(pace!.status).toBe("ahead")
    expect(pace!.driftMinutes).toBe(-20)
  })

  it("absorbs drift inside the tolerance", () => {
    // One long mix, or one track played to the end instead of cut. Flagging this
    // would make the booth view cry wolf during the hour it's most unwelcome.
    expect(track(10, at(0, PACE_TOLERANCE_MINUTES))!.status).toBe("on_time")
    expect(track(10, at(0, PACE_TOLERANCE_MINUTES + 1))!.status).toBe("behind")
  })

  it("turns drift into a decision: minutes per remaining track", () => {
    // 10 tracks left, 20 minutes of slot. Two minutes each is not playable, which
    // is the point — the DJ has to cut, and knowing now beats knowing at 00:58.
    const pace = track(10, at(0, 40))

    expect(pace!.tracksRemaining).toBe(10)
    expect(pace!.remainingSlotMinutes).toBe(20)
    expect(pace!.minutesPerRemainingTrack).toBe(2)
  })

  it("reports a slot that has already ended", () => {
    // "Your slot ended 15 minutes ago" is worth saying; silence isn't.
    const pace = track(19, at(1, 15))

    expect(pace!.status).toBe("behind")
    expect(pace!.remainingSlotMinutes).toBeLessThan(0)
    expect(pace!.minutesPerRemainingTrack).toBeNull()
  })

  it("says nothing before the slot starts", () => {
    // Reporting a DJ as "ahead of schedule" an hour before they go on is noise
    // dressed as information.
    expect(track(0, at(21))).toBeNull()
  })

  it("returns null for an empty set instead of dividing by zero", () => {
    expect(assessPace(at(0), 0, 0, crossing)).toBeNull()
  })

  it("has no minutes-per-track left on the last track", () => {
    const pace = assessPace(at(1), 20, 20, crossing)

    expect(pace!.tracksRemaining).toBe(0)
    expect(pace!.minutesPerRemainingTrack).toBeNull()
  })

  it("works the same on a slot that doesn't cross midnight", () => {
    // 21:00–23:00, 20 tracks, index 10 due at 22:00.
    expect(assessPace(at(22, 30), 10, 20, simple)!.driftMinutes).toBe(30)
  })
})
