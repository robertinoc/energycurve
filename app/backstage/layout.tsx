import { signOut } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

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

  return (
    <BackstageShell email={session.email} logoutAction={logoutAction}>
      {children}
    </BackstageShell>
  )
}
