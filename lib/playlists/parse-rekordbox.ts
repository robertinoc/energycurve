import { XMLParser } from "fast-xml-parser"

import {
  extractEnergyFromComment,
  parseBpm,
  type ImportedTrack,
  type ParsedImport,
} from "@/lib/playlists/imported-track"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Force these to arrays even when there's a single child, so traversal is
  // uniform regardless of collection/playlist size.
  isArray: (name) => name === "TRACK" || name === "NODE",
})

interface RawTrack {
  "@_TrackID"?: string
  "@_Name"?: string
  "@_Artist"?: string
  "@_Genre"?: string
  "@_AverageBpm"?: string
  "@_Tonality"?: string
  "@_Comments"?: string
  "@_Location"?: string
}

interface RawNode {
  "@_Type"?: string
  "@_Name"?: string
  NODE?: RawNode[]
  TRACK?: { "@_Key"?: string }[]
}

/** Detects whether an XML string looks like a Rekordbox collection export. */
export function isRekordboxXml(xml: string): boolean {
  return xml.includes("<DJ_PLAYLISTS")
}

function toImportedTrack(raw: RawTrack): ImportedTrack {
  const artist = (raw["@_Artist"] ?? "").trim()
  const name = (raw["@_Name"] ?? "").trim()
  const comment = raw["@_Comments"] ?? null

  return {
    artist,
    name,
    bpm: parseBpm(raw["@_AverageBpm"]),
    key: (raw["@_Tonality"] ?? "").trim() || null,
    genre: (raw["@_Genre"] ?? "").trim() || null,
    energy: extractEnergyFromComment(comment),
    sourceUri: (raw["@_Location"] ?? "").trim() || null,
  }
}

/** Depth-first search for the first playlist node (Type "1") with entries. */
function findFirstPlaylistNode(node: RawNode): RawNode | null {
  if (node["@_Type"] === "1" && (node.TRACK?.length ?? 0) > 0) {
    return node
  }

  for (const child of node.NODE ?? []) {
    const found = findFirstPlaylistNode(child)

    if (found) {
      return found
    }
  }

  return null
}

/**
 * Parses a Rekordbox XML export into an ordered tracklist.
 *
 * Rekordbox stores every track once in <COLLECTION> (keyed by TrackID) and
 * each playlist as an ordered list of TrackID references. When a playlist
 * node is present we resolve it in order; otherwise we fall back to the full
 * collection order. Throws if the XML is unparseable or has no tracks.
 */
export function parseRekordbox(xml: string): ParsedImport {
  const doc = parser.parse(xml) as {
    DJ_PLAYLISTS?: {
      COLLECTION?: { TRACK?: RawTrack[] }
      PLAYLISTS?: { NODE?: RawNode[] }
    }
  }

  const root = doc.DJ_PLAYLISTS

  if (!root) {
    throw new Error("Not a Rekordbox XML export.")
  }

  const collectionTracks = root.COLLECTION?.TRACK ?? []
  const byId = new Map<string, RawTrack>()

  for (const track of collectionTracks) {
    const id = track["@_TrackID"]

    if (id) {
      byId.set(id, track)
    }
  }

  // Resolve the first playlist node's ordered references, if any.
  let ordered: RawTrack[] = []
  let playlistName: string | null = null

  const rootNodes = root.PLAYLISTS?.NODE ?? []

  for (const node of rootNodes) {
    const playlistNode = findFirstPlaylistNode(node)

    if (playlistNode) {
      playlistName = (playlistNode["@_Name"] ?? "").trim() || null
      ordered = (playlistNode.TRACK ?? [])
        .map((ref) => (ref["@_Key"] ? byId.get(ref["@_Key"]) : undefined))
        .filter((t): t is RawTrack => Boolean(t))
      break
    }
  }

  // Fall back to full collection order when there's no playlist node.
  const source = ordered.length > 0 ? ordered : collectionTracks

  const tracks = source
    .map(toImportedTrack)
    .filter((t) => t.artist || t.name)

  if (tracks.length === 0) {
    throw new Error("No tracks found in the Rekordbox export.")
  }

  return { source: "rekordbox", playlistName, tracks }
}
