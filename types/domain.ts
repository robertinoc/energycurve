import type { Database } from "@/types/database"
import type {
  PlaylistContext,
  SupportedGenre,
} from "@/lib/product/strategy"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Playlist = Database["public"]["Tables"]["playlists"]["Row"]
export type Track = Database["public"]["Tables"]["tracks"]["Row"]
export type UserContext = Database["public"]["Tables"]["user_contexts"]["Row"]
export type UserGenre = Database["public"]["Tables"]["user_genres"]["Row"]
export type { PlaylistContext, SupportedGenre }

/**
 * Display names of the custom context/genre a playlist is tagged with
 * ("behaves like" model): the base enum stays in playlist.context/genre for
 * the engine; these labels are what the UI shows when present.
 */
export interface PlaylistTaxonomyNames {
  custom_context_name: string | null
  custom_genre_name: string | null
}

export interface WorkOSUserIdentity {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

export interface DashboardSnapshot {
  profile: Profile
  playlistCount: number
  trackCount: number
  latestPlaylists: DashboardPlaylist[]
}

export interface DashboardPlaylist extends PlaylistWithTrackCount {
  /** Chronological set scores from the analyses history (may be empty). */
  scoreHistory: number[]
}

export interface PlaylistWithTrackCount
  extends Playlist,
    PlaylistTaxonomyNames {
  trackCount: number
}

export interface PlaylistWithTracks extends Playlist, PlaylistTaxonomyNames {
  tracks: Track[]
}

export interface TrackWriteInput {
  artist: string
  name: string
  bpm: number | null
  energyScore: number | null
  /** Native file reference (Rekordbox Location / Traktor location key). */
  sourceUri?: string | null
  /** Musical key as written by the DJ software (e.g. "8A", "Am", "Bbm"). */
  musicalKey?: string | null
  /** Genre tag from the imported track, verbatim. */
  genre?: string | null
  /** Free-text comment/grouping tag from the source track. */
  comment?: string | null
  /** Track length in seconds, when the source export provides it. */
  durationSeconds?: number | null
  /** Perceived loudness in dB (Traktor PERCEIVED_DB) — energy signal (B19). */
  perceivedDb?: number | null
}

export interface ProductStrategySnapshot {
  supportedGenres: readonly SupportedGenre[]
  supportedContexts: readonly PlaylistContext[]
  energyScoreRange: {
    min: number
    max: number
  }
  standardTrackDurationMinutes: number
}
