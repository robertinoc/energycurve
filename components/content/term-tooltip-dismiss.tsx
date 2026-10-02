"use client"

import { useEffect } from "react"

/** The attribute that hides an open term tooltip until the term is re-entered. */
export const TERM_DISMISSED_ATTRIBUTE = "data-dismissed"

/**
 * Lets Escape close a glossary term's tooltip, without moving focus (H-19).
 *
 * The tooltip itself stays pure CSS — shown on `:hover` and `:focus-within` —
 * and that is still the right design: the definition is in the server's HTML,
 * there is no per-term state, and nothing about it can go wrong before
 * hydration. What CSS cannot do is the one thing WCAG 2.1 · 1.4.13 asks of
 * content that appears on hover or focus: that it be *dismissible without
 * moving the pointer or the focus*. The tip is drawn over the line above the
 * term, so it covers text, and "tab away to hide it" moves the focus — which is
 * the exact thing the criterion says the reader must not be made to do.
 *
 * So this is one listener for the whole page rather than one per term. Escape
 * marks every term that is currently open (hovered or holding focus) as
 * dismissed, and CSS hides a dismissed term's tip. Entering a term again — a new
 * focus, or the pointer arriving from outside it — clears the mark, so the
 * definition comes back the next time somebody asks for it.
 *
 * Mounted once, in the shared `<body>` shell, so every page that renders a
 * `Termino` gets it without having to remember to.
 */
export function TermTooltipDismiss() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return
      }

      document
        .querySelectorAll<HTMLElement>(".ec-term:hover, .ec-term:focus-within")
        .forEach((term) => term.setAttribute(TERM_DISMISSED_ATTRIBUTE, ""))
    }

    function onFocusIn(event: FocusEvent) {
      rearm(event.target)
    }

    function onMouseOver(event: MouseEvent) {
      const term = closestTerm(event.target)

      // `mouseover` bubbles up from every child while the pointer moves inside
      // the term. Only an arrival from *outside* it is a new request for the
      // definition; re-arming on every move would undo the dismissal at once.
      if (term && !term.contains(event.relatedTarget as Node | null)) {
        term.removeAttribute(TERM_DISMISSED_ATTRIBUTE)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("mouseover", onMouseOver)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("mouseover", onMouseOver)
    }
  }, [])

  return null
}

function closestTerm(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(".ec-term") : null
}

function rearm(target: EventTarget | null): void {
  closestTerm(target)?.removeAttribute(TERM_DISMISSED_ATTRIBUTE)
}
