import { XMLParser } from "fast-xml-parser"

import {
  extractEnergyFromComment,
  parseBpm,
  parseDurationSeconds,
  type ImportedTrack,
  type ParsedImport,
} from "@/lib/playlists/imported-track"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "ENTRY" || name === "NODE",
})

interface RawEntry {
  "@_TITLE"?: string
  "@_ARTIST"?: string
  LOCATION?: { "@_DIR"?: string; "@_FILE"?: string; "@_VOLUME"?: string }
  INFO?: { "@_GENRE"?: string; "@_COMMENT"?: string; "@_KEY"?: string; "@_PLAYTIME"?: string }
  TEMPO?: { "@_BPM"?: string }
  MUSICAL_KEY?: { "@_VALUE"?: string }
  PRIMARYKEY?: { "@_TYPE"?: string; "@_KEY"?: string }
}

interface RawNode {
  "@_TYPE"?: string
  "@_NAME"?: string
  SUBNODES?: { NODE?: RawNode[] }
  PLAYLIST?: { ENTRY?: RawEntry[] }
}

/** Detects whether an XML string looks like a Traktor NML export. */
export function isTraktorNml(xml: string): boolean {
  return xml.includes("<NML")
}

/** Traktor identifies a collection track by VOLUME + DIR + FILE. */
function locationKey(location: RawEntry["LOCATION"]): string | null {
  if (!location) {
    return null
  }

  const volume = location["@_VOLUME"] ?? ""
  const dir = location["@_DIR"] ?? ""
  const file = location["@_FILE"] ?? ""

  const key = `${volume}${dir}${file}`
  return key || null
}

function toImportedTrack(raw: RawEntry): ImportedTrack {
  const artist = (raw["@_ARTIST"] ?? "").trim()
  const name = (raw["@_TITLE"] ?? "").trim()
  const comment = raw.INFO?.["@_COMMENT"] ?? null

  return {
    artist,
    name,
    bpm: parseBpm(raw.TEMPO?.["@_BPM"]),
    key: (raw.INFO?.["@_KEY"] ?? "").trim() || null,
    genre: (raw.INFO?.["@_GENRE"] ?? "").trim() || null,
    energy: extractEnergyFromComment(comment),
    sourceUri: locationKey(raw.LOCATION),
    comment: (comment ?? "").trim() || null,
    durationSeconds: parseDurationSeconds(raw.INFO?.["@_PLAYTIME"]),
  }
}

function findFirstPlaylistNode(node: RawNode): RawNode | null {
  if (
    node["@_TYPE"] === "PLAYLIST" &&
    (node.PLAYLIST?.ENTRY?.length ?? 0) > 0
  ) {
    return node
  }

  for (const child of node.SUBNODES?.NODE ?? []) {
    const found = findFirstPlaylistNode(child)

    if (found) {
      return found
    }
  }

  return null
}

/**
 * Parses a Traktor NML export into an ordered tracklist.
 *
 * Traktor stores tracks once in <COLLECTION> and references them from
 * playlists by their file location (VOLUME+DIR+FILE) rather than a numeric
 * id. We index the collection by location key, then resolve the first
 * playlist node's ordered PRIMARYKEY references. Falls back to collection
 * order when no playlist node is present. Throws if unparseable/empty.
 */
export function parseTraktor(xml: string): ParsedImport {
  const doc = parser.parse(xml) as {
    NML?: {
      COLLECTION?: { ENTRY?: RawEntry[] }
      PLAYLISTS?: { NODE?: RawNode[] }
    }
  }

  const root = doc.NML

  if (!root) {
    throw new Error("Not a Traktor NML export.")
  }

  const collectionEntries = root.COLLECTION?.ENTRY ?? []
  const byLocation = new Map<string, RawEntry>()

  for (const entry of collectionEntries) {
    const key = locationKey(entry.LOCATION)

    if (key) {
      byLocation.set(key, entry)
    }
  }

  let ordered: RawEntry[] = []
  let playlistName: string | null = null

  for (const node of root.PLAYLISTS?.NODE ?? []) {
    const playlistNode = findFirstPlaylistNode(node)

    if (playlistNode) {
      playlistName = (playlistNode["@_NAME"] ?? "").trim() || null
      ordered = (playlistNode.PLAYLIST?.ENTRY ?? [])
        .map((entry) => {
          const key = entry.PRIMARYKEY?.["@_KEY"]
          return key ? byLocation.get(key) : undefined
        })
        .filter((e): e is RawEntry => Boolean(e))
      break
    }
  }

  const source = ordered.length > 0 ? ordered : collectionEntries

  const tracks = source
    .map(toImportedTrack)
    .filter((t) => t.artist || t.name)

  if (tracks.length === 0) {
    throw new Error("No tracks found in the Traktor export.")
  }

  return { source: "traktor", playlistName, tracks }
}
