import { signOut } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export const metadata: Metadata = {
  title: "Account suspended",
  robots: { index: false, follow: false },
}

async function signOutAction() {
  "use server"

  try {
    await signOut({ returnTo: "/" })
  } catch (error) {
    logWorkOSRuntimeError("Suspended-account sign out failed", error)
    redirect("/")
  }
}

export default function AccountSuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ec-bg px-4 text-ec-text">
      <div className="w-full max-w-md space-y-6">
        <EnergyCurveLogo tone="light" size="sm" kind="horizontal" />
        <Card>
          <CardHeader>
            <CardTitle>This account is suspended</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ec-text-muted">
              Your EnergyCurve account has been suspended and cannot access the
              product right now. Your playlists and analyses are preserved.
            </p>
            <p className="text-sm text-ec-text-muted">
              If you believe this is a mistake, contact{" "}
              <a
                href="mailto:energycurve.dev@gmail.com"
                className="font-bold text-ec-cyan hover:underline"
              >
                energycurve.dev@gmail.com
              </a>
              .
            </p>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
