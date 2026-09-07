/**
 * Fingerprints the tracks in a Traktor collection.nml, field by field.
 *
 * This is step 2 and step 4 of the verification an alpha user's bug report
 * needs: reordering a playlist through EnergyCurve and importing the result
 * back into Traktor was costing people hotcues, comments and album tags, and
 * forcing a re-analysis. The export side is now byte-preserving and covered by
 * unit tests — but only Traktor itself can say what Traktor does with an
 * imported NML, and that answer is a diff of the collection before and after.
 *
 * Protocol:
 *   1. cp collection.nml collection.before.nml            (always keep a copy)
 *   2. node scripts/traktor-fingerprint.mjs collection.nml > before.json
 *   3. Import the exported playlist into Traktor. QUIT Traktor — the collection
 *      is only written on exit, so a comparison against a running Traktor
 *      compares against a stale file.
 *   4. node scripts/traktor-fingerprint.mjs collection.nml > after.json
 *   5. node scripts/traktor-fingerprint.mjs --diff before.json after.json
 *
 * A pass is: no field deltas on any track, and the same total entry count. A
 * changed entry count means Traktor created new entries rather than reusing the
 * DJ's — which is the mechanism the collection analysis could not settle, and
 * the one that makes a track come back needing analysis.
 *
 * Reads only. Never writes to a collection.
 */

import { readFileSync } from "node:fs"

/** Fields whose loss is what the bug report described. */
const TRACKED_ATTRS = [
  "AUDIO_ID",
  "LOCK",
  "MODIFIED_DATE",
  "TITLE",
  "ARTIST",
]

const TRACKED_INFO = [
  "COMMENT",
  "COMMENT2",
  "KEY",
  "KEY_LYRICS",
  "GENRE",
  "LABEL",
  "PRODUCER",
  "RANKING",
  "FLAGS",
  "PLAYCOUNT",
  "LAST_PLAYED",
  "IMPORT_DATE",
  "RELEASE_DATE",
  "COVERARTID",
  "BITRATE",
  "PLAYTIME",
  "PLAYTIME_FLOAT",
  "FILESIZE",
]

const TRACKED_CHILDREN = [
  "CUE_V2",
  "LOOPINFO",
  "LOUDNESS",
  "ALBUM",
  "MODIFICATION_INFO",
  "MUSICAL_KEY",
  "TEMPO",
  "STEMS",
]

function attrs(startTag) {
  return Object.fromEntries(
    [...startTag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]])
  )
}

function fingerprint(xml) {
  const out = {}
  let entries = 0

  for (const match of xml.matchAll(/<ENTRY [\s\S]*?<\/ENTRY>/g)) {
    const entry = match[0]
    const location = entry.match(/<LOCATION ([^>]*?)\/?>/)

    // A playlist reference (<ENTRY><PRIMARYKEY/></ENTRY>) has no LOCATION.
    if (!location) {
      continue
    }

    entries++

    const loc = attrs(location[1])
    const key = `${loc.VOLUME ?? ""}${loc.DIR ?? ""}${loc.FILE ?? ""}`
    const own = attrs(entry.slice(0, entry.indexOf(">")))
    const info = entry.match(/<INFO ([^>]*?)\/?>/)
    const infoAttrs = info ? attrs(info[1]) : {}

    const record = { volumeId: loc.VOLUMEID ?? null }

    for (const name of TRACKED_ATTRS) {
      record[name] = own[name] ?? null
    }

    for (const name of TRACKED_INFO) {
      record[`INFO.${name}`] = infoAttrs[name] ?? null
    }

    for (const name of TRACKED_CHILDREN) {
      record[`<${name}>`] = (entry.match(new RegExp(`<${name}[\\s/>]`, "g")) ?? [])
        .length
    }

    out[key] = record
  }

  return { entries, tracks: out }
}

function diff(beforePath, afterPath) {
  const before = JSON.parse(readFileSync(beforePath, "utf8"))
  const after = JSON.parse(readFileSync(afterPath, "utf8"))

  const lines = []
  let changed = 0

  if (before.entries !== after.entries) {
    lines.push(
      `COLLECTION SIZE: ${before.entries} -> ${after.entries} ` +
        `(${after.entries > before.entries ? "Traktor CREATED entries — a reference did not match an existing track" : "entries disappeared"})`
    )
  }

  for (const [key, fields] of Object.entries(before.tracks)) {
    const now = after.tracks[key]

    if (!now) {
      lines.push(`GONE: ${key}`)
      changed++
      continue
    }

    for (const [field, value] of Object.entries(fields)) {
      if (JSON.stringify(now[field]) !== JSON.stringify(value)) {
        lines.push(
          `${key}\n    ${field}: ${JSON.stringify(value)} -> ${JSON.stringify(now[field])}`
        )
        changed++
      }
    }
  }

  for (const key of Object.keys(after.tracks)) {
    if (!before.tracks[key]) {
      lines.push(`NEW: ${key}`)
      changed++
    }
  }

  console.log(lines.length ? lines.join("\n") : "no changes")
  console.log(
    `\n${changed} field delta(s) across ${Object.keys(before.tracks).length} tracks`
  )

  return changed === 0 && before.entries === after.entries
}

const [first, ...rest] = process.argv.slice(2)

if (first === "--diff") {
  const clean = diff(rest[0], rest[1])
  console.log(clean ? "\nPASS — the collection is untouched." : "\nFAIL")
  process.exit(clean ? 0 : 1)
} else if (!first) {
  console.error(
    "usage: node scripts/traktor-fingerprint.mjs <collection.nml>\n" +
      "       node scripts/traktor-fingerprint.mjs --diff before.json after.json"
  )
  process.exit(2)
} else {
  console.log(JSON.stringify(fingerprint(readFileSync(first, "utf8")), null, 2))
}
