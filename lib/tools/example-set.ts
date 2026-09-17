import type { ImportedTrack } from "@/lib/playlists/imported-track"

/**
 * A set to try the tool with when you don't have an export handy.
 *
 * Most people who land here from a search are not sitting at the machine with
 * their library on it. Without something to press, the page is a file input and
 * a promise — and a file input is not a demo.
 *
 * The track names are invented and the artists are real names used as plausible
 * placeholders, the same convention `tests/fixtures/playlists.ts` already uses.
 * Nothing here claims to be a real set anybody played.
 *
 * **The set is deliberately imperfect.** It peaks at track 4 of 12 and then has
 * nowhere to go, and it steps 8 → 4 across one transition. A demo that scores
 * 9.4 shows a chart and teaches nothing; this one shows what the tool is for the
 * moment the curve is drawn. Full tags throughout — BPM, key, energy — because
 * the example should show the good case, and the page explains the degraded one
 * separately.
 */
export const EXAMPLE_SET_NAME = "Peak time — 90 min"

export const EXAMPLE_SET: ImportedTrack[] = [
  ["Nite Fleit", "First Light", 122, "8A", 4],
  ["Or:la", "Slow Burn", 124, "8A", 5],
  ["Anetha", "Pressure Drop", 128, "9A", 7],
  ["Amelie Lens", "Ceiling", 136, "9A", 9],
  ["Skee Mask", "Breather", 126, "4A", 4],
  ["Perc", "Undertow", 130, "9A", 6],
  ["I Hate Models", "Back Up", 134, "10A", 7],
  ["Charlotte de Witte", "Hold It", 138, "10A", 8],
  ["Kobosil", "Second Wind", 140, "2A", 8],
  ["Rødhåd", "Long Way Down", 134, "11A", 7],
  ["Maceo Plex", "Come Down", 128, "11A", 6],
  ["Roman Flügel", "Last One", 122, "4A", 4],
].map(([artist, name, bpm, key, energy]) => ({
  artist: artist as string,
  name: name as string,
  bpm: bpm as number,
  key: key as string,
  genre: "Techno",
  energy: energy as number,
  sourceUri: null,
  comment: null,
  // Four to seven minutes, varied — a set where every track is exactly 5:00
  // makes the timing read look synthetic, because it is.
  durationSeconds: 240 + ((bpm as number) % 7) * 30,
}))
