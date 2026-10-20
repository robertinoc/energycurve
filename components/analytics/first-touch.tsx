"use client"

import { useEffect } from "react"

import { touchFromVisit, type FirstTouch } from "@/lib/attribution/first-touch"
import {
  forgetFirstTouch,
  markFirstTouchSent,
  readStoredFirstTouch,
  rememberFirstTouch,
} from "@/lib/attribution/first-touch-store"
import { analyticsAllowed, type ConsentState } from "@/lib/privacy/consent"
import { useConsent } from "@/lib/privacy/use-consent"

/**
 * The page load this document started from, read once.
 *
 * Module state on purpose: App Router navigations do not reload the document,
 * so the URL and referrer of the *first* load are the arrival, and every later
 * route change is somebody already here. Kept in memory only — nothing is
 * written until consent says so — which is what lets a visitor who accepts on
 * the page they landed on still be counted by that landing.
 */
let documentTouch: FirstTouch | null | undefined

function arrival(): FirstTouch | null {
  if (documentTouch === undefined) {
    documentTouch = touchFromVisit({
      href: window.location.href,
      referrer: document.referrer,
      at: new Date(),
    })
  }

  return documentTouch
}

/** Test seam. Module state outlives a test file otherwise. */
export function __resetFirstTouchForTests(): void {
  documentTouch = undefined
}

/**
 * What the capture does on each consent answer: keep the arrival on "granted",
 * remove anything stored on anything else. Exported so both branches can be
 * tested without a DOM.
 */
export function syncFirstTouchWithConsent(consent: ConsentState): void {
  if (analyticsAllowed(consent)) {
    rememberFirstTouch(arrival())
  } else {
    forgetFirstTouch()
  }
}

/**
 * Sends the waiting touch once; the server decides whether it belongs to a new
 * profile. Any answer from the server counts as delivered — a 400 is a touch
 * that will never be valid, and retrying it on every visit would be a request
 * per page for nothing. A network failure, a 401 or a 5xx keeps it for the next
 * visit.
 */
export async function reportFirstTouch(
  consent: ConsentState,
  send: typeof fetch = fetch
): Promise<"skipped" | "delivered" | "kept"> {
  if (!analyticsAllowed(consent)) {
    return "skipped"
  }

  const touch = readStoredFirstTouch()

  if (!touch) {
    return "skipped"
  }

  try {
    const response = await send("/api/attribution/first-touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(touch),
      keepalive: true,
    })

    if (response.status < 500 && response.status !== 401) {
      markFirstTouchSent()

      return "delivered"
    }
  } catch {
    // Offline or blocked: try again on the next dashboard visit.
  }

  return "kept"
}

/**
 * Mounted once in the root layout, beside the analytics tracker. Renders
 * nothing. Stores the arrival when — and only when — analytics is granted, and
 * removes anything stored the moment it is not.
 */
export function FirstTouchCapture() {
  const consent = useConsent()

  useEffect(() => {
    syncFirstTouchWithConsent(consent)
  }, [consent])

  return null
}

/**
 * Mounted on the dashboard. No cleanup that cancels the send: once the server
 * has answered, the touch is delivered whether or not this is still mounted. A
 * second send (Strict Mode runs effects twice in dev) is harmless — the server
 * keeps the first write and ignores the rest.
 */
export function FirstTouchReport() {
  const consent = useConsent()

  useEffect(() => {
    void reportFirstTouch(consent)
  }, [consent])

  return null
}
