"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { href: "/backstage", label: "Users" },
  { href: "/backstage/analytics", label: "Analytics" },
] as const

export function BackstageNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1">
      {TABS.map((tab) => {
        const active =
          tab.href === "/backstage"
            ? pathname === "/backstage"
            : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
              active
                ? "border-ec-violet text-ec-text"
                : "border-transparent text-ec-text-dim hover:text-ec-text-muted"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
