import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  buildShareToken,
  isCurveSharingConfigured,
  readShareToken,
} from "@/lib/playlists/share-token"

const SECRET = "test-secret-value"
const OTHER_SECRET = "a-different-secret"
const PLAYLIST = "9f8b7c6d-1234-4a5b-8c9d-0e1f2a3b4c5d"

describe("share tokens", () => {
  beforeEach(() => {
    process.env.CURVE_SHARE_SECRET = SECRET
  })

  afterEach(() => {
    delete process.env.CURVE_SHARE_SECRET
  })

  it("round-trips a playlist id", () => {
    expect(readShareToken(buildShareToken(PLAYLIST)!)).toBe(PLAYLIST)
  })

  it("produces the same link for the same set every time", () => {
    // So posting, deleting and reposting doesn't scatter orphan URLs.
    expect(buildShareToken(PLAYLIST)).toBe(buildShareToken(PLAYLIST))
  })

  it("rejects a token whose id was swapped for another", () => {
    // The whole point: you can't walk the id space to find other people's sets.
    const token = buildShareToken(PLAYLIST)!
    const forged = token.replace(PLAYLIST, "00000000-0000-4000-8000-000000000000")

    expect(readShareToken(forged)).toBeNull()
  })

  it("rejects a tampered signature", () => {
    const token = buildShareToken(PLAYLIST)!
    const [id, signature] = token.split(".")
    const flipped = signature[0] === "a" ? "b" : "a"

    expect(readShareToken(`${id}.${flipped}${signature.slice(1)}`)).toBeNull()
  })

  it("rejects a token signed with a different secret", () => {
    // Rotating the secret is the only revocation there is, so it has to work.
    const token = buildShareToken(PLAYLIST)!
    process.env.CURVE_SHARE_SECRET = OTHER_SECRET

    expect(readShareToken(token)).toBeNull()
  })

  it("rejects malformed input instead of throwing", () => {
    for (const bad of ["", ".", "nodot", `${PLAYLIST}.`, `.${PLAYLIST}`]) {
      expect(readShareToken(bad), bad).toBeNull()
    }
  })

  it("is off entirely when no secret is configured", () => {
    const token = buildShareToken(PLAYLIST)!
    delete process.env.CURVE_SHARE_SECRET

    expect(isCurveSharingConfigured()).toBe(false)
    expect(buildShareToken(PLAYLIST)).toBeNull()
    expect(readShareToken(token)).toBeNull()
  })
})
