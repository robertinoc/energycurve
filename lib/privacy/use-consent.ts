"use client"

import { useSyncExternalStore } from "react"

import {
  readConsent,
  subscribeToConsent,
  type ConsentState,
} from "@/lib/privacy/consent"

/**
 * The visitor's analytics answer, as a subscribable value.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, for reasons
 * beyond the lint rule: the value genuinely lives outside React, in
 * `localStorage`, changes from outside it, and has a subscribe mechanism. This
 * is the primitive for exactly that.
 *
 * The server snapshot is `"unset"` on purpose, so the banner is never rendered
 * into the HTML and never flashes at someone who already answered.
 *
 * Everything else is in `consent.ts`: this file is only the React binding.
 */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribeToConsent, readConsent, getServerSnapshot)
}

function getServerSnapshot(): ConsentState {
  return "unset"
}
