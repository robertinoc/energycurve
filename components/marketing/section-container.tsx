import { cn } from "@/lib/utils"

interface SectionContainerProps {
  id?: string
  className?: string
  children: React.ReactNode
}

export function SectionContainer({
  id,
  className,
  children,
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-36 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  )
}
