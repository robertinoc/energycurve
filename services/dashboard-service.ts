import "server-only"
import { fetchAllRows } from "@/lib/supabase/paginate"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import type {
  DashboardSnapshot,
  Playlist,
  WorkOSUserIdentity,
} from "@/types/domain"

type PlaylistNameJoins = {
  custom_context: { name: string } | null
  custom_genre: { name: string } | null
}

const LATEST_PLAYLISTS_LIMIT = 5

/** Sparkline window: last N recorded analyses per playlist. */
const SCORE_HISTORY_LIMIT = 12

export async function getDashboardSnapshot(
  user: WorkOSUserIdentity
): Promise<DashboardSnapshot> {
  const supabase = getSupabaseAdminClient()
  const profile = await syncProfileFromWorkOSUser(user)

  /**
   * Paged, because `count: "exact"` was only ever half an answer.
   *
   * The total below has always been right — PostgREST computes it from the
   * query, not from the page it returns. The *list* was capped at 1000 with
   * nothing saying so, which meant the number at the top of the dashboard and
   * the sets under it could disagree, and the disagreement was invisible.
   */
  const { rows: playlistRows, error: playlistsError } = await fetchAllRows<
    Playlist & PlaylistNameJoins
  >((from, to) =>
    supabase
      .from("playlists")
      .select(
        "*, custom_context:user_contexts(name), custom_genre:user_genres(name)"
      )
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .range(from, to) as never
  )

  if (playlistsError) {
    throw new Error("Unable to load playlists for the dashboard.")
  }

  const rows = playlistRows
  const playlistCount = rows.length
  const playlistIds = rows.map((playlist) => playlist.id)
  const latestRows = rows.slice(0, LATEST_PLAYLISTS_LIMIT)

  let trackCount = 0
  const trackCounts = new Map<string, number>()

  if (playlistIds.length > 0) {
    /**
     * Counted by the database, with no rows crossing the wire.
     *
     * This used to `select("playlist_id")` for every track the user owns and
     * tally them in a `Map` — so a 30,000-track library moved 30,000 rows on
     * every dashboard load, and PostgREST's 1000-row ceiling then cut it to the
     * first page without a word. The total came out as 1000 and the per-set
     * counts came out as however those first 1000 rows happened to be
     * distributed: the sets near the top looked full and the rest looked empty.
     *
     * `head: true` asks the same question and brings back no body at all.
     *
     * The per-set counts are only rendered for the five most recent sets
     * (`LATEST_PLAYLISTS_LIMIT`), so this is six bodiless queries whatever the
     * library holds — not one per playlist.
     */
    const [{ count: total, error: tracksError }, ...perPlaylist] =
      await Promise.all([
        supabase
          .from("tracks")
          .select("id", { count: "exact", head: true })
          .in("playlist_id", playlistIds),
        ...latestRows.map((playlist) =>
          supabase
            .from("tracks")
            .select("id", { count: "exact", head: true })
            .eq("playlist_id", playlist.id)
            .then((result) => ({ id: playlist.id, ...result }))
        ),
      ])

    if (tracksError) {
      throw new Error("Unable to load tracks for the dashboard.")
    }

    trackCount = total ?? 0

    for (const result of perPlaylist) {
      trackCounts.set(result.id, result.count ?? 0)
    }
  }
  const scoreHistories = new Map<string, number[]>()

  if (latestRows.length > 0) {
    const { data: analysisRows, error: analysesError } = await supabase
      .from("analyses")
      .select("playlist_id, set_score, created_at")
      .in(
        "playlist_id",
        latestRows.map((playlist) => playlist.id)
      )
      .order("created_at", { ascending: true })

    if (analysesError) {
      // Score history is decoration — never fail the dashboard over it
      // (e.g. an environment that hasn't run migration 0003 yet).
      console.warn("dashboard.score_history_unavailable", analysesError.message)
    }

    for (const row of analysisRows ?? []) {
      const history = scoreHistories.get(row.playlist_id) ?? []
      history.push(Number(row.set_score))
      scoreHistories.set(row.playlist_id, history)
    }
  }

  return {
    profile,
    playlistCount: playlistCount ?? 0,
    trackCount,
    latestPlaylists: latestRows.map(({ custom_context, custom_genre, ...playlist }) => ({
      ...playlist,
      custom_context_name: custom_context?.name ?? null,
      custom_genre_name: custom_genre?.name ?? null,
      trackCount: trackCounts.get(playlist.id) ?? 0,
      scoreHistory: (scoreHistories.get(playlist.id) ?? []).slice(
        -SCORE_HISTORY_LIMIT
      ),
    })),
  }
}
