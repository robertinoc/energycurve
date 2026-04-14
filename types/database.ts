export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          workos_user_id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workos_user_id: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workos_user_id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          genre: string | null
          context: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          genre?: string | null
          context?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          genre?: string | null
          context?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          id: string
          playlist_id: string
          position: number
          artist: string
          name: string
          bpm: number | null
          energy_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          position: number
          artist: string
          name: string
          bpm?: number | null
          energy_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          position?: number
          artist?: string
          name?: string
          bpm?: number | null
          energy_score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
