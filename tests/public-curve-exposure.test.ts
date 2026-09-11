import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * What the public curve page is allowed to reveal.
 *
 * `/c/[token]` is the growth loop: a link a DJ posts publicly. Its docblock
 * makes three promises — no tracklist, no owner, noindex — and until now those
 * were prose. A single `<TrackTable tracks={playlist.tracks} />` added by
 * someone who had not read the comment would publish a record selection that
 * took years to build, and nothing would have objected.
 *
 * This is a source-level check for the same reason `protected-routes.test.ts`
 * is one: the property is "this page does not do X", and the failure mode is
 * someone adding X. Driving the page would need a signed link, a seeded
 * playlist and a share secret, and would still only test the page as it is
 * today.
 */

const PAGE = join(process.cwd(), "app", "c", "[token]", "page.tsx")
const source = readFileSync(PAGE, "utf8")

/** Comments explain what the page deliberately does *not* do; strip them. */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:])\/\/.*$/gm, "$1")

describe("no tracklist", () => {
  it("never reads a track's title or artist", () => {
    // A DJ sharing "look at the shape of my night" is not sharing their record
    // selection. Showing it would make the feature unusable for exactly the
    // people most likely to post one.
    for (const field of [".artist", ".musical_key", ".comment", "track.name"]) {
      expect(code, `page reads ${field}`).not.toContain(field)
    }
  })

  it("uses the tracks only to derive the curve, never to render them", () => {
    // The two permitted uses: feeding the energy resolver, and counting.
    const uses = [...code.matchAll(/playlist\.tracks[^\s;,)]*/g)].map((m) => m[0])

    expect(uses.sort()).toEqual(
      ["playlist.tracks", "playlist.tracks.length", "playlist.tracks.length"].sort()
    )
  })

  it("renders no table, list or row component", () => {
    for (const component of ["TrackTable", "Tracklist", "<ul", "<table", "<ol"]) {
      expect(code, `page renders ${component}`).not.toContain(component)
    }
  })
})

describe("no owner, and nothing about where the night happened", () => {
  it("never reads the venue", () => {
    // venue + slot + date is where and when a person works — the most
    // identifying combination this product stores, per the RoPA. It has no
    // business on a page meant to be posted publicly.
    expect(code).not.toContain("venue")
  })

  it("never reads the slot times", () => {
    expect(code).not.toContain("slot_start")
    expect(code).not.toContain("slotStart")
  })

  it("never reads an email, a profile or a user id", () => {
    for (const field of ["email", "user_id", "profileId", "ownerEmail"]) {
      expect(code, `page reads ${field}`).not.toContain(field)
    }
  })
})

describe("the two guards that make the link private", () => {
  it("refuses an unsigned or altered token", () => {
    // `readShareToken` returns null on a bad signature, and the page 404s.
    expect(code).toContain("readShareToken")
    expect(code).toContain("notFound()")
  })

  it("answers the same 404 for a bad signature and a deleted set", () => {
    // A distinct "this link expired" would confirm the id existed, which is
    // exactly what the signature is there to keep private. Pinned because the
    // friendlier message is a tempting change.
    const notFoundCalls = (code.match(/notFound\(\)/g) ?? []).length

    expect(notFoundCalls).toBeGreaterThanOrEqual(2)
    expect(code).not.toMatch(/expired|revoked|no longer/i)
  })

  it("stays out of search results", () => {
    expect(source).toMatch(/robots:\s*\{\s*index:\s*false/)
  })
})
