import Link from "next/link"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { BackstageNav } from "./BackstageNav"

interface BackstageShellProps {
  email: string
  logoutAction: () => Promise<void>
  children: React.ReactNode
}

export function BackstageShell({
  email,
  logoutAction,
  children,
}: BackstageShellProps) {
  return (
    <div className="min-h-screen bg-ec-bg text-ec-text">
      <header className="sticky top-0 z-20 border-b border-ec-border bg-ec-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <EnergyCurveLogo tone="light" size="sm" kind="horizontal" />
            <Badge variant="peak">Backstage</Badge>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-ec-text-dim sm:inline">
              {email}
            </span>
            <Link
              href="/dashboard"
              className="text-xs font-bold text-ec-cyan hover:underline"
            >
              Open app
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="xs">
                Log out
              </Button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <BackstageNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
