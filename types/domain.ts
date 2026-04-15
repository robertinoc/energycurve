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
