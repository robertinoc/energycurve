"use client"

import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/**
 * False during SSR and the hydration render, true right after. Lets a
 * component branch on browser-only state (localStorage, display-mode media
 * queries) without causing a hydration mismatch and without setState-in-effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
