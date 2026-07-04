import { NextResponse } from "next/server"

import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Public uptime probe for external monitoring (UptimeRobot, Vercel checks,
 * etc.). Reports overall status plus a cheap database reachability check.
 * Intentionally exposes no counts, versions, or configuration details.
 */
export async function GET() {
  const infrastructure = getInfrastructureStatus()
  let database: "ok" | "unreachable" | "not_configured" = "not_configured"

  if (infrastructure.supabaseConfigured) {
    try {
      const supabase = getSupabaseAdminClient()
      const { error } = await supabase
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .limit(1)

      database = error ? "unreachable" : "ok"
    } catch {
      database = "unreachable"
    }
  }

  const healthy = database === "ok"

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      auth: infrastructure.workosConfigured ? "configured" : "not_configured",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
