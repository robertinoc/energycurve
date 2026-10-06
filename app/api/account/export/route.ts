import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { logError } from "@/lib/observability/logger"
import { isSuspended, SUSPENDED_RESPONSE } from "@/lib/auth/suspension"
import { consumeRateLimit } from "@/services/rate-limit-service"
import { ExportIncompleteError } from "@/lib/privacy/export-incomplete"
import { buildAccountExport } from "@/services/data-export-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * Five minutes, said out loud rather than inherited.
 *
 * Measured against dev (docs/qa/carga-2026-10.md): 30,000 tracks take about 20
 * seconds to export and 60,000 about 30. The project runs Fluid compute on the
 * Hobby plan — read from the Vercel API on 06/10/2026 — where 300 s is both the
 * default and the ceiling. Declared here so the export's dependence on it is
 * visible: without Fluid compute the Hobby default is far shorter, and a large
 * export would be cut off by the platform with a bodiless 504.
 */
export const maxDuration = 300

/**
 * The body goes out in slices of this size.
 *
 * Vercel refuses a function response body over 4.5 MB with
 * `413 FUNCTION_PAYLOAD_TOO_LARGE`, and says streamed responses are not subject
 * to that limit. A 30,000-track export is far past 4.5 MB, so sending it as one
 * string would fail in production for exactly the libraries that most need a
 * working export — and nothing in dev or in a test would show it.
 */
const STREAM_CHUNK_BYTES = 64 * 1024

/** A JSON string sent as a stream of byte slices, so its size is never one body. */
function streamJson(json: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(json)
  let offset = 0

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close()
        return
      }

      const end = Math.min(offset + STREAM_CHUNK_BYTES, bytes.length)
      controller.enqueue(bytes.subarray(offset, end))
      offset = end
    },
  })
}

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

    return new NextResponse(streamJson(JSON.stringify(data, null, 2)), {
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
    if (error instanceof ExportIncompleteError) {
      // Not delivered, and said so. The alternative this replaces was a file
      // labelled "all your data" with some of it missing — zero tracks for a
      // library of 400 sets. The table and reason go to the log, not to the
      // caller.
      logError("account.export_incomplete", error, {
        profileId: profile.id,
        table: error.table,
        reason: error.reason,
        ...error.detail,
      })

      return NextResponse.json(
        {
          error: "export_incomplete",
          message:
            "We could not read all of your data, so we did not send a partial copy. Nothing was cut short in a file — please try again in a few minutes, and write to hello@energycurve.app if it keeps happening.",
        },
        { status: 503, headers: { "Retry-After": "300" } }
      )
    }

    logError("account.export_failed", error, { profileId: profile.id })

    return NextResponse.json({ error: "export_failed" }, { status: 500 })
  }
}
