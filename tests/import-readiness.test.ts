import { describe, expect, it } from "vitest"

import { assessImport } from "@/lib/playlists/import-readiness"
import { asRekordboxXml, syntheticPlaylist } from "./fixtures/playlists"

/**
 * The four files the F1 audit walked through the import form (finding A3),
 * plus the one that must keep working: a playlist with no tags at all.
 *
 * The bar is one usable track. It is set that low on purpose — a set with no
 * BPM and no key is a set the product promises to handle, and a readiness check
 * that refused it would be a regression dressed as validation.
 */
describe("what earns 'ready to import'", () => {
  it("a valid export with tracks is ready, and says how many", () => {
    const verdict = assessImport(asRekordboxXml(syntheticPlaylist({ length: 12 })))

    expect(verdict.kind).toBe("ready")
    expect(verdict.kind === "ready" && verdict.tracks).toBe(12)
    expect(verdict.kind === "ready" && verdict.source).toBe("rekordbox")
  })

  it("a playlist with no BPM and no key is still ready — the product exists for those sets", () => {
    const untagged = syntheticPlaylist({ length: 6, missingBpm: 6, missingKey: 6 })
    const verdict = assessImport(asRekordboxXml(untagged))

    expect(verdict.kind).toBe("ready")
    expect(verdict.kind === "ready" && verdict.tracks).toBe(6)
  })

  it("a valid export with zero tracks is empty, not ready", () => {
    const verdict = assessImport(asRekordboxXml([]))

    expect(verdict.kind).toBe("empty")
  })

  it("a shopping list is not a playlist", () => {
    expect(assessImport("milk\nbread\n").kind).toBe("unrecognised")
  })

  it("a Rekordbox XML cut off halfway is not ready", () => {
    const whole = asRekordboxXml(syntheticPlaylist({ length: 8 }))
    const truncated = whole.slice(0, Math.floor(whole.length / 2))
    const verdict = assessImport(truncated)

    expect(verdict.kind).not.toBe("ready")
    // Which of the two it is depends on where the cut lands; both are told to
    // the person differently and both keep the button off.
    expect(["broken", "empty", "unrecognised"]).toContain(verdict.kind)
  })

  it("an empty file is not ready", () => {
    expect(assessImport("").kind).not.toBe("ready")
  })
})
