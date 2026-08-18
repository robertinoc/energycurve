"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useIsClient } from "@/lib/use-is-client"

/**
 * Holds the screen awake while Gig Mode is open.
 *
 * A phone propped in a booth locks itself after thirty seconds, and unlocking it
 * mid-transition with one hand is the sort of small failure that makes a DJ close
 * the tab and never come back. The Screen Wake Lock API exists for exactly this.
 *
 * Opt-in rather than automatic: holding a wake lock drains a battery, and the DJ
 * is the one who knows whether the phone is plugged in.
 *
 * Two behaviours that are easy to get wrong:
 *
 * - **The browser revokes the lock whenever the page is hidden**, and does not
 *   restore it on return. Without re-acquiring on `visibilitychange`, switching to
 *   another app once silently ends the feature for the rest of the night.
 * - **`request()` rejects** on a low battery or a disallowed context. That's a
 *   normal outcome, not an error worth surfacing mid-set, so the toggle simply
 *   reports itself as off.
 */
export function useWakeLock() {
  // Derived rather than stored in an effect: useIsClient is false through the
  // hydration render and true after, so this branches on a browser-only API
  // without a hydration mismatch and without a setState-in-effect round trip.
  const isClient = useIsClient()
  const supported = isClient && "wakeLock" in navigator

  const [active, setActive] = useState(false)
  const sentinel = useRef<WakeLockSentinel | null>(null)
  // Mirrors the DJ's intent for the visibility listener, which must not be
  // re-registered on every state change just to read the current value.
  const wanted = useRef(false)

  const acquire = useCallback(async () => {
    try {
      const lock = await navigator.wakeLock.request("screen")
      sentinel.current = lock
      setActive(true)

      // Fires on OS-level release too, so the button never claims to be holding a
      // lock the system already took away.
      lock.addEventListener("release", () => {
        sentinel.current = null
        setActive(false)
      })
      return true
    } catch {
      setActive(false)
      return false
    }
  }, [])

  const release = useCallback(async () => {
    wanted.current = false
    try {
      await sentinel.current?.release()
    } catch {
      // Already gone is the outcome we wanted anyway.
    }
    sentinel.current = null
    setActive(false)
  }, [])

  const toggle = useCallback(async () => {
    if (sentinel.current) {
      await release()
      return
    }
    wanted.current = true
    const ok = await acquire()
    if (!ok) {
      wanted.current = false
    }
  }, [acquire, release])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && wanted.current && !sentinel.current) {
        void acquire()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      void sentinel.current?.release().catch(() => {})
      sentinel.current = null
    }
  }, [acquire])

  return { supported, active, toggle }
}
