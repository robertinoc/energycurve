import "server-only"

import type { AnalysisStatus } from "@/lib/playlists/analyze-prompt"
import { logError } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Whether this set was ever analysed.
 *
 * One head count on `analyses` — a row is written the first time the analysis
 * page renders a set (`recordAnalysisSnapshot`), so "no rows" is "nobody opened
 * the analysis". Scoped by owner as well as by playlist, like every read in the
 * service layer: the page has already checked ownership, and this must not be
 * the function that someone later calls without having done so.
 *
 * A failed read is `unknown`, never `never`: the playlist page pushes harder
 * on a set that was not analysed, and a database hiccup must not turn into a
 * nudge at someone who analysed it ten times.
 */
export async function getAnalysisStatus(
  profileId: string,
  playlistId: string
): Promise<AnalysisStatus> {
  try {
    const { count, error } = await getSupabaseAdminClient()
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("playlist_id", playlistId)
      .eq("user_id", profileId)

    if (error) {
      throw error
    }

    if (count === null) {
      return "unknown"
    }

    return count > 0 ? "analyzed" : "never"
  } catch (error) {
    logError("analysis.status_read_failed", error, { playlistId })

    return "unknown"
  }
}
