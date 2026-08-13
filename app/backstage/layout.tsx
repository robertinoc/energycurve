import { signOut } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthProvider } from "@/components/providers/auth-provider"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { requireBackstageSession } from "@/lib/backstage/guard"

import { BackstageShell } from "./BackstageShell"

export const metadata: Metadata = {
  title: {
    default: "Backstage · EnergyCurve",
    template: "%s · Backstage",
  },
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function logoutAction() {
  "use server"

  try {
    await signOut({ returnTo: "/" })
  } catch (error) {
    logWorkOSRuntimeError("Backstage logout failed", error)
    redirect("/")
  }
}

export default async function BackstageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireBackstageSession()

  // AuthProvider mounts here rather than in the root layout — it needs a
  // proxy.ts-matched route, and both /backstage/:path* and the backstage
  // subdomain are matched.
  return (
    <AuthProvider>
      <BackstageShell email={session.email} logoutAction={logoutAction}>
        {children}
      </BackstageShell>
    </AuthProvider>
  )
}
