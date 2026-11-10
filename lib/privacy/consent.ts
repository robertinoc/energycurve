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
 * 3. **Do Not Track decides on its own.** A browser sending DNT — or Global
 *    Privacy Control, honoured the same way since 10/11/2026 — has already
 *    answered, and asking again is asking someone to repeat themselves.
 *
 * The answer lives in `localStorage`, per browser. Until November 2026 it
 * never needed to reach the server, and a consent cookie riding on every
 * request was the small irony this file existed to avoid.
 *
 * Then the server started emitting conversion events of its own (the sales
 * walls and the score gain, docs/conversion-plan.md step 3.1), which is
 * exactly what the banner asks about — and those are born in page renders,
 * server actions and a redirect, where no script of ours runs first and the
 * only thing the browser sends is its cookies. So one bit now does reach the
 * server, as a mirror and not as the source of truth:
 *
 * - `ec_analytics_consent` exists **only while the answer is "granted"**.
 *   Someone who refused, never answered or sends Do Not Track carries no
 *   consent cookie at all — the irony is still avoided for them, which is
 *   everyone the banner was protecting.
 * - It is written and removed together with the stored answer, and re-synced
 *   from it whenever a page subscribes, so a stale cookie lives at most until
 *   the next page view.
 * - The server reads it in `lib/privacy/server-consent.ts`, and anything it
 *   cannot read with certainty counts as no consent.
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

/**
 * The server's copy of a "yes", and nothing else (see the header).
 *
 * The value carries the version so a bump re-asks the server too: a cookie
 * left over from the previous version no longer matches and reads as no.
 */
export const CONSENT_COOKIE_NAME = "ec_analytics_consent"
export const CONSENT_COOKIE_VALUE = `granted.v${CONSENT_VERSION}`

/** Renewed on every page that subscribes, so this is idle time, not lifetime. */
const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

/**
 * Makes the cookie say what `state` says: present for "granted", gone for
 * anything else.
 *
 * Host-only and `Path=/`, like the rest of the app's cookies; `SameSite=Lax` so
 * it reaches the top-level navigation of a sales-wall click; `Secure` wherever
 * the page is. Guarded like every storage access here: a browser that refuses
 * cookies leaves the server without a yes, which is the safe direction.
 */
export function mirrorConsentToCookie(state: ConsentState): void {
  if (typeof document === "undefined") {
    return
  }

  const secure =
    typeof window !== "undefined" && window.location?.protocol === "https:"
      ? "; Secure"
      : ""

  try {
    document.cookie =
      state === "granted"
        ? `${CONSENT_COOKIE_NAME}=${CONSENT_COOKIE_VALUE}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
        : `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  } catch {
    // Same reasoning as the storage guards below.
  }
}

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

  // What the browser now reports, not `state`: under Do Not Track a "granted"
  // that somehow got written still reads as denied, and the server must agree.
  mirrorConsentToCookie(readConsent())

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

  mirrorConsentToCookie("unset")

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: "unset" }))
}

/**
 * True when the browser is asking not to be tracked — Do Not Track or
 * Global Privacy Control, which ride the same rail here because they are the
 * same gesture. GPC is the stricter of the two: in California it is a legally
 * binding opt-out, so it also beats a "yes" stored before it was turned on
 * (readConsent checks this before looking at storage).
 *
 * Reads all three DNT spellings because they are all still in the wild: the
 * standard `navigator.doNotTrack`, IE's `window.doNotTrack`, and Safari's old
 * `navigator.msDoNotTrack`. "1" and "yes" both mean yes. GPC is the standard
 * `navigator.globalPrivacyControl`, a boolean.
 */
export function hasDoNotTrack(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  if (
    (window.navigator as unknown as { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  ) {
    return true
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

  // Every page subscribes (the banner and the tracker live in the root
  // layout), so this is where the server's copy is brought back in line: a
  // browser that said yes before the cookie existed gets it on its next page,
  // and one whose answer was cleared or turned into Do Not Track loses it.
  mirrorConsentToCookie(readConsent())

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
