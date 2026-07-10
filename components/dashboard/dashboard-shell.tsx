"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ListMusic, LogOut, Menu, X, type LucideIcon } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  match: "exact" | "prefix"
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, match: "exact" },
  {
    href: "/dashboard/playlists",
    label: "Playlists",
    icon: ListMusic,
    match: "prefix",
  },
]

export interface SidebarPlaylist {
  id: string
  name: string
  trackCount: number
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

interface DashboardShellProps {
  displayName: string
  email: string
  playlists: SidebarPlaylist[]
  logoutAction: () => Promise<void>
  children: React.ReactNode
}

export function DashboardShell({
  displayName,
  email,
  playlists,
  logoutAction,
  children,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sidebarBody = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" onClick={() => setDrawerOpen(false)}>
          <EnergyCurveLogo tone="light" size="sm" kind="horizontal" />
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1 text-[0.62rem] uppercase tracking-[0.22em] text-white/32">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/62 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>

              {/* Playlist tree under the Playlists item (Rekordbox left panel). */}
              {item.href === "/dashboard/playlists" && playlists.length > 0 ? (
                <ul className="mt-1 space-y-0.5 border-l border-white/8 pl-3">
                  {playlists.map((playlist) => {
                    const href = `/dashboard/playlists/${playlist.id}`
                    const playlistActive = pathname.startsWith(href)
                    return (
                      <li key={playlist.id}>
                        <Link
                          href={href}
                          onClick={() => setDrawerOpen(false)}
                          aria-current={playlistActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                            playlistActive
                              ? "bg-white/[0.07] text-white"
                              : "text-white/52 hover:bg-white/[0.05] hover:text-white/80"
                          )}
                        >
                          <span className="truncate">{playlist.name}</span>
                          <span className="ml-auto shrink-0 font-mono text-[11px] text-white/28">
                            {playlist.trackCount}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-white/8 pt-4">
        <div className="px-1">
          <p className="truncate text-sm font-medium text-white">{displayName}</p>
          <p className="truncate text-xs text-white/45">{email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/62 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="size-4 shrink-0" />
            Log out
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#08050F] text-white">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/8 bg-[#0C0917] lg:block">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-white/8 bg-[#0C0917] shadow-[0_0_60px_rgba(0,0,0,0.6)]">
            {sidebarBody}
          </div>
        </div>
      ) : null}

      {/* Content column. overflow-x-clip keeps any stray wide child from
          giving the whole PWA page a horizontal scrollbar (clip, unlike
          hidden, creates no scroll container and doesn't break sticky). */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-white/8 bg-[#0C0917] px-4 py-3 lg:hidden">
          <Link href="/dashboard">
            <EnergyCurveLogo tone="light" size="sm" kind="horizontal" />
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Menu className="size-5" />
          </button>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
