import "server-only"

import { logError } from "@/lib/observability/logger"
import {
  RESIDENCY_LOOKBACK_SETS,
  normalizeVenue,
  summarizeResidency,
  type PlayedSet,
  type ResidencySummary,
  type ResidencyTrack,
} from "@/lib/playlists/residency"
import { can } from "@/lib/product/capabilities"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { getProfileBilling } from "./billing-service"

/**
 * The played history at one venue, for the residency check.
 *
 * Reads only sets the DJ explicitly marked as played, at the same venue, excluding
 * the one being planned. "Marked as played" is doing real work here: a planned set
 * that was never performed says nothing about what a room has heard, and counting
 * it would produce warnings about tracks nobody ever played.
 */
async function playedSetsAtVenue(
  profileId: string,
  venue: string,
  excludePlaylistId: string,
  limit: number
): Promise<PlayedSet[]> {
  const supabase = getSupabaseAdminClient()

  // Venue matching is case- and whitespace-insensitive, and Postgres can't express
  // the same normalisation the pure module uses, so the candidate set is fetched by
  // owner and filtered here. Scoped by user_id and indexed on (user_id, venue), so
  // this reads a handful of rows rather than a table.
  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("id, name, venue")
    .eq("user_id", profileId)
    .not("venue", "is", null)

  if (error) {
    logError("residency.playlists_failed", error, { profileId })
    return []
  }

  const target = normalizeVenue(venue)
  const candidates = (playlists ?? []).filter(
    (row) => row.id !== excludePlaylistId && normalizeVenue(row.venue) === target
  )

  if (candidates.length === 0) {
    return []
  }

  const names = new Map(candidates.map((row) => [row.id, row.name]))

  const { data: versions, error: versionsError } = await supabase
    .from("playlist_versions")
    .select("playlist_id, tracks, created_at")
    .in(
      "playlist_id",
      candidates.map((row) => row.id)
    )
    .eq("kind", "played")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (versionsError) {
    logError("residency.versions_failed", versionsError, { profileId })
    return []
  }

  return (versions ?? []).flatMap((row) => {
    // The snapshot is jsonb, so a row that doesn't parse is dropped rather than
    // trusted — a half-read tracklist would produce warnings about tracks that
    // aren't in it, which is worse than no warning at all.
    if (!Array.isArray(row.tracks)) {
      return []
    }

    const tracks = row.tracks.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return []
      }

      const { artist, name } = entry as { artist?: unknown; name?: unknown }

      return typeof artist === "string" && typeof name === "string"
        ? [{ artist, name }]
        : []
    })

    return [
      {
        playlistId: row.playlist_id,
        playlistName: names.get(row.playlist_id) ?? "",
        playedAt: row.created_at,
        tracks,
      },
    ]
  })
}

/**
 * Residency warnings for a set, or a summary saying why there are none.
 *
 * Returns an empty summary when the set has no venue: that isn't an error, it's the
 * common case, and a set with no venue simply takes no part in the check.
 */
export async function getResidencySummary(
  profileId: string,
  playlist: { id: string; venue: string | null },
  tracks: readonly ResidencyTrack[],
  lookbackSets: number = RESIDENCY_LOOKBACK_SETS
): Promise<ResidencySummary> {
  const venue = playlist.venue

  // Gated here rather than in the page, because this is the only door: any future
  // caller — an API route, a boost panel, a digest email — gets the check for free
  // instead of having to remember it.
  const billing = await getProfileBilling(profileId)

  if (!can(billing.plan, billing.status, "residency_mode")) {
    // An empty summary, not an error: the caller renders nothing and the page works.
    return summarizeResidency(null, tracks, [], lookbackSets)
  }

  if (normalizeVenue(venue) === null) {
    return summarizeResidency(venue ?? null, tracks, [], lookbackSets)
  }

  const history = await playedSetsAtVenue(
    profileId,
    venue as string,
    playlist.id,
    // One extra so the summary can honestly say the window was full rather than
    // exhausted — reporting "3 of 3" and "3 of many" identically would overstate
    // how much history the check actually had.
    lookbackSets + 1
  )

  return summarizeResidency(venue ?? null, tracks, history, lookbackSets)
}
