import { cn } from "@/app/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  onClick?: () => void
  hover?: boolean
  padding?: "none" | "sm" | "md" | "lg"
}

export function Card({ children, className, glass, onClick, hover, padding = "md" }: CardProps) {
  const pads = { none: "", sm: "p-4", md: "p-6", lg: "p-8" }
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border transition-all duration-200",
        glass
          ? "bg-white/70 dark:bg-white/5 backdrop-blur-md border-white/30 dark:border-white/10"
          : "bg-white dark:bg-[#1f1f1f] border-gray-100 dark:border-gray-800",
        hover && "hover:shadow-md hover:-translate-y-0.5",
        (onClick || hover) && "cursor-pointer",
        pads[padding],
        className
      )}
    >
      {children}
    </div>
  )
}
