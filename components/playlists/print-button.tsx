"use client"

import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Opens the browser's print dialog, which is also its "Save as PDF".
 *
 * No PDF library on purpose. `window.print()` reaches a real PDF through the OS
 * dialog, adds nothing to the bundle, needs no server round trip, and keeps the
 * sheet readable offline once the page has loaded — which matters more in a booth
 * than the file arriving pre-generated. A server-rendered PDF only earns its
 * weight when we need to attach one to an email, and nothing does yet.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => window.print()}
      // The sheet is the document; the button must not appear on the paper.
      className="print:hidden"
    >
      <Printer className="size-4" />
      {label}
    </Button>
  )
}
