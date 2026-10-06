import "server-only"

import { headers } from "next/headers"

/**
 * Two-letter country of the request, from the edge geo headers. Read on the
 * request the *browser* made — never on server-to-server hops, which would
 * geolocate a datacenter. Vercel's header first, Cloudflare's as fallback;
 * "XX" (unknown) and "T1" (Tor) are treated as absent, same as StageLink's
 * visitorCountryHeader.
 */
export async function visitorCountryCode(): Promise<string | null> {
  const store = await headers()
  const code = (
    store.get("x-vercel-ip-country") ?? store.get("cf-ipcountry")
  )
    ?.trim()
    .toUpperCase()

  if (!code || !/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") {
    return null
  }

  return code
}
