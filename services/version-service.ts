import "server-only"

import { computeSetScore } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { logError, logInfo } from "@/lib/observability/logger"
import { diffVersions, scoreDelta, type VersionDiff } from "@/lib/playlists/version-diff"
import {
  isVersionKind,
  parseSnapshot,
  sameOrder,
  snapshotOf,
  versionsToPrune,
  type PlaylistVersion,
  type VersionKind,
  type VersionTrack,
} from "@/lib/playlists/versions"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"
import type { Json } from "@/types/database"
import type { Track } from "@/types/domain"

/**
 * Set version history.
 *
 * Capture is automatic and silent: a DJ never presses "save version", so the
 * history is there when they want to ask "was my first order better?" rather than
 * only when they remembered to ask in advance.
 *
 * Recording is free on every plan; *reading* the history is PRO. Same split as
 * slot-aware planning and named shapes, and it means a free user who upgrades
 * finds their history already waiting instead of starting from empty.
 */

interface VersionRow {
  id: string
  kind: string
  tracks: Json
  set_score: number | null
  created_at: string
}

function toVersion(row: VersionRow): PlaylistVersion {
  return {
    id: row.id,
    // A row with an unrecognised kind still lists, as a plain curated entry.
    // The value only chooses a label; refusing to show the version would lose
    // history over a cosmetic mismatch.
    kind: isVersionKind(row.kind) ? row.kind : "curated",
    tracks: parseSnapshot(row.tracks),
    setScore: row.set_score,
    createdAt: row.created_at,
  }
}

/**
 * Score for a snapshot, or null when there is nothing to score it against.
 *
 * Computed at capture time and stored, because the comparison a DJ wants is what
 * each order was worth *when they played it* — and the engine keeps changing
 * underneath. Recomputing on read would silently rewrite history every time the
 * scorer improves.
 */
function scoreOf(
  tracks: readonly Track[],
  genre: SupportedGenre | null,
  context: PlaylistContext | null
): { score: number | null; resolved: Map<string, number> } {
  if (!genre || !context || tracks.length === 0) {
    return { score: null, resolved: new Map() }
  }

  const energies = resolveTrackEnergies([...tracks], context, genre)
  const resolved = new Map<string, number>()

  energies.forEach((entry, index) => {
    const trackId = entry.trackId ?? tracks[index]?.id

    if (trackId) {
      resolved.set(trackId, entry.score)
    }
  })

  return {
    score: computeSetScore(
      energies.map((entry) => entry.score),
      genre,
      context,
      energies.map((entry) => ({ source: entry.source, bpm: entry.bpm }))
    ),
    resolved,
  }
}

/** Newest first. Empty for a playlist nothing has reordered yet. */
export async function listVersions(
  playlistId: string
): Promise<PlaylistVersion[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlist_versions")
    .select("id, kind, tracks, set_score, created_at")
    .eq("playlist_id", playlistId)
    .order("created_at", { ascending: false })

  if (error) {
    // History is a side view, never the reason a page fails to render.
    logError("versions.list_failed", error, { playlistId })
    return []
  }

  return (data ?? []).map(toVersion)
}

async function insertVersion(
  playlistId: string,
  kind: VersionKind,
  tracks: VersionTrack[],
  setScore: number | null,
  createdAt?: string
): Promise<boolean> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase.from("playlist_versions").insert({
    playlist_id: playlistId,
    kind,
    tracks: tracks as unknown as Json,
    set_score: setScore,
    ...(createdAt ? { created_at: createdAt } : {}),
  })

  if (error) {
    logError("versions.insert_failed", error, { playlistId, kind })
    return false
  }

  return true
}

async function prune(playlistId: string): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlist_versions")
    .select("id, kind")
    .eq("playlist_id", playlistId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return
  }

  const doomed = versionsToPrune(
    data.map((row) => ({
      id: row.id,
      kind: isVersionKind(row.kind) ? row.kind : ("curated" as VersionKind),
    }))
  )

  if (doomed.length === 0) {
    return
  }

  await supabase
    .from("playlist_versions")
    .delete()
    .in(
      "id",
      doomed.map((version) => version.id)
    )
}

/**
 * Records the order a playlist is in, right before it changes.
 *
 * Called with the tracks as they still are, so the version describes what is
 * being replaced. Two behaviours worth knowing:
 *
 * **The original order is backfilled lazily.** The first time anything reorders a
 * playlist, the order being replaced is stored as `imported`. That covers every
 * import path — Rekordbox, Traktor, audio files, typed by hand — and every
 * playlist that existed before this feature shipped, without touching any of
 * them.
 *
 * **Identical orders aren't recorded twice.** Saving the same sequence again, or
 * reverting to where you already were, adds nothing to compare.
 *
 * Never throws. A failed capture must not fail the reorder the user asked for —
 * losing a history row is a small cost, losing their new order is not.
 */
export async function captureVersion(
  playlistId: string,
  tracks: readonly Track[],
  genre: SupportedGenre | null,
  context: PlaylistContext | null,
  kind: VersionKind = "curated"
): Promise<void> {
  try {
    if (tracks.length === 0) {
      return
    }

    const { score, resolved } = scoreOf(tracks, genre, context)
    const snapshot = snapshotOf(tracks, resolved)
    const existing = await listVersions(playlistId)

    if (existing.length === 0) {
      // Nothing recorded yet, so this order *is* the original.
      await insertVersion(playlistId, "imported", snapshot, score)
      logInfo("versions.captured", { playlistId, kind: "imported" })
      return
    }

    // An identical order is normally nothing to record — except when the *kind*
    // is new. "This is what I played" is information even when the order didn't
    // change, and it's the common case: the DJ played exactly what they planned.
    if (kind !== "played" && sameOrder(existing[0].tracks, snapshot)) {
      return
    }

    const recorded = await insertVersion(playlistId, kind, snapshot, score)

    if (recorded) {
      await prune(playlistId)
      logInfo("versions.captured", { playlistId, kind })
    }
  } catch (error) {
    logError("versions.capture_failed", error, { playlistId })
  }
}

/** One version of a playlist, or null when it doesn't belong to it. */
export async function getVersion(
  playlistId: string,
  versionId: string
): Promise<PlaylistVersion | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("playlist_versions")
    .select("id, kind, tracks, set_score, created_at")
    // Scoped by playlist as well as by id: the id alone is enough to fetch any
    // row in the table, and the caller has only proved ownership of the playlist.
    .eq("playlist_id", playlistId)
    .eq("id", versionId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return toVersion(data)
}

export interface VersionComparison {
  diff: VersionDiff
  /** The version's score, as recorded when it was captured. */
  scoreBefore: number | null
  /** The current order's score, computed now. */
  scoreAfter: number | null
  delta: number | null
}

/**
 * Compares a stored version against the order the playlist is in right now.
 *
 * The stored side keeps its recorded score; the live side is scored fresh. Those
 * two numbers can come from different engine versions, which is the honest
 * trade: rescoring the old snapshot would answer "what would that order be worth
 * today", and the question actually asked is "what was it worth then".
 */
export async function compareWithCurrent(
  playlistId: string,
  versionId: string,
  tracks: readonly Track[],
  genre: SupportedGenre | null,
  context: PlaylistContext | null
): Promise<VersionComparison | null> {
  const version = await getVersion(playlistId, versionId)

  if (!version) {
    return null
  }

  const { score, resolved } = scoreOf(tracks, genre, context)
  const current = snapshotOf(tracks, resolved)

  return {
    diff: diffVersions(version.tracks, current),
    scoreBefore: version.setScore,
    scoreAfter: score,
    delta: scoreDelta(version.setScore, score),
  }
}
