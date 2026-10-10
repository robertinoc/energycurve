"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface SectionRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  /**
   * Render visible from the server, with no reveal at all — SEO-E32.
   *
   * For anything above the fold. A section that starts at `opacity: 0` is not
   * painted as far as a browser is concerned, so the whole first screen used to
   * be invisible until React attached: the HTML arrived complete in 1.2s and
   * nothing in it counted as painted until hydration finished around 5s. That is
   * a real wait for somebody on a phone, not only a number in a report.
   *
   * The animation is worth keeping for what a reader scrolls to — it fires as a
   * section enters the viewport, which is the one moment it means something. It
   * is worth nothing on the block that is already on screen when the page opens,
   * because there is no entrance to animate.
   */
  eager?: boolean
}

export function SectionReveal({
  children,
  className,
  delay = 0,
  eager = false,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  // Starts the same on the server and the client, always. It used to read
  // `prefers-reduced-motion` in this initializer, which made the first client
  // render disagree with the server's HTML: React 19 keeps the server's
  // attributes on a hydration mismatch, so the DOM stayed at `opacity-0` while
  // state said visible, and the effect below — seeing `visible` already true —
  // never set up the observer. Every section under the hero stayed invisible
  // for good, scroll or no scroll, for exactly the people who asked for less
  // motion (banco SEO4.2, 10/10/2026). The preference is now CSS's job alone
  // (`motion-reduce:opacity-100` below): no JavaScript reads it, so there is
  // nothing for the server and the client to disagree about.
  const [visible, setVisible] = useState(eager)

  useEffect(() => {
    if (visible) {
      return
    }

    const node = ref.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [visible])

  // An eager section carries no transition and no transform at all, rather than
  // a transition that happens to start finished. A `will-change`-ish repaint on
  // the first screen is exactly the work this is trying not to do, and a
  // `transitionDelay` on a element that never transitions is noise in the DOM.
  if (eager) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
