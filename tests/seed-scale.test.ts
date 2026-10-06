import { describe, expect, it } from "vitest"

import { GENRE_BPM_PROFILES_V2 } from "@/lib/product/strategy"
import { readMigrations } from "../scripts/migration-status.mjs"
import {
  CAMELOT,
  GENRE_BPM,
  GENRES,
  MARKER,
  PRODUCTION_REF,
  assertDevTarget,
  fingerprint,
  generate,
  parseArgs,
  seedPlaylistPattern,
  seedProfilePattern,
  restVerdicts,
  schemaFromOpenApi,
} from "../scripts/seed-scale.mjs"

/**
 * The scale generator (lote 16, task 1). What is checked here is what a
 * measurement depends on and cannot see for itself: that the base is the same
 * every time, that the data is the kind the engine reads, and that the script
 * cannot be pointed at production.
 */

const small = { seed: 7, users: 3, playlists: 4, tracks: 12 }

describe("determinism", () => {
  it("the same seed writes byte-for-byte the same rows", () => {
    const a = generate(small)
    const b = generate(small)

    expect(fingerprint([...a.profiles, ...a.playlists, ...a.tracks])).toBe(
      fingerprint([...b.profiles, ...b.playlists, ...b.tracks])
    )
    expect(a.tracks[17]).toEqual(b.tracks[17])
  })

  it("a different seed writes a different base", () => {
    const a = generate(small)
    const b = generate({ ...small, seed: 8 })

    expect(fingerprint(a.tracks)).not.toBe(fingerprint(b.tracks))
  })

  it("makes exactly the volumes it was asked for", () => {
    const rows = generate({ seed: 1, users: 5, playlists: 6, tracks: 30, owners: ["owner-a"] })

    expect(rows.profiles).toHaveLength(5)
    // Six playlists for each of the five generated profiles plus the one owner.
    expect(rows.playlists).toHaveLength(36)
    expect(rows.tracks).toHaveLength(36 * 30)
  })
})

describe("plausible data, not noise", () => {
  it("keeps its BPM bands identical to the engine's GENRE_BPM_PROFILES_V2", () => {
    // The generator is plain .mjs and carries a copy. This is what stops the
    // copy from drifting into data the engine reads as out-of-genre.
    const engine = Object.fromEntries(
      Object.entries(GENRE_BPM_PROFILES_V2).map(([genre, band]) => [genre, [band.bpmLow, band.bpmHigh]])
    )

    expect(GENRE_BPM).toEqual(engine)
  })

  it("uses all twelve genres, every key valid Camelot, energy 1–10, BPM near its band", () => {
    const rows = generate({ seed: 3, users: 2, playlists: 12, tracks: 20 })

    expect(new Set(rows.playlists.map((row) => row.genre))).toEqual(new Set(GENRES))
    expect(GENRES).toHaveLength(12)

    for (const track of rows.tracks) {
      const [low, high] = GENRE_BPM[track.genre as string]
      expect(CAMELOT).toContain(track.musical_key)
      expect(track.energy_score).toBeGreaterThanOrEqual(1)
      expect(track.energy_score).toBeLessThanOrEqual(10)
      expect(track.bpm as number).toBeGreaterThanOrEqual(low - 6)
      expect(track.bpm as number).toBeLessThanOrEqual(high + 6)
    }
  })

  it("marks every row so clean can find it and nothing else", () => {
    const rows = generate(small)

    for (const profile of rows.profiles) {
      expect(String(profile.workos_user_id).startsWith(MARKER.workosPrefix)).toBe(true)
      expect(String(profile.email).endsWith(`@${MARKER.emailDomain}`)).toBe(true)
    }
    for (const playlist of rows.playlists) {
      expect(String(playlist.description).startsWith(MARKER.descriptionPrefix)).toBe(true)
    }
  })
})

describe("never production", () => {
  it("refuses the production project by name", () => {
    expect(() => assertDevTarget(`https://${PRODUCTION_REF}.supabase.co`)).toThrow(/PRODUCTION/)
  })

  it("refuses any other remote project", () => {
    expect(() => assertDevTarget("https://someotherref.supabase.co")).toThrow(/REFUSED/)
  })

  it("accepts dev and local", () => {
    expect(() => assertDevTarget("https://djoutoutkukpjrdgjqkb.supabase.co")).not.toThrow()
    expect(() => assertDevTarget("http://127.0.0.1:54321")).not.toThrow()
  })

  it("refuses a missing URL instead of defaulting to anything", () => {
    expect(() => assertDevTarget(undefined)).toThrow()
  })
})

describe("the migration gate over REST", () => {
  it("catches a missing 0005: seven genres absent from the enum", () => {
    const genre = (values: string[]) => ({
      definitions: {
        playlists: { properties: { genre: { format: "public.playlist_genre", enum: values } } },
      },
    })
    const without0005 = schemaFromOpenApi(genre(["house", "techno", "hard-techno", "melodic-techno", "progressive"]))
    const { results } = restVerdicts(readMigrations(), without0005)

    expect(results.find((result) => result.file.startsWith("0005"))?.status).toBe("missing")
  })
})

describe("arguments", () => {
  it("refuses an empty value instead of reading it as 0", () => {
    // Number("") is 0. An earlier version wrote a base with no playlists that way.
    expect(() => parseArgs(["seed", "--playlists", ""])).toThrow(/Missing value/)
  })

  it("refuses a value that is not a whole number", () => {
    expect(() => parseArgs(["seed", "--seed", "1601 10 50"])).toThrow(/whole number/)
  })

  it("refuses a flag it does not know", () => {
    expect(() => parseArgs(["seed", "--track", "40"])).toThrow(/Unknown flag/)
  })

  it("reads a well-formed command", () => {
    expect(parseArgs(["seed", "--seed", "7", "--playlists", "3", "--owner", "a@example.com"])).toEqual({
      command: "seed",
      owners: ["a@example.com"],
      seed: 7,
      playlists: 3,
    })
  })
})

describe("clean --seed (lote 18): one seed's rows and nothing else", () => {
  // Two sessions can seed the same dev database at once; a bare clean deletes
  // every marked row, including the other session's.
  it("narrows the playlists to the seed, bracket included, so 16 is not 1610", () => {
    expect(seedPlaylistPattern(16)).toBe("[scale-seed:16]")
    expect("[scale-seed:1610] generated".startsWith(seedPlaylistPattern(16))).toBe(false)
  })

  it("escapes the underscores LIKE would read as any character", () => {
    // Unescaped, scale_seed_16_ matches scale_seed_1610_0: the "_" after 16
    // would match the "1".
    expect(seedProfilePattern(16)).toBe("scale\\_seed\\_16\\_")
  })

  it("keeps the whole-database patterns when no seed is given", () => {
    expect(seedPlaylistPattern()).toBe("[scale-seed:")
    expect(seedProfilePattern()).toBe("scale_seed_")
  })

  it("accepts --seed on clean", () => {
    expect(parseArgs(["clean", "--seed", "1610"])).toMatchObject({ command: "clean", seed: 1610 })
  })
})
