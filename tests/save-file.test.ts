import { describe, expect, it } from "vitest"

import {
  REVOKE_DELAY_MS,
  detectAppleTouchDevice,
  detectCanShareFiles,
  preferredSaveStrategy,
} from "@/lib/playlists/save-file"

describe("preferredSaveStrategy", () => {
  it("shares on an Apple touch device that can share files", () => {
    // The reported bug: iOS Safari ignores `download` on a blob URL and
    // navigates to the blob, so the DJ lands on raw XML with no way to keep it.
    // The share sheet is the only path to "Save to Files".
    expect(
      preferredSaveStrategy({ canShareFiles: true, isAppleTouchDevice: true })
    ).toBe("share")
  })

  it("uses the anchor on desktop even when sharing is available", () => {
    // Chrome on Windows reports canShare for files. Handing a playlist to
    // another app is the worse answer there — someone exporting to rekordbox
    // wants a file in a folder.
    expect(
      preferredSaveStrategy({ canShareFiles: true, isAppleTouchDevice: false })
    ).toBe("anchor")
  })

  it("falls back to the anchor on iOS when sharing files isn't allowed", () => {
    // Worse than a download, but better than nothing: the anchor at least
    // renders the content in a tab the user can share by hand.
    expect(
      preferredSaveStrategy({ canShareFiles: false, isAppleTouchDevice: true })
    ).toBe("anchor")
  })
})

describe("detectAppleTouchDevice", () => {
  it("recognises an iPhone", () => {
    expect(detectAppleTouchDevice({ platform: "iPhone" })).toBe(true)
  })

  it("recognises iPadOS, which claims to be a desktop Mac", () => {
    // iPadOS reports "MacIntel". Touch points are the only thing separating it
    // from a real Mac, and getting this wrong sends every iPad down the broken
    // anchor path.
    expect(
      detectAppleTouchDevice({ platform: "MacIntel", maxTouchPoints: 5 })
    ).toBe(true)
  })

  it("does not mistake a desktop Mac for one", () => {
    expect(
      detectAppleTouchDevice({ platform: "MacIntel", maxTouchPoints: 0 })
    ).toBe(false)
  })

  it("treats a missing platform as not-Apple rather than throwing", () => {
    expect(detectAppleTouchDevice({})).toBe(false)
  })
})

describe("detectCanShareFiles", () => {
  const probe = new File(["x"], "a.txt", { type: "text/plain" })

  it("is false when the browser has no canShare", () => {
    expect(detectCanShareFiles({}, probe)).toBe(false)
  })

  it("passes the file through to canShare", () => {
    expect(
      detectCanShareFiles({ canShare: (data) => data.files.length === 1 }, probe)
    ).toBe(true)
  })

  it("treats a throwing canShare as unsupported", () => {
    // Some engines throw on a shape they don't handle instead of returning
    // false, and an exception here would take the whole export button down.
    expect(
      detectCanShareFiles(
        {
          canShare: () => {
            throw new TypeError("unsupported")
          },
        },
        probe
      )
    ).toBe(false)
  })
})

describe("REVOKE_DELAY_MS", () => {
  it("leaves the blob URL alive well past the click", () => {
    // The other half of the reported bug: the old code revoked synchronously
    // after .click(), which cancels the download on Safari because the click
    // only starts an async read of the blob. Any small value reintroduces it.
    expect(REVOKE_DELAY_MS).toBeGreaterThanOrEqual(10_000)
  })
})
