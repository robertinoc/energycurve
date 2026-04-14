import "server-only"

import { z } from "zod"

const serverEnvSchema = z.object({
  WORKOS_API_KEY: z.string().min(1),
  WORKOS_CLIENT_ID: z.string().min(1),
  WORKOS_COOKIE_PASSWORD: z.string().min(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedServerEnv: ServerEnv | null = null

export function getServerEnv() {
  if (cachedServerEnv) {
    return cachedServerEnv
  }

  const parsedEnv = serverEnvSchema.safeParse({
    WORKOS_API_KEY: process.env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
    WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD,
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!parsedEnv.success) {
    throw new Error(
      "Missing or invalid server environment variables. Check .env.local and docs/setup-infra.md."
    )
  }

  cachedServerEnv = parsedEnv.data

  return cachedServerEnv
}
