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
  const [visible, setVisible] = useState(() => {
    if (eager) {
      return true
    }

    if (typeof window === "undefined") {
      return false
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

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
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
