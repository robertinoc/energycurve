"use client"

import { sanitizeFirstTouch, type FirstTouch } from "@/lib/attribution/first-touch"

/**
 * The first touch, waiting in the browser for its person to have an account.
 *
 * `localStorage` and not a cookie, for the reason `lib/privacy/consent.ts`
 * gives: it never needs to ride on a request. It is sent once, on purpose, by
 * `FirstTouchReport`.
 *
 * Every function here is called only after the consent check — the callers
 * own that — and every storage access is guarded, because a private window or
 * blocked site data throws on read and the safe direction is "nothing stored".
 *
 * ## Where the long path breaks
 *
 * A touch survives days between visits in the same browser: someone who lands
 * from Instagram on Monday and signs up from a bookmark on Friday is counted as
 * Instagram. It does not survive, and the person is counted by the visit the
 * browser *does* remember, or as unknown:
 * - another browser or device — the touch is on the first one;
 * - cleared site data, a private window that was closed;
 * - Safari, which deletes script-written storage after seven days without a
 *   visit (ITP), so a gap longer than that records the later visit;
 * - accepting analytics on a later visit than the first: the first was never
 *   stored, so the touch is the visit where consent was given;
 * - two people signing up from the same browser: the touch goes to the first.
 */

export const FIRST_TOUCH_STORAGE_KEY = "ec.first-touch.v1"

/**
 * What is left once a touch was sent: a marker, so that the next public visit
 * by somebody who already has an account does not start another touch and
 * another request. Not personal data — it says only "done".
 */
const SENT_MARKER = JSON.stringify({ sent: true })

type Stored = { kind: "none" } | { kind: "sent" } | { kind: "touch"; touch: FirstTouch }

function read(now: Date): Stored {
  let raw: string | null

  try {
    raw = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY)
  } catch {
    return { kind: "none" }
  }

  if (!raw) {
    return { kind: "none" }
  }

  if (raw === SENT_MARKER) {
    return { kind: "sent" }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: "none" }
  }

  // The same check the server runs, which also drops a touch older than the
  // lookback: past it, a stored touch is replaced by the current visit.
  const touch = sanitizeFirstTouch(parsed, now)

  return touch ? { kind: "touch", touch } : { kind: "none" }
}

function write(value: string): void {
  try {
    window.localStorage.setItem(FIRST_TOUCH_STORAGE_KEY, value)
  } catch {
    // Storage refused: the touch is lost and the person will be unknown. That
    // is the right failure — the alternative would be a cookie nobody agreed to.
  }
}

/** The touch waiting to be sent, if any. */
export function readStoredFirstTouch(now: Date = new Date()): FirstTouch | null {
  const stored = read(now)

  return stored.kind === "touch" ? stored.touch : null
}

/**
 * Keeps `touch` unless a touch is already waiting or one was already sent.
 * First touch, not last: a later visit never replaces an earlier one inside
 * the lookback window.
 */
export function rememberFirstTouch(touch: FirstTouch | null, now: Date = new Date()): void {
  if (!touch) {
    return
  }

  if (read(now).kind !== "none") {
    return
  }

  write(JSON.stringify(touch))
}

/** The touch reached the server, whatever the server did with it. */
export function markFirstTouchSent(): void {
  write(SENT_MARKER)
}

/** Consent was withdrawn, or never given: nothing stays behind. */
export function forgetFirstTouch(): void {
  try {
    window.localStorage.removeItem(FIRST_TOUCH_STORAGE_KEY)
  } catch {
    // Nothing to do: a storage that cannot be read holds nothing we can reach.
  }
}
