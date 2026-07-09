"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Minimal controlled toast — the parent owns visibility + auto-dismiss timing.
 * No provider/portal; renders a fixed, centered pill.
 */
export function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/14 bg-[#1b1526] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_18px_44px_rgba(0,0,0,0.5)] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      )}
    >
      <Check className="size-4 text-ec-cyan" />
      {message}
    </div>
  )
}
