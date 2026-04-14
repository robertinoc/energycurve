import type { Database } from "@/types/database"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Playlist = Database["public"]["Tables"]["playlists"]["Row"]
export type Track = Database["public"]["Tables"]["tracks"]["Row"]

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
