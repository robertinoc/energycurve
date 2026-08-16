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
      feature_usage: {
        Row: {
          id: string
          profile_id: string
          capability: string
          period_start: string
          used: number
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          capability: string
          period_start: string
          used?: number
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          capability?: string
          period_start?: string
          used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          workos_user_id: string
          email: string
          preferred_locale: string | null
          suspended_at: string | null
          plan: string
          plan_status: string | null
          plan_current_period_end: string | null
          plan_cancel_at: string | null
          plan_cancellation_feedback: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workos_user_id: string
          email: string
          preferred_locale?: string | null
          suspended_at?: string | null
          plan?: string
          plan_status?: string | null
          plan_current_period_end?: string | null
          plan_cancel_at?: string | null
          plan_cancellation_feedback?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workos_user_id?: string
          email?: string
          preferred_locale?: string | null
          suspended_at?: string | null
          plan?: string
          plan_status?: string | null
          plan_current_period_end?: string | null
          plan_cancel_at?: string | null
          plan_cancellation_feedback?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          id: string
          type: string
          profile_id: string | null
          payload: Json | null
          processed_at: string
        }
        Insert: {
          id: string
          type: string
          profile_id?: string | null
          payload?: Json | null
          processed_at?: string
        }
        Update: {
          id?: string
          type?: string
          profile_id?: string | null
          payload?: Json | null
          processed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_versions: {
        Row: {
          id: string
          playlist_id: string
          kind: string
          tracks: Json
          set_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          kind: string
          tracks: Json
          set_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          kind?: string
          tracks?: Json
          set_score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_versions_playlist_id_fkey"
            columns: ["playlist_id"]
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      curve_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          anchors: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          anchors: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          anchors?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curve_templates_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          genre: Database["public"]["Enums"]["playlist_genre"] | null
          context: Database["public"]["Enums"]["playlist_context"] | null
          import_source: string | null
          slot_start_minutes: number | null
          slot_end_minutes: number | null
          target_shape: string | null
          target_template_id: string | null
          custom_context_id: string | null
          custom_genre_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          genre?: Database["public"]["Enums"]["playlist_genre"] | null
          context?: Database["public"]["Enums"]["playlist_context"] | null
          import_source?: string | null
          slot_start_minutes?: number | null
          slot_end_minutes?: number | null
          target_shape?: string | null
          target_template_id?: string | null
          custom_context_id?: string | null
          custom_genre_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          genre?: Database["public"]["Enums"]["playlist_genre"] | null
          context?: Database["public"]["Enums"]["playlist_context"] | null
          import_source?: string | null
          slot_start_minutes?: number | null
          slot_end_minutes?: number | null
          target_shape?: string | null
          target_template_id?: string | null
          custom_context_id?: string | null
          custom_genre_id?: string | null
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
          source_uri: string | null
          musical_key: string | null
          genre: string | null
          comment: string | null
          duration_seconds: number | null
          perceived_db: number | null
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
          source_uri?: string | null
          musical_key?: string | null
          genre?: string | null
          comment?: string | null
          duration_seconds?: number | null
          perceived_db?: number | null
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
          source_uri?: string | null
          musical_key?: string | null
          genre?: string | null
          comment?: string | null
          duration_seconds?: number | null
          perceived_db?: number | null
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
      user_contexts: {
        Row: {
          id: string
          user_id: string
          name: string
          behaves_like: Database["public"]["Enums"]["playlist_context"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          behaves_like: Database["public"]["Enums"]["playlist_context"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          behaves_like?: Database["public"]["Enums"]["playlist_context"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_contexts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_genres: {
        Row: {
          id: string
          user_id: string
          name: string
          behaves_like: Database["public"]["Enums"]["playlist_genre"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          behaves_like: Database["public"]["Enums"]["playlist_genre"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          behaves_like?: Database["public"]["Enums"]["playlist_genre"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_genres_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          id: string
          playlist_id: string
          user_id: string
          genre: Database["public"]["Enums"]["playlist_genre"]
          context: Database["public"]["Enums"]["playlist_context"]
          set_score: number
          curve: Json
          issues: Json
          breakdown: Json
          suggested_order: Json | null
          suggested_score: number | null
          input_hash: string
          algorithm_version: number
          created_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          user_id: string
          genre: Database["public"]["Enums"]["playlist_genre"]
          context: Database["public"]["Enums"]["playlist_context"]
          set_score: number
          curve: Json
          issues: Json
          breakdown: Json
          suggested_order?: Json | null
          suggested_score?: number | null
          input_hash: string
          algorithm_version?: number
          created_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          user_id?: string
          genre?: Database["public"]["Enums"]["playlist_genre"]
          context?: Database["public"]["Enums"]["playlist_context"]
          set_score?: number
          curve?: Json
          issues?: Json
          breakdown?: Json
          suggested_order?: Json | null
          suggested_score?: number | null
          input_hash?: string
          algorithm_version?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_playlist_id_fkey"
            columns: ["playlist_id"]
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      /** Atomic "increment only while under the limit" — see migration 0014. */
      consume_feature_quota: {
        Args: {
          p_profile_id: string
          p_capability: string
          p_period_start: string
          p_limit: number
        }
        Returns: number
      }
    }
    Enums: {
      playlist_context: "opening" | "main" | "closing"
      playlist_genre:
        | "house"
        | "deep-house"
        | "organic-house"
        | "disco-house"
        | "tech-house"
        | "techno"
        | "hard-techno"
        | "melodic-techno"
        | "progressive"
        | "trance"
        | "psy-trance"
        | "bounce"
    }
    CompositeTypes: Record<string, never>
  }
}
