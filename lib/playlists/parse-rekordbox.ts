import { EmptyImportError } from "@/lib/playlists/imported-track"
import { XMLParser } from "fast-xml-parser"

import { inspectXmlDocument } from "@/lib/playlists/xml-guard"

import { readEnergyTag } from "@/lib/playlists/energy-tag"
import {
  parseBpm,
  parseDurationSeconds,
  type ImportedTrack,
  type ParsedImport,
  type ParseImportOptions,
  type PlaylistChoice,
} from "@/lib/playlists/imported-track"
import {
  extractCollectionElements,
  extractSourceHeader,
  payloadsByIndex,
} from "@/lib/playlists/source-entry"

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
  /** Rekordbox's "Grouping" / "Composer" / "Label" columns — where a DJ who
   * doesn't want energy in their comments tends to put it instead. */
  "@_Grouping"?: string
  "@_Composer"?: string
  "@_Label"?: string
  "@_Location"?: string
  "@_TotalTime"?: string
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

/**
 * The playlists inside a Rekordbox export, in file order, so a caller can offer
 * the choice instead of guessing. Returns [] for a collection-only export, which
 * is not an error: the whole collection is then the tracklist.
 */
export function listRekordboxPlaylists(xml: string): PlaylistChoice[] {
  const guard = inspectXmlDocument(xml)

  if (!guard.ok) {
    return []
  }

  const root = (
    parser.parse(xml) as {
      DJ_PLAYLISTS?: { PLAYLISTS?: { NODE?: RawNode[] } }
    }
  ).DJ_PLAYLISTS

  if (!root) {
    return []
  }

  return playlistNodesOf(root).map((node, index) => ({
    index,
    name: (node["@_Name"] ?? "").trim() || null,
    trackCount: node.TRACK?.length ?? 0,
  }))
}

function toImportedTrack(
  raw: RawTrack,
  sourcePayload: string | null
): ImportedTrack {
  const artist = (raw["@_Artist"] ?? "").trim()
  const name = (raw["@_Name"] ?? "").trim()
  const comment = raw["@_Comments"] ?? null
  const energy = readEnergyTag({
    comment,
    grouping: raw["@_Grouping"],
    composer: raw["@_Composer"],
    label: raw["@_Label"],
  })

  return {
    artist,
    name,
    bpm: parseBpm(raw["@_AverageBpm"]),
    key: (raw["@_Tonality"] ?? "").trim() || null,
    genre: (raw["@_Genre"] ?? "").trim() || null,
    energy: energy?.value ?? null,
    energySource: energy?.field ?? null,
    sourceUri: (raw["@_Location"] ?? "").trim() || null,
    comment: (comment ?? "").trim() || null,
    durationSeconds: parseDurationSeconds(raw["@_TotalTime"]),
    sourcePayload,
    sourcePayloadFormat: sourcePayload ? "rekordbox_xml" : null,
  }
}

/**
 * Depth-first collection of every playlist node (Type "1") that has entries.
 *
 * This used to stop at the first one, which is how a library export holding
 * forty playlists was silently read as whichever one happened to come first in
 * the file. Collecting them all costs one more walk of a tree that is already in
 * memory, and lets a caller ask which one the DJ meant.
 *
 * Folders (Type "0") are walked through but never returned: they hold playlists,
 * they are not playlists.
 */
function collectPlaylistNodes(node: RawNode, into: RawNode[]): void {
  if (node["@_Type"] === "1" && (node.TRACK?.length ?? 0) > 0) {
    into.push(node)
  }

  for (const child of node.NODE ?? []) {
    collectPlaylistNodes(child, into)
  }
}

function playlistNodesOf(root: {
  PLAYLISTS?: { NODE?: RawNode[] }
}): RawNode[] {
  const nodes: RawNode[] = []

  for (const node of root.PLAYLISTS?.NODE ?? []) {
    collectPlaylistNodes(node, nodes)
  }

  return nodes
}

/**
 * Parses a Rekordbox XML export into an ordered tracklist.
 *
 * Rekordbox stores every track once in <COLLECTION> (keyed by TrackID) and
 * each playlist as an ordered list of TrackID references. When a playlist
 * node is present we resolve it in order; otherwise we fall back to the full
 * collection order. Throws if the XML is unparseable or has no tracks.
 */
export function parseRekordbox(
  xml: string,
  options: ParseImportOptions = {}
): ParsedImport {
  // Structural check before the parser touches it: a DOCTYPE, an entity
  // declaration or absurd nesting is refused without building a tree. See
  // lib/playlists/xml-guard.ts for why a library limit alone is not enough.
  const guard = inspectXmlDocument(xml)

  if (!guard.ok) {
    throw new Error("This XML file has a structure we refuse to parse.")
  }
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

  // The verbatim <TRACK> slices, paired by document order — this is what keeps
  // <POSITION_MARK> cues, Rating, Colour and PlayCount alive through a
  // reorder. See source-entry.ts.
  const payloadAt = payloadsByIndex(
    collectionTracks.length,
    extractCollectionElements(xml, "TRACK")
  )
  const positionOf = new Map<RawTrack, number>()

  collectionTracks.forEach((track, index) => {
    positionOf.set(track, index)
  })

  // Resolve the selected playlist node's ordered references, if any. The
  // default is index 0 — the first playlist in the file, which is what this
  // parser has always read.
  let ordered: RawTrack[] = []
  let playlistName: string | null = null

  const playlistNodes = playlistNodesOf(root)
  const playlistNode = playlistNodes[options.playlistIndex ?? 0]

  if (playlistNode) {
    playlistName = (playlistNode["@_Name"] ?? "").trim() || null
    ordered = (playlistNode.TRACK ?? [])
      .map((ref) => (ref["@_Key"] ? byId.get(ref["@_Key"]) : undefined))
      .filter((t): t is RawTrack => Boolean(t))
  }

  // Fall back to full collection order when there's no playlist node.
  const source = ordered.length > 0 ? ordered : collectionTracks

  const tracks = source
    .map((track) => {
      const position = positionOf.get(track)

      return toImportedTrack(
        track,
        position === undefined ? null : payloadAt(position)
      )
    })
    .filter((t) => t.artist || t.name)

  if (tracks.length === 0) {
    throw new EmptyImportError("No tracks found in the Rekordbox export.")
  }

  return {
    source: "rekordbox",
    playlistName,
    tracks,
    sourceHeader: extractSourceHeader(xml, "rekordbox_xml"),
  }
}
