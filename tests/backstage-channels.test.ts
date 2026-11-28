import { describe, expect, it } from "vitest"

import { KNOWN_SOURCES, MEDIUMS } from "@/lib/attribution/first-touch"
import {
  CHANNEL_META,
  channelOfFirstTouch,
  channelOfFreeform,
  freeformLabel,
} from "@/lib/backstage/channels"
import { acquisitionChannel } from "@/lib/backstage/users"

describe("channelOfFirstTouch", () => {
  it("covers every source of the closed list — none may read as unknown", () => {
    for (const source of Object.keys(KNOWN_SOURCES)) {
      expect(channelOfFirstTouch(source, null), source).not.toBe("unknown")
    }
  })

  it("folds the AI assistants into one channel", () => {
    for (const source of ["chatgpt", "perplexity", "claude", "gemini", "copilot"]) {
      expect(channelOfFirstTouch(source, null)).toBe("ai")
    }
  })

  it("keeps the socials Robertino posts on apart, and folds the rest", () => {
    expect(channelOfFirstTouch("instagram", null)).toBe("instagram")
    expect(channelOfFirstTouch("linkedin", null)).toBe("linkedin")
    expect(channelOfFirstTouch("facebook", null)).toBe("social")
    expect(channelOfFirstTouch("threads", null)).toBe("social")
  })

  it("falls back to the medium, then to unknown — never to direct", () => {
    expect(channelOfFirstTouch("somethingnew", "ai")).toBe("ai")
    expect(channelOfFirstTouch("somethingnew", "social")).toBe("social")
    expect(channelOfFirstTouch(null, null)).toBe("unknown")
    expect(channelOfFirstTouch("somethingnew", "none")).toBe("unknown")
    expect(channelOfFirstTouch("direct", null)).toBe("direct")
  })

  it("handles every closed medium except the non-claims", () => {
    for (const medium of MEDIUMS) {
      const channel = channelOfFirstTouch(null, medium)

      if (medium === "none" || medium === "other") {
        expect(channel).toBe("unknown")
      } else {
        expect(channel, medium).not.toBe("unknown")
      }
    }
  })
})

describe("channelOfFreeform (the PostHog side)", () => {
  it("agrees with the table's acquisitionChannel labels", () => {
    expect(acquisitionChannel({ utmSource: "chatgpt.com", referrerDomain: null }).label).toBe(
      CHANNEL_META.ai.label
    )
    expect(
      acquisitionChannel({ utmSource: null, referrerDomain: "l.instagram.com" }).label
    ).toBe(CHANNEL_META.instagram.label)
    expect(
      acquisitionChannel({ utmSource: null, referrerDomain: "www.google.com" }).label
    ).toBe(CHANNEL_META.google.label)
  })

  it("keeps unmatched raw values visible instead of guessing", () => {
    expect(channelOfFreeform("virtuous-frog-06")).toBeNull()
    expect(freeformLabel("virtuous-frog-06")).toBe("virtuous-frog-06")
  })
})

describe("CHANNEL_META", () => {
  it("every channel has a label and a color", () => {
    for (const meta of Object.values(CHANNEL_META)) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
