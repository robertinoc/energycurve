import type { Database } from "@/types/database"
import type {
  PlaylistContext,
  SupportedGenre,
} from "@/lib/product/strategy"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Playlist = Database["public"]["Tables"]["playlists"]["Row"]
export type Track = Database["public"]["Tables"]["tracks"]["Row"]
export type { PlaylistContext, SupportedGenre }

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

export interface PlaylistWithTrackCount extends Playlist {
  trackCount: number
}

export interface PlaylistWithTracks extends Playlist {
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
