/**
 * Analytics consent, stored per browser.
 *
 * EnergyCurve loaded PostHog on first paint, with `localStorage+cookie`
 * persistence, and asked nobody. Under ePrivacy that is analytics without
 * consent, and it was finding gap 4 of the RoPA.
 *
 * Three rules shape this file:
 *
 * 1. **Opt-in, not opt-out.** `unset` means no analytics. A visitor who never
 *    answers is never tracked, which is the only reading of "consent" that is
 *    actually consent.
 * 2. **Refusing is as cheap as accepting.** One click either way, same weight.
 *    A "reject" hidden behind a settings panel is a dark pattern with a legal
 *    name.
 * 3. **Do Not Track decides on its own.** A browser sending DNT has already
 *    answered, and asking again is asking someone to repeat themselves.
 *
 * Deliberately `localStorage` and not a cookie: the choice is per browser and
 * never needs to reach the server, and a consent cookie that rides on every
 * request is the small irony this file exists to avoid.
 */

export type ConsentState = "unset" | "granted" | "denied"

/**
 * Bumping this re-asks everyone.
 *
 * It exists so that a genuine change — a new processor, a new purpose — can
 * invalidate old answers, because consent is to a specific thing and not to a
 * banner. Do not bump it for copy edits.
 */
export const CONSENT_VERSION = 1

export const CONSENT_STORAGE_KEY = `ec.analytics-consent.v${CONSENT_VERSION}`

/** Fired on the window so a listener can react without polling storage. */
export const CONSENT_CHANGE_EVENT = "ec:analytics-consent-change"

function isConsentState(value: unknown): value is ConsentState {
  return value === "granted" || value === "denied" || value === "unset"
}

/**
 * What this browser has decided.
 *
 * Returns `denied` for Do Not Track without reading storage: the signal is the
 * answer, and honouring it is not conditional on having asked.
 *
 * Every storage access is guarded. A private window, cleared site data, or a
 * browser configured to block storage all throw on read, and an exception here
 * must not take a page down — the safe direction is "no consent".
 */
export function readConsent(): ConsentState {
  if (typeof window === "undefined") {
    return "unset"
  }

  if (hasDoNotTrack()) {
    return "denied"
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)

    return isConsentState(stored) ? stored : "unset"
  } catch {
    return "unset"
  }
}

export function writeConsent(state: Exclude<ConsentState, "unset">): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, state)
  } catch {
    // A browser that refuses storage still gets the event below, so the current
    // page behaves correctly. It will simply ask again next time, which is the
    // right failure: re-asking is a nuisance, assuming yes is a violation.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: state }))
}

/** Forgets the answer, so the banner returns. Used by "change my choice". */
export function clearConsent(): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    // Same reasoning as above.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: "unset" }))
}

/**
 * True when the browser is asking not to be tracked.
 *
 * Reads all three spellings because they are all still in the wild: the
 * standard `navigator.doNotTrack`, IE's `window.doNotTrack`, and Safari's old
 * `navigator.msDoNotTrack`. "1" and "yes" both mean yes.
 */
export function hasDoNotTrack(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const candidates = [
    window.navigator.doNotTrack,
    (window as unknown as { doNotTrack?: string }).doNotTrack,
    (window.navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack,
  ]

  return candidates.some((value) => value === "1" || value === "yes")
}

/** Whether the banner should be on screen. */
export function shouldAskForConsent(state: ConsentState): boolean {
  return state === "unset" && !hasDoNotTrack()
}

/** The only question the analytics layer needs answered. */
export function analyticsAllowed(state: ConsentState): boolean {
  return state === "granted"
}

/**
 * Calls `onChange` whenever the answer changes, in this tab or another one.
 *
 * Lives here rather than in the React hook so the store owns its own
 * subscription and the hook is only the binding — which also means the
 * cross-tab behaviour is testable without rendering anything.
 *
 * Two sources, because neither covers the other: our own event fires only in
 * the tab that made the change, and `storage` fires only in the tabs that did
 * not. Withdrawing consent in one tab has to stop tracking in the rest, which
 * is what a person doing it would reasonably expect.
 */
export function subscribeToConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  function onStorage(event: StorageEvent) {
    // A null key means the whole store was cleared, which counts.
    if (event.key === null || event.key === CONSENT_STORAGE_KEY) {
      onChange()
    }
  }

  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  window.addEventListener("storage", onStorage as EventListener)

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onStorage as EventListener)
  }
}
