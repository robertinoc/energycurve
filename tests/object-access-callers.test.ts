import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Pins the call sites of the service functions that do NOT check access themselves.
 *
 * Context that makes this load-bearing: RLS is on with zero policies and the
 * whole app reaches the database through the service-role key, so the database
 * grants everything and these functions ARE the access control. Most of them
 * scope their own query by owner. Three deliberately don't, because what stands
 * in for ownership lives at the call site — an HMAC signature, or a
 * collaborator row checked a few lines earlier.
 *
 * That is a fine design and the audit of 11/09/2026 found no IDOR under it. But
 * it is a property of the CALLERS, and nothing was holding the callers still.
 * `getPlaylistWithTracksById` already carried a comment claiming "the only
 * caller is the signed-link route" while a second caller had appeared in
 * collaboration-service. That second caller happens to be safe; the comment
 * being wrong is what isn't, because the comment is what the next person reads
 * before adding a third.
 *
 * So: adding a caller has to be a deliberate act that updates this list, and
 * the diff makes someone say out loud what stands in for ownership there.
 */

const ROOT = process.cwd()

/** Every file that could call one of these, excluding build output and tests. */
function sourceFiles(): string[] {
  const found: string[] = []

  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name)

      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".claude", "dist"].includes(entry.name)) {
          continue
        }
        walk(path)
      } else if (/\.tsx?$/.test(entry.name)) {
        found.push(path)
      }
    }
  }

  for (const dir of ["app", "lib", "services", "components"]) walk(dir)

  return found
}

const FILES = sourceFiles().map((path) => ({
  path: relative(ROOT, path),
  source: readFileSync(join(ROOT, path), "utf8"),
}))

/**
 * function → the files allowed to call it, each with what replaces the missing
 * ownership check. The reason is the point: a list without one is a list nobody
 * can review.
 */
const UNGUARDED: Record<string, Record<string, string>> = {
  // Loads a playlist by id with no owner filter at all.
  getPlaylistWithTracksById: {
    "app/c/[token]/page.tsx":
      "the HMAC in the share token is verified before this runs, and an id " +
      "cannot be walked without producing a valid signature",
    "services/collaboration-service.ts":
      "getSharedPlaylist reads set_collaborators for (playlist_id, invited_email) " +
      "and returns null before reaching this when the viewer has no row",
  },
  // Reads every suggestion on a playlist — free text plus author emails.
  listSuggestions: {
    "app/dashboard/playlists/[id]/page.tsx":
      "the page loads the playlist through getOwnedPlaylistWithTracks and calls " +
      "notFound() first, so a non-owner never reaches this line",
    "app/dashboard/shared/[id]/page.tsx":
      "getSharedPlaylist has already returned null → notFound() for anyone " +
      "without a collaborator row",
  },
  // Reads who holds the edit turn on any playlist, including their profile id.
  getLockState: {
    "app/dashboard/playlists/actions.ts":
      "reached only inside reorderSharedTracksAction, after mayHoldLock",
    "app/dashboard/shared/[id]/page.tsx":
      "same collaborator gate as above, earlier in the same page",
    "services/collaboration-service.ts":
      "takeEditLock calls mayHoldLock before this, and the UPDATE is " +
      "conditional on the lock being free, ours, or expired",
  },
}

describe("service functions that rely on their callers for access control", () => {
  for (const [fn, allowed] of Object.entries(UNGUARDED)) {
    it(`${fn} is only called from the call sites that guard it`, () => {
      const callers = FILES.filter(
        ({ source }) =>
          // The definition itself, and a file that only imports the name, don't count.
          !source.includes(`export async function ${fn}`) &&
          new RegExp(`\\b${fn}\\s*\\(`).test(source)
      ).map(({ path }) => path)

      const unexpected = callers.filter((path) => !(path in allowed))

      expect(
        unexpected,
        `${fn} does not check access itself — what stands in for ownership ` +
          `lives at the call site. A new caller has to say what that is: add it ` +
          `to UNGUARDED in this test with the reason, or route it through a ` +
          `function that scopes by owner.`
      ).toEqual([])
    })

    it(`${fn}'s allowed list has no call site that has gone away`, () => {
      // A stale entry is the other half of the same problem: it grants
      // permission to a file that may have been rewritten into something else.
      const present = FILES.filter(({ source }) =>
        new RegExp(`\\b${fn}\\s*\\(`).test(source)
      ).map(({ path }) => path)

      const gone = Object.keys(allowed).filter((path) => !present.includes(path))

      expect(gone, `Remove these from UNGUARDED.${fn} — they no longer call it.`)
        .toEqual([])
    })
  }
})
