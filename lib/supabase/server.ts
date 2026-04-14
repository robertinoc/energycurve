import "server-only"

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

import { getServerEnv } from "@/lib/env"
import type { Database } from "@/types/database"

let supabaseAdminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient
  }

  const { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = getServerEnv()

  supabaseAdminClient = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  return supabaseAdminClient
}
