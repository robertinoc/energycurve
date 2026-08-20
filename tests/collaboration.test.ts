import { describe, expect, it } from "vitest"

import {
  SUGGESTION_MAX_LENGTH,
  may,
  normalizeInviteEmail,
  normalizeSuggestionBody,
  sameInvitee,
} from "@/lib/playlists/collaboration"

describe("normalizeInviteEmail", () => {
  it("lowercases and trims, because that's how the same person is typed twice", () => {
    expect(normalizeInviteEmail("  Robertino@Gmail.com ")).toBe(
      "robertino@gmail.com"
    )
  })

  it("does not apply Gmail's rules to everyone", () => {
    // Folding a.b@outlook.com into ab@outlook.com would hand one person's set to
    // a different person.
    expect(normalizeInviteEmail("a.b@outlook.com")).toBe("a.b@outlook.com")
    expect(normalizeInviteEmail("dj+techno@fastmail.com")).toBe(
      "dj+techno@fastmail.com"
    )
  })

  it("rejects what obviously isn't an address", () => {
    for (const bad of ["", "   ", "dj", "dj@", "@x.com", "a b@x.com", "a@b"]) {
      expect(normalizeInviteEmail(bad)).toBeNull()
    }
  })
})

describe("sameInvitee", () => {
  it("matches across casing and padding", () => {
    expect(sameInvitee("DJ@Club.com", " dj@club.com ")).toBe(true)
  })

  it("does not match two different people", () => {
    expect(sameInvitee("a@x.com", "b@x.com")).toBe(false)
  })

  it("never matches on an unusable address", () => {
    // Two invalid strings being "equal" must not grant access to anything.
    expect(sameInvitee("", "")).toBe(false)
    expect(sameInvitee("nope", "nope")).toBe(false)
  })
})

describe("may", () => {
  it("lets a collaborator read and comment, and nothing else", () => {
    expect(may("collaborator", "view")).toBe(true)
    expect(may("collaborator", "suggest")).toBe(true)

    for (const action of ["reorder", "rename", "delete", "invite"] as const) {
      expect(may("collaborator", action)).toBe(false)
    }
  })

  it("keeps resolving a suggestion with the owner", () => {
    // It means "I've dealt with this", which isn't the commenter's call.
    expect(may("owner", "resolveSuggestion")).toBe(true)
    expect(may("collaborator", "resolveSuggestion")).toBe(false)
  })

  it("gives the owner everything", () => {
    for (const action of [
      "view",
      "suggest",
      "reorder",
      "rename",
      "delete",
      "invite",
      "resolveSuggestion",
    ] as const) {
      expect(may("owner", action)).toBe(true)
    }
  })
})

describe("normalizeSuggestionBody", () => {
  it("trims", () => {
    expect(normalizeSuggestionBody("  cambiá 6 y 7  ")).toBe("cambiá 6 y 7")
  })

  it("rejects whitespace-only", () => {
    // An empty comment in a thread is noise that can't be told from a bug.
    expect(normalizeSuggestionBody("   \n ")).toBeNull()
  })

  it("rejects a body longer than the column allows", () => {
    // Matching the CHECK constraint, so the failure is a 400 rather than a
    // Postgres error surfacing as a 500.
    expect(normalizeSuggestionBody("x".repeat(SUGGESTION_MAX_LENGTH))).not.toBeNull()
    expect(normalizeSuggestionBody("x".repeat(SUGGESTION_MAX_LENGTH + 1))).toBeNull()
  })
})
