import * as React from "react"

import { cn } from "@/lib/utils"

function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-ec-sunken px-3.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&>option]:bg-[#14101F] [&>option]:text-white",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { NativeSelect }
