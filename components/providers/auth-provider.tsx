"use client"

import type { ReactNode } from "react"
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components"

/**
 * WorkOS client-side auth context.
 *
 * MOUNT ONLY UNDER ROUTES MATCHED BY `proxy.ts`. On mount, AuthKitProvider
 * calls the `getAuthAction` server action, which runs `withAuth()` — and
 * `withAuth()` throws "You are calling 'withAuth' on a route that isn't
 * covered by the AuthKit middleware" whenever the request did not pass through
 * the proxy. The provider swallows that rejection client-side, so the only
 * visible symptom is a 500 on the server action POST; nothing in the UI breaks,
 * which is how it stayed unnoticed while this sat in the root layout.
 *
 * Keeping it off the public marketing/legal pages also means those pages do no
 * session work at all: they stay prerendered (`○` in the build output) and load
 * without a follow-up auth round-trip.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthKitProvider>{children}</AuthKitProvider>
}
