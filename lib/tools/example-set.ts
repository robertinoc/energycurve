import type { ImportedTrack } from "@/lib/playlists/imported-track"

/**
 * A set to try the tool with when you don't have an export handy.
 *
 * Most people who land here from a search are not sitting at the machine with
 * their library on it. Without something to press, the page is a file input and
 * a promise — and a file input is not a demo.
 *
 * Every name here is invented, artists as well as titles. Until 10/11/2026 the
 * artists were real DJs, borrowed from the convention in
 * `tests/fixtures/playlists.ts` — fine in a fixture nobody sees, not on a
 * public page read by the DJs who know those people, where "Amelie Lens —
 * Ceiling, 136 BPM" reads as a record that exists and doesn't. Worse, this set
 * is badly built on purpose and the page criticises it. So: invent the work,
 * invent the name. A real set with real titles is fine; a made-up work under
 * someone's real name is not.
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
  ["Halvard Esk", "First Light", 122, "8A", 4],
  ["Mirela Sond", "Slow Burn", 124, "8A", 5],
  ["Teo Vaasko", "Pressure Drop", 128, "9A", 7],
  ["Kessa Lune", "Ceiling", 136, "9A", 9],
  ["Orrin Malkov", "Breather", 126, "4A", 4],
  ["Ysolde Trace", "Undertow", 130, "9A", 6],
  ["Brannock", "Back Up", 134, "10A", 7],
  ["Anouk Veldt", "Hold It", 138, "10A", 8],
  ["Lior Haskane", "Second Wind", 140, "2A", 8],
  ["Juna Rielle", "Long Way Down", 134, "11A", 7],
  ["Corvin Tamsel", "Come Down", 128, "11A", 6],
  ["Edda Vonlauf", "Last One", 122, "4A", 4],
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
