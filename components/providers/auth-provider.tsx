"use client"

import type { ReactNode } from "react"
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components"

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthKitProvider>{children}</AuthKitProvider>
}
