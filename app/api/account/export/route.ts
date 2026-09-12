import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { logError } from "@/lib/observability/logger"
import { isSuspended, SUSPENDED_RESPONSE } from "@/lib/auth/suspension"
import { consumeRateLimit } from "@/services/rate-limit-service"
import { buildAccountExport } from "@/services/data-export-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * Download everything we hold about this account, as JSON.
 *
 * The portability half of a data-subject request (GDPR Art. 20, and the
 * equivalent under CCPA and Argentina's Ley 25.326). Before this there was no
 * way to get your own data out: the playlist export is a DJ format carrying one
 * set, and everything else needed an email and a human on the other end.
 *
 * Rate limited harder than anything else in the product — three an hour. This is
 * the one endpoint that returns an entire account in a single response, so it is
 * both the most valuable thing to fetch with a borrowed session and the most
 * expensive query we run. Nobody legitimately needs a fourth copy within an hour.
 */
export async function GET() {
  const { user } = await withAuth()

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  if (isSuspended(profile)) {
    return NextResponse.json(SUSPENDED_RESPONSE.body, {
      status: SUSPENDED_RESPONSE.status,
    })
  }

  const rate = await consumeRateLimit({
    key: `account-export:${profile.id}`,
    limit: 3,
    windowMs: 60 * 60_000,
  })

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
      }
    )
  }

  try {
    const data = await buildAccountExport(profile.id)

    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const stamp = new Date().toISOString().slice(0, 10)

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // Attachment rather than inline: this is a file someone keeps, and a
        // browser rendering a whole account as a wall of JSON helps nobody.
        "Content-Disposition": `attachment; filename="energycurve-my-data-${stamp}.json"`,
        // Never cached, anywhere. It is an entire account in one response.
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    })
  } catch (error) {
    logError("account.export_failed", error, { profileId: profile.id })

    return NextResponse.json({ error: "export_failed" }, { status: 500 })
  }
}
